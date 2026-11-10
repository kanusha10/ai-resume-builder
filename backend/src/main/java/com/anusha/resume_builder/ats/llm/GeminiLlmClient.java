package com.anusha.resume_builder.ats.llm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;

/**
 * Calls Gemini {@code generateContent} in JSON mode, trying each configured model in order and retrying
 * transient failures. Uses the same endpoint, header and model-fallback approach as ResumeParserService.
 */
public class GeminiLlmClient implements LlmClient {

    private static final Logger log = LoggerFactory.getLogger(GeminiLlmClient.class);
    private static final int MAX_ATTEMPTS = 2;

    private final String apiKey;
    private final List<String> models;
    private final ObjectMapper mapper = new ObjectMapper();
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(20)).build();

    public GeminiLlmClient(String apiKey, List<String> models) {
        this.apiKey = cleanKey(apiKey);
        this.models = models;
    }

    @Override
    public boolean isAvailable() {
        return !apiKey.isBlank() && !models.isEmpty();
    }

    @Override
    public JsonNode generateJson(String systemInstruction, String prompt) throws IOException {
        if (!isAvailable()) {
            throw new IOException("Gemini API key is not configured (gemini.api.key).");
        }

        IOException last = null;

        for (String model : models) {
            try {
                return callModel(model, systemInstruction, prompt);
            } catch (IOException ex) {
                last = ex;
                log.warn("ATS LLM model [{}] failed: {}", model, ex.getMessage());
            }
        }

        throw last != null ? last : new IOException("No Gemini model configured.");
    }

    private JsonNode callModel(String model, String system, String prompt) throws IOException {
        ObjectNode body = mapper.createObjectNode();

        if (system != null && !system.isBlank()) {
            body.putObject("systemInstruction").putArray("parts").addObject().put("text", system);
        }

        body.putArray("contents").addObject().putArray("parts").addObject().put("text", prompt);

        ObjectNode config = body.putObject("generationConfig");
        config.put("responseMimeType", "application/json");
        config.put("temperature", 0.2);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent"))
                .header("Content-Type", "application/json")
                .header("x-goog-api-key", apiKey)
                .timeout(Duration.ofSeconds(60))
                .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body), StandardCharsets.UTF_8))
                .build();

        HttpResponse<String> response = send(request);

        if (response.statusCode() != 200) {
            throw new IOException("Gemini HTTP " + response.statusCode());
        }

        return parseModelJson(mapper.readTree(response.body()));
    }

    /** Extracts candidates[0].content.parts[*].text and parses it as JSON, tolerating code fences. */
    static JsonNode parseModelJson(JsonNode root) throws IOException {
        StringBuilder text = new StringBuilder();

        for (JsonNode part : root.path("candidates").path(0).path("content").path("parts")) {
            if (part.hasNonNull("text")) {
                text.append(part.get("text").asText());
            }
        }

        String raw = text.toString().strip();
        if (raw.isEmpty()) {
            throw new IOException("Gemini returned no text.");
        }

        raw = raw.replaceFirst("^```(?:json)?\\s*", "").replaceFirst("\\s*```$", "").strip();

        ObjectMapper m = new ObjectMapper();
        try {
            return m.readTree(raw);
        } catch (Exception first) {
            int a = raw.indexOf('{');
            int b = raw.lastIndexOf('}');
            if (a >= 0 && b > a) {
                try {
                    return m.readTree(raw.substring(a, b + 1));
                } catch (Exception ignored) {
                    // fall through
                }
            }
            throw new IOException("Gemini returned invalid JSON.", first);
        }
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

                Thread.sleep(900L * attempt);
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
                throw new IOException("Gemini request interrupted.", ex);
            }
        }
    }

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
}