package com.anusha.resume_builder.ats.controller;

import com.anusha.resume_builder.ats.dto.AtsAnalysisResponse;
import com.anusha.resume_builder.ats.dto.AtsAnalyzeRequest;
import com.anusha.resume_builder.ats.dto.SavedAtsAnalysis;
import com.anusha.resume_builder.ats.embedding.EmbeddingClient;
import com.anusha.resume_builder.ats.llm.LlmClient;
import com.anusha.resume_builder.ats.service.AtsAnalysisService;
import com.anusha.resume_builder.ats.service.AtsHistoryService;
import com.anusha.resume_builder.ats.service.AtsRateLimiter;
import com.anusha.resume_builder.ats.service.KnowledgeBaseIndexer;
import com.anusha.resume_builder.ats.vector.VectorStore;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/ats")
public class AtsController {

    private static final Logger log = LoggerFactory.getLogger(AtsController.class);
    private static final int MAX_DESCRIPTION_CHARS = 20_000;
    private static final int MAX_TITLE_CHARS = 150;
    private static final int MAX_RESUME_JSON_CHARS = 300_000;

    private final AtsAnalysisService service;
    private final AtsRateLimiter rateLimiter;
    private final AtsHistoryService history;
    private final KnowledgeBaseIndexer indexer;
    private final EmbeddingClient embedder;
    private final LlmClient llm;
    private final VectorStore store;
    private final ObjectMapper mapper = new ObjectMapper();

    public AtsController(AtsAnalysisService service, AtsRateLimiter rateLimiter, AtsHistoryService history,
                         KnowledgeBaseIndexer indexer, EmbeddingClient embedder, LlmClient llm, VectorStore store) {
        this.service = service;
        this.rateLimiter = rateLimiter;
        this.history = history;
        this.indexer = indexer;
        this.embedder = embedder;
        this.llm = llm;
        this.store = store;
    }

    @PostMapping("/analyze")
    public ResponseEntity<?> analyze(@RequestBody AtsAnalyzeRequest request, Authentication authentication) {
        if (request == null || request.resume() == null || request.resume().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "A resume is required."));
        }
        if (request.jobDescription() != null && request.jobDescription().length() > MAX_DESCRIPTION_CHARS) {
            return ResponseEntity.badRequest().body(Map.of("message",
                    "The job description is too long (limit " + MAX_DESCRIPTION_CHARS + " characters)."));
        }
        if (request.jobTitle() != null && request.jobTitle().length() > MAX_TITLE_CHARS) {
            return ResponseEntity.badRequest().body(Map.of("message", "The job title is too long."));
        }

        try {
            if (mapper.writeValueAsString(request.resume()).length() > MAX_RESUME_JSON_CHARS) {
                return ResponseEntity.badRequest().body(Map.of("message", "The resume is too large to analyze."));
            }
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("message", "The resume could not be read."));
        }

        String user = authentication == null ? "anonymous" : authentication.getName();
        long wait = rateLimiter.tryAcquire(user);
        if (wait > 0) {
            return ResponseEntity.status(429)
                    .header(HttpHeaders.RETRY_AFTER, String.valueOf(wait))
                    .body(Map.of("message", "You have run several analyses recently. Please try again in " + wait + " seconds."));
        }

        try {
            AtsAnalysisResponse result = service.analyze(request);

            if (request.resumeId() != null) {
                try {
                    history.save(authentication, request, result);
                } catch (Exception ex) {
                    log.warn("Could not store the ATS analysis for resume {}: {}", request.resumeId(), ex.getMessage());
                }
            }

            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        } catch (Exception ex) {
            log.error("ATS analysis failed", ex);
            return ResponseEntity.status(500).body(Map.of("message",
                    "The ATS analysis could not be completed. Please try again."));
        }
    }

    @GetMapping("/resumes/{resumeId}/latest")
    public ResponseEntity<?> latest(@PathVariable Long resumeId, Authentication authentication) {
        Optional<SavedAtsAnalysis> saved = history.latest(authentication, resumeId);
        if (saved.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(saved.get());
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status() {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("semanticSearchReady", indexer.isReady());
        out.put("vectorStore", store.name());
        out.put("embeddingModel", embedder.modelName());
        out.put("embeddingConfigured", embedder.isAvailable());
        out.put("llmConfigured", llm.isAvailable());
        out.put("indexedRoles", indexer.roleCount());
        out.put("indexedGuidelines", indexer.guideCount());
        if (!indexer.isReady() && !indexer.lastError().isBlank()) {
            out.put("lastIndexError", indexer.lastError());
        }
        return ResponseEntity.ok(out);
    }
}