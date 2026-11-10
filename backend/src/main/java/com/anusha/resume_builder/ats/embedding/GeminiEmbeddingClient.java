package com.anusha.resume_builder.ats.embedding;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Gemini embeddings over REST ({@code models/{model}:batchEmbedContents}), authenticated with the same
 * {@code x-goog-api-key} header the rest of the application uses.
 *
 * Vectors are truncated/re-normalized to the configured dimensionality, so the result is correct even if the
 * API returns more dimensions than requested. Results are cached in memory by (task, text) so re-running an
 * analysis only embeds text that actually changed.
 */
public class GeminiEmbeddingClient implements EmbeddingClient {

    private static final Logger log = LoggerFactory.getLogger(GeminiEmbeddingClient.class);

    private static final int BATCH_SIZE = 50;
    private static final int MAX_ATTEMPTS = 3;
    private static final int MAX_CHARS = 6000;
    private static final int CACHE_SIZE = 4000;

    private final String apiKey;
    private final String model;
    private final int dimensions;
    private final ObjectMapper mapper = new ObjectMapper();
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(20)).build();

    private final Map<String, float[]> cache = new LinkedHashMap<>(256, 0.75f, true) {
        @Override
        protected boolean removeEldestEntry(Map.Entry<String, float[]> eldest) {
            return size() > CACHE_SIZE;
        }
    };

    public GeminiEmbeddingClient(String apiKey, String model, int dimensions) {
        this.apiKey = cleanKey(apiKey);
        this.model = model;
        this.dimensions = dimensions;
    }

    @Override
    public boolean isAvailable() {
        return !apiKey.isBlank();
    }

    @Override
    public String modelName() {
        return model;
    }

    @Override
    public int dimensions() {
        return dimensions;
    }

    @Override
    public List<float[]> embed(List<String> texts, Task task) throws IOException {
        if (!isAvailable()) {
            throw new IOException("Gemini API key is not configured (gemini.api.key).");
        }

        float[][] result = new float[texts.size()][];
        List<Integer> missing = new ArrayList<>();

        synchronized (cache) {
            for (int i = 0; i < texts.size(); i++) {
                float[] hit = cache.get(cacheKey(texts.get(i), task));
                if (hit != null) {
                    result[i] = hit;
                } else {
                    missing.add(i);
                }
            }
        }

        for (int start = 0; start < missing.size(); start += BATCH_SIZE) {
            List<Integer> slice = missing.subList(start, Math.min(start + BATCH_SIZE, missing.size()));
            List<String> batch = new ArrayList<>(slice.size());
            for (int idx : slice) {
                batch.add(clip(texts.get(idx)));
            }

            List<float[]> vectors = callApi(batch, task);

            synchronized (cache) {
                for (int j = 0; j < slice.size(); j++) {
                    int idx = slice.get(j);
                    result[idx] = vectors.get(j);
                    cache.put(cacheKey(texts.get(idx), task), vectors.get(j));
                }
            }
        }

        List<float[]> out = new ArrayList<>(texts.size());
        for (float[] v : result) {
            out.add(v);
        }
        return out;
    }

    private List<float[]> callApi(List<String> batch, Task task) throws IOException {
        ObjectNode body = mapper.createObjectNode();
        ArrayNode requests = body.putArray("requests");

        for (String text : batch) {
            ObjectNode req = requests.addObject();
            req.put("model", "models/" + model);
            req.putObject("content").putArray("parts").addObject().put("text", text);
            req.put("taskType", task == Task.QUERY ? "RETRIEVAL_QUERY" : "RETRIEVAL_DOCUMENT");
            req.put("outputDimensionality", dimensions);
        }

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":batchEmbedContents"))
                .header("Content-Type", "application/json")
                .header("x-goog-api-key", apiKey)
                .timeout(Duration.ofSeconds(45))
                .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body), StandardCharsets.UTF_8))
                .build();

        HttpResponse<String> response = send(request);

        if (response.statusCode() != 200) {
            throw new IOException("Gemini embeddings HTTP " + response.statusCode() + ": " + abbreviate(response.body()));
        }

        JsonNode embeddings = mapper.readTree(response.body()).path("embeddings");
        if (!embeddings.isArray() || embeddings.size() != batch.size()) {
            throw new IOException("Gemini embeddings response did not match the request size.");
        }

        List<float[]> vectors = new ArrayList<>(batch.size());
        for (JsonNode e : embeddings) {
            JsonNode values = e.path("values");
            float[] v = new float[values.size()];
            for (int i = 0; i < v.length; i++) {
                v[i] = (float) values.get(i).asDouble();
            }
            vectors.add(VectorMath.fit(v, dimensions));
        }
        return vectors;
    }

    private HttpResponse<String> send(HttpRequest request) throws IOException {
        for (int attempt = 1; ; attempt++) {
            try {
                HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
                int status = response.statusCode();
                boolean retryable = status == 429 || status == 500 || status == 502 || status == 503 || status == 504;

                if (!retryable || attempt >= MAX_ATTEMPTS) {
                    return response;
                }

                log.warn("Gemini embeddings returned {}; retrying (attempt {}/{})", status, attempt, MAX_ATTEMPTS);
                Thread.sleep(700L * attempt);
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
                throw new IOException("Embedding request interrupted.", ex);
            }
        }
    }

    private static String clip(String text) {
        String t = text == null ? "" : text.strip();
        if (t.isEmpty()) {
            t = " ";
        }
        return t.length() > MAX_CHARS ? t.substring(0, MAX_CHARS) : t;
    }

    private String cacheKey(String text, Task task) {
        return task.name() + ":" + model + ":" + dimensions + ":" + sha256(clip(text));
    }

    public static String sha256(String text) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(text.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    /** Mirrors the key clean-up in ResumeParserService so the same .env value works for both. */
    private static String cleanKey(String raw) {
        if (raw == null) {
            return "";
        }
        String key = raw.trim().replaceAll("[\\[\\]()\"'\\s]", "");
        if (key.contains("key=")) {
            key = key.substring(key.lastIndexOf("key=") + 4);
        }
        return key;
    }

    private static String abbreviate(String s) {
        if (s == null) {
            return "";
        }
        return s.length() > 300 ? s.substring(0, 300) + "..." : s;
    }
}