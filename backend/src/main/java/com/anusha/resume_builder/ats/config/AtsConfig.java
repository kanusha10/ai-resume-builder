package com.anusha.resume_builder.ats.config;

import com.anusha.resume_builder.ats.embedding.EmbeddingClient;
import com.anusha.resume_builder.ats.embedding.GeminiEmbeddingClient;
import com.anusha.resume_builder.ats.kb.KnowledgeBase;
import com.anusha.resume_builder.ats.llm.GeminiLlmClient;
import com.anusha.resume_builder.ats.llm.LlmClient;
import com.anusha.resume_builder.ats.service.AtsAnalysisService;
import com.anusha.resume_builder.ats.service.AtsRateLimiter;
import com.anusha.resume_builder.ats.service.KnowledgeBaseIndexer;
import com.anusha.resume_builder.ats.vector.InMemoryVectorStore;
import com.anusha.resume_builder.ats.vector.PgVectorStore;
import com.anusha.resume_builder.ats.vector.VectorStore;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;
import java.io.IOException;
import java.time.Duration;
import java.util.Arrays;
import java.util.List;

@Configuration
public class AtsConfig {

    private static final Logger log = LoggerFactory.getLogger(AtsConfig.class);

    @Bean
    public KnowledgeBase atsKnowledgeBase() throws IOException {
        return KnowledgeBase.loadFromClasspath();
    }

    @Bean
    public EmbeddingClient atsEmbeddingClient(
            @Value("${gemini.api.key:}") String apiKey,
            @Value("${ats.embedding.model:gemini-embedding-001}") String model,
            @Value("${ats.embedding.dimensions:768}") int dimensions) {
        return new GeminiEmbeddingClient(apiKey, model, dimensions);
    }

    @Bean
    public LlmClient atsLlmClient(
            @Value("${gemini.api.key:}") String apiKey,
            @Value("${ats.llm.models:gemini-3.8-flash,gemini-3.7-flash,gemini-3.6-flash,gemini-3.5-flash-lite,gemini-3.5-flash}") String models) {
        List<String> list = Arrays.stream(models.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
        return new GeminiLlmClient(apiKey, list);
    }

    @Bean
    public VectorStore atsVectorStore(
            DataSource dataSource,
            @Value("${ats.vector.enabled:true}") boolean enabled,
            @Value("${ats.embedding.dimensions:768}") int dimensions) {

        if (enabled) {
            try {
                PgVectorStore pg = new PgVectorStore(dataSource, dimensions);
                pg.init();
                log.info("ATS vector store: pgvector ({} dimensions).", dimensions);
                return pg;
            } catch (Exception ex) {
                log.warn("pgvector is not available ({}). Using the in-memory vector store. "
                        + "Install the extension (CREATE EXTENSION vector) for persistent retrieval.", ex.getMessage());
            }
        }
        return new InMemoryVectorStore();
    }

    @Bean
    public KnowledgeBaseIndexer atsKnowledgeBaseIndexer(KnowledgeBase kb, EmbeddingClient embedder, VectorStore store) {
        return new KnowledgeBaseIndexer(kb, embedder, store);
    }

    @Bean
    public ApplicationRunner atsKnowledgeBaseWarmup(KnowledgeBaseIndexer indexer) {
        return args -> {
            Thread t = new Thread(indexer::ensureIndexed, "ats-kb-indexer");
            t.setDaemon(true);
            t.start();
        };
    }

    @Bean
    public AtsAnalysisService atsAnalysisService(
            KnowledgeBase kb, EmbeddingClient embedder, VectorStore store, LlmClient llm, KnowledgeBaseIndexer indexer,
            @Value("${ats.role.min-similarity:0.55}") double roleMinSimilarity,
            @Value("${ats.match.met:0.72}") double met,
            @Value("${ats.match.partial:0.60}") double partial,
            @Value("${ats.match.floor:0.35}") double floor) {
        return new AtsAnalysisService(kb, embedder, store, llm, indexer, roleMinSimilarity, met, partial, floor);
    }

    @Bean
    public AtsRateLimiter atsRateLimiter(
            @Value("${ats.rate-limit.max:10}") int max,
            @Value("${ats.rate-limit.window-seconds:600}") int windowSeconds) {
        return new AtsRateLimiter(max, Duration.ofSeconds(windowSeconds));
    }
}