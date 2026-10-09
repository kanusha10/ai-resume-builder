
package com.anusha.resume_builder.resume.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ResumeParserService {

    private static final Logger log =
            LoggerFactory.getLogger(ResumeParserService.class);

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(30))
            .build();

    private static final List<String> MODELS = List.of(
            "gemini-3.7-flash",
            "gemini-3.6-flash",
            "gemini-3.5-flash-lite",
            "gemini-3.5-flash"
    );

    private static final int MAX_ATTEMPTS = 3;

    public Map<String, Object> parseResumeFile(MultipartFile file)
            throws IOException {

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException(
                    "Uploaded file cannot be empty."
            );
        }

        String fileName = file.getOriginalFilename() != null
                ? file.getOriginalFilename().toLowerCase()
                : "";

        String extractedText;

        if (fileName.endsWith(".pdf")) {
            try (PDDocument document = Loader.loadPDF(file.getBytes())) {
                PDFTextStripper stripper = new PDFTextStripper();
                stripper.setSortByPosition(true);
                extractedText = stripper.getText(document);
            }
        } else {
            // Preserves the existing behavior for non-PDF uploads.
            extractedText = new String(
                    file.getBytes(),
                    StandardCharsets.UTF_8
            );
        }

        if (extractedText == null || extractedText.trim().isEmpty()) {
            throw new IllegalArgumentException(
                    "No text could be extracted from this document."
            );
        }

        String prompt = """
                You are a resume parser. Extract information from the
                supplied resume into valid JSON using this schema:

                {
                  "name": "",
                  "role": "",
                  "fullName": "",
                  "email": "",
                  "phone": "",
                  "location": "",
                  "linkedin": "",
                  "github": "",
                  "website": "",
                  "summary": "",
                  "education": [
                    {
                      "institution": "",
                      "degree": "",
                      "field": "",
                      "startDate": "",
                      "endDate": "",
                      "grade": ""
                    }
                  ],
                  "internships": [
                    {
                      "role": "",
                      "company": "",
                      "location": "",
                      "startDate": "",
                      "endDate": "",
                      "description": ""
                    }
                  ],
                  "experience": [
                    {
                      "role": "",
                      "company": "",
                      "location": "",
                      "startDate": "",
                      "endDate": "",
                      "description": ""
                    }
                  ],
                  "projects": [
                    {
                      "name": "",
                      "technologies": "",
                      "link": "",
                      "description": ""
                    }
                  ],
                  "skills": {},
                  "certifications": [
                    {
                      "name": "",
                      "issuer": "",
                      "date": ""
                    }
                  ],
                  "achievements": [
                    {
                      "title": "",
                      "issuer": "",
                      "description": ""
                    }
                  ],
                  "involvement": [
                    {
                      "role": "",
                      "organization": "",
                      "year": "",
                      "description": ""
                    }
                  ],
                  "languages": [
                    {
                      "name": "",
                      "proficiency": ""
                    }
                  ]
                }

                Rules:
                - Return valid JSON only, without Markdown fences.
                - Do not invent facts, qualifications, skills, metrics,
                  links, or dates.
                - Use empty strings for missing scalar values.
                - Use empty arrays for missing list sections.
                - Preserve the candidate's actual information.
                - Put only actual URLs in linkedin, github, website,
                  and project link fields. Do not return labels such
                  as "LinkedIn" or "GitHub" as URLs.
                - SKILLS ARE ESPECIALLY IMPORTANT:
                  Preserve the original skill category names exactly
                  as they appear in the resume.
                - The skills field must be a JSON object whose keys are
                  the original category names and whose values are
                  arrays of skill names.
                - Examples of possible category names include "AI Agents",
                  "Soft Skills", "Programming Languages", "Frameworks",
                  "Frontend", "Backend", "Database", and "Tools".
                  These are examples only, not required categories.
                - Do not force skills into predefined categories.
                - Do not rename, merge, remove, or standardize the
                  candidate's original skill categories.
                - Do not move skills from one original category to another.
                - Preserve the spelling and wording of category names
                  as closely as possible to the source.
                - Preserve the skills under their corresponding original
                  categories, including categories not listed in the
                  examples above.
                - If the resume has no category labels, group the skills
                  only when necessary, using reasonable category names.
                - If there are no skills, return an empty object for skills.
                - Keep the professional summary as one cohesive paragraph.
                - For internships, experience, and projects, format
                  each description as separate bullet points in one string.
                - Start each description bullet with the character "• ".
                - Separate description bullets with newline characters.
                - In JSON strings, represent line breaks using the
                  escaped sequence \\n so that the JSON remains valid.
                - Keep each bullet concise and faithful to the resume.
                - Use separate bullets only for distinct responsibilities,
                  contributions, or facts supported by the source.
                - If there is only one meaningful description point,
                  return one bullet. Do not invent extra points.
                - Do not add bullet characters to the summary, education,
                  skills, certifications, or other fields that are not
                  descriptions for internships, experience, or projects.
                - Preserve the original meaning and relevant technical details.

                Resume text:
                """ + extractedText;

        String cleanApiKey = getCleanKey();

        if (!cleanApiKey.isEmpty()) {
            for (String modelName : MODELS) {
                try {
                    String rawJson = callGeminiRawJson(
                            modelName,
                            prompt,
                            cleanApiKey
                    );

                    Map<String, Object> result = objectMapper.readValue(
                            rawJson,
                            new TypeReference<Map<String, Object>>() {}
                    );

                    if (result == null || result.isEmpty()) {
                        throw new IOException(
                                "Gemini returned an empty JSON object."
                        );
                    }

                    // Ensure the skills field remains a dynamic object.
                    // Do not add or force predefined skill categories.
                    Object skillsObject = result.get("skills");

                    if (!(skillsObject instanceof Map<?, ?>)) {
                        result.put("skills", new LinkedHashMap<String, Object>());
                    }

                    log.info(
                            "Resume parsed successfully using [{}]",
                            modelName
                    );

                    return result;

                } catch (InterruptedException ex) {
                    Thread.currentThread().interrupt();
                    throw new IOException(
                            "Gemini request was interrupted.", ex
                    );
                } catch (Exception ex) {
                    log.warn(
                            "Gemini model [{}] failed: {}",
                            modelName,
                            ex.getMessage()
                    );
                }
            }
        } else {
            log.warn(
                    "Gemini API key is missing. Check gemini.api.key."
            );
        }

        log.warn(
                "All Gemini parsing attempts failed. "
                        + "Using local extraction fallback."
        );

        return localExtractionFallback(extractedText, fileName);
    }

    public Map<String, String> enhanceText(
            String type,
            String currentText,
            String jobRole,
            String context
    ) {

        if (currentText == null || currentText.trim().isEmpty()) {
            return Map.of("enhancedText", "");
        }

        String safeRole =
                jobRole != null && !jobRole.trim().isEmpty()
                        ? jobRole.trim()
                        : "Software Engineer";

        String prompt;

        if ("summary".equalsIgnoreCase(type)) {
            prompt = "Rewrite this professional summary for a "
                    + safeRole
                    + " into one cohesive paragraph of 2-4 sentences. "
                    + "Preserve factual details. Output only the text.\n"
                    + "Draft: " + currentText.trim();
        } else {
            prompt = "Improve these resume bullet points for a "
                    + safeRole
                    + ". Context: "
                    + (context != null ? context : "")
                    + ". Return 2-3 concise bullet points, each on "
                    + "a separate line beginning with '• '. "
                    + "Preserve the original facts and do not invent "
                    + "metrics or achievements. Output only the bullet "
                    + "points, without a paragraph or Markdown fences.\n"
                    + "Draft: " + currentText.trim();
        }

        String cleanApiKey = getCleanKey();

        if (!cleanApiKey.isEmpty()) {
            for (String modelName : MODELS) {
                try {
                    String enhanced = callGeminiText(
                            modelName,
                            prompt,
                            cleanApiKey
                    );

                    return Map.of("enhancedText", enhanced.trim());

                } catch (InterruptedException ex) {
                    Thread.currentThread().interrupt();
                    log.warn("Gemini enhancement request interrupted.");
                    break;
                } catch (Exception ex) {
                    log.warn(
                            "Gemini enhancement failed for [{}]: {}",
                            modelName,
                            ex.getMessage()
                    );
                }
            }
        }

        return Map.of("enhancedText", currentText);
    }

    private String callGeminiRawJson(
            String model,
            String prompt,
            String apiKey
    ) throws IOException, InterruptedException {

        URI uri = createGeminiUri(model);

        Map<String, Object> body = Map.of(
                "contents", List.of(
                        Map.of(
                                "parts", List.of(
                                        Map.of("text", prompt)
                                )
                        )
                ),
                "generationConfig", Map.of(
                        "responseMimeType", "application/json"
                )
        );

        String payload = objectMapper.writeValueAsString(body);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(uri)
                .header("Content-Type", "application/json")
                .header("x-goog-api-key", apiKey)
                .timeout(Duration.ofSeconds(60))
                .POST(HttpRequest.BodyPublishers.ofString(payload))
                .build();

        HttpResponse<String> response = sendGeminiRequest(request);

        if (response.statusCode() != 200) {
            throw new IOException(
                    "Gemini API HTTP " + response.statusCode()
                            + ": " + response.body()
            );
        }

        return extractGeminiText(response.body());
    }

    private String callGeminiText(
            String model,
            String prompt,
            String apiKey
    ) throws IOException, InterruptedException {

        URI uri = createGeminiUri(model);

        Map<String, Object> body = Map.of(
                "contents", List.of(
                        Map.of(
                                "parts", List.of(
                                        Map.of("text", prompt)
                                )
                        )
                )
        );

        String payload = objectMapper.writeValueAsString(body);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(uri)
                .header("Content-Type", "application/json")
                .header("x-goog-api-key", apiKey)
                .timeout(Duration.ofSeconds(30))
                .POST(HttpRequest.BodyPublishers.ofString(payload))
                .build();

        HttpResponse<String> response = sendGeminiRequest(request);

        if (response.statusCode() != 200) {
            throw new IOException(
                    "Gemini API HTTP " + response.statusCode()
                            + ": " + response.body()
            );
        }

        return extractGeminiText(response.body());
    }

    private URI createGeminiUri(String model) {
        return URI.create(
                "https://generativelanguage.googleapis.com/v1beta/models/"
                        + model + ":generateContent"
        );
    }

    private HttpResponse<String> sendGeminiRequest(
            HttpRequest request
    ) throws IOException, InterruptedException {

        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {

            HttpResponse<String> response = httpClient.send(
                    request,
                    HttpResponse.BodyHandlers.ofString()
            );

            int status = response.statusCode();

            boolean retryable =
                    status == 429
                            || status == 500
                            || status == 502
                            || status == 503
                            || status == 504;

            if (!retryable || attempt == MAX_ATTEMPTS) {
                return response;
            }

            long delayMillis = 1000L * (1L << (attempt - 1));

            log.warn(
                    "Gemini returned HTTP {}. Retry {}/{} after {} ms.",
                    status,
                    attempt,
                    MAX_ATTEMPTS,
                    delayMillis
            );

            Thread.sleep(delayMillis);
        }

        throw new IOException("Gemini request failed after retries.");
    }

    private String extractGeminiText(String responseBody)
            throws IOException {

        Map<String, Object> response = objectMapper.readValue(
                responseBody,
                new TypeReference<Map<String, Object>>() {}
        );

        Object candidatesObject = response.get("candidates");

        if (!(candidatesObject instanceof List<?> candidates)
                || candidates.isEmpty()) {
            throw new IOException(
                    "Gemini returned no candidates: " + responseBody
            );
        }

        Object candidateObject = candidates.get(0);

        if (!(candidateObject instanceof Map<?, ?> candidate)) {
            throw new IOException("Invalid Gemini candidate response.");
        }

        Object contentObject = candidate.get("content");

        if (!(contentObject instanceof Map<?, ?> content)) {
            throw new IOException(
                    "Gemini response contains no content."
            );
        }

        Object partsObject = content.get("parts");

        if (!(partsObject instanceof List<?> parts)
                || parts.isEmpty()) {
            throw new IOException(
                    "Gemini response contains no text parts."
            );
        }

        for (Object partObject : parts) {
            if (partObject instanceof Map<?, ?> part
                    && part.get("text") instanceof String text
                    && !text.isBlank()) {
                return text;
            }
        }

        throw new IOException("Gemini returned no usable text.");
    }

    private String getCleanKey() {
        if (geminiApiKey == null) {
            return "";
        }

        // Remove accidental surrounding whitespace and pasted brackets.
        String key = geminiApiKey.trim()
                .replaceAll("[\\[\\]()\"'\\s]", "");

        if (key.contains("key=")) {
            key = key.substring(key.lastIndexOf("key=") + 4);
        }

        return key;
    }

    private Map<String, Object> localExtractionFallback(
            String text,
            String fileName
    ) {

        Map<String, Object> map = new HashMap<>();

        String cleanTitle = fileName
                .replaceFirst("(?i)\\.(pdf|docx|txt)$", "")
                .replace("-", " ")
                .replace("_", " ")
                .trim();

        map.put(
                "name",
                cleanTitle.isEmpty() ? "Imported Resume" : cleanTitle
        );
        map.put("role", "Software Engineer");

        String[] lines = text.split("\\r?\\n");
        String firstLine = "";

        for (String line : lines) {
            String trimmed = line.trim();

            if (!trimmed.isEmpty()
                    && trimmed.length() < 35
                    && !trimmed.contains("@")) {
                firstLine = trimmed;
                break;
            }
        }

        map.put(
                "fullName",
                firstLine.isEmpty() ? "Candidate Name" : firstLine
        );

        map.put("email", "");
        map.put("phone", "");
        map.put("location", "");
        map.put("linkedin", "");
        map.put("github", "");
        map.put("website", "");
        map.put("summary", "");

        map.put("education", new ArrayList<>());
        map.put("internships", new ArrayList<>());
        map.put("experience", new ArrayList<>());
        map.put("projects", new ArrayList<>());

        // Extract labeled skill categories when possible.
        // Keep the original category names; never add fixed categories.
        map.put("skills", extractSkillCategories(text));

        map.put("certifications", new ArrayList<>());
        map.put("achievements", new ArrayList<>());
        map.put("involvement", new ArrayList<>());
        map.put("languages", new ArrayList<>());

        return map;
    }

    private Map<String, Object> extractSkillCategories(String text) {

        Map<String, Object> skills = new LinkedHashMap<>();

        if (text == null || text.isBlank()) {
            return skills;
        }

        String[] lines = text.split("\\r?\\n");
        boolean insideSkillsSection = false;

        Pattern categoryPattern = Pattern.compile(
                "^\\s*([^:]{2,60}?)\\s*:\\s*(.+?)\\s*$"
        );

        for (String line : lines) {
            String trimmed = line.trim();

            if (trimmed.isEmpty()) {
                continue;
            }

            String normalizedHeading = trimmed
                    .replaceAll("[:\\-–]+$", "")
                    .trim()
                    .toLowerCase();

            if (isSkillsHeading(normalizedHeading)) {
                insideSkillsSection = true;
                continue;
            }

            if (insideSkillsSection && isAnotherSectionHeading(normalizedHeading)) {
                insideSkillsSection = false;
                continue;
            }

            if (!insideSkillsSection) {
                continue;
            }

            Matcher matcher = categoryPattern.matcher(trimmed);

            if (!matcher.matches()) {
                continue;
            }

            String category = matcher.group(1).trim();
            String skillText = matcher.group(2).trim();

            if (category.isEmpty() || skillText.isEmpty()) {
                continue;
            }

            List<String> categorySkills = splitSkills(skillText);

            if (!categorySkills.isEmpty()) {
                @SuppressWarnings("unchecked")
                List<String> existingSkills =
                        (List<String>) skills.computeIfAbsent(
                                category,
                                ignored -> new ArrayList<String>()
                        );

                for (String skill : categorySkills) {
                    if (!existingSkills.contains(skill)) {
                        existingSkills.add(skill);
                    }
                }
            }
        }

        return skills;
    }

    private boolean isSkillsHeading(String heading) {
        return heading.matches(
                "(skills|technical skills|professional skills|"
                        + "key skills|core skills|core competencies|"
                        + "technical competencies|skills and technologies|"
                        + "skills & technologies|technologies|"
                        + "technical expertise)"
        );
    }

    private boolean isAnotherSectionHeading(String heading) {
        return heading.matches(
                "(education|academic background|experience|work experience|"
                        + "professional experience|internships|projects|"
                        + "certifications|achievements|awards|"
                        + "languages|publications|volunteering|"
                        + "leadership|professional summary|summary|"
                        + "profile|objective|contact|interests|"
                        + "extracurricular activities)"
        );
    }

    private List<String> splitSkills(String skillText) {
        List<String> skills = new ArrayList<>();

        for (String item : skillText.split("[,;|•▪]+")) {
            String skill = item.trim()
                    .replaceFirst("^[\\-–]+\\s*", "")
                    .trim();

            if (!skill.isEmpty() && !skills.contains(skill)) {
                skills.add(skill);
            }
        }

        return skills;
    }
}
