package com.anusha.resume_builder.ats.service;

import com.anusha.resume_builder.ats.embedding.EmbeddingClient;
import com.anusha.resume_builder.ats.embedding.GeminiEmbeddingClient;
import com.anusha.resume_builder.ats.kb.KnowledgeBase;
import com.anusha.resume_builder.ats.kb.KnowledgeBase.KbChunk;
import com.anusha.resume_builder.ats.vector.VectorStore;
import com.anusha.resume_builder.ats.vector.VectorStore.StoredChunk;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class KnowledgeBaseIndexer {

    private static final Logger log = LoggerFactory.getLogger(KnowledgeBaseIndexer.class);
    private static final Duration RETRY_AFTER = Duration.ofSeconds(60);

    private final KnowledgeBase kb;
    private final EmbeddingClient embedder;
    private final VectorStore store;

    private volatile boolean ready;
    private volatile String lastError = "";
    private Instant lastFailure;

    public KnowledgeBaseIndexer(KnowledgeBase kb, EmbeddingClient embedder, VectorStore store) {
        this.kb = kb;
        this.embedder = embedder;
        this.store = store;
    }

    public boolean isReady() {
        return ready;
    }

    public String lastError() {
        return lastError;
    }

    public synchronized boolean ensureIndexed() {
        if (ready) {
            return true;
        }
        if (!embedder.isAvailable()) {
            lastError = "No embedding key configured (gemini.api.key).";
            return false;
        }
        if (lastFailure != null && Duration.between(lastFailure, Instant.now()).compareTo(RETRY_AFTER) < 0) {
            return false;
        }

        try {
            int embedded = 0;
            for (String kind : List.of(KnowledgeBase.KIND_ROLE, KnowledgeBase.KIND_GUIDE)) {
                List<KbChunk> ofKind = kb.chunks().stream().filter(c -> c.kind().equals(kind)).toList();
                Map<String, String> existing = store.contentHashes(kind);

                List<KbChunk> stale = new ArrayList<>();
                Set<String> keep = new HashSet<>();
                for (KbChunk c : ofKind) {
                    keep.add(c.id());
                    if (!hash(c).equals(existing.get(c.id()))) {
                        stale.add(c);
                    }
                }

                if (!stale.isEmpty()) {
                    List<String> texts = stale.stream().map(KbChunk::content).toList();
                    List<float[]> vectors = embedder.embed(texts, EmbeddingClient.Task.DOCUMENT);
                    List<StoredChunk> rows = new ArrayList<>();
                    for (int i = 0; i < stale.size(); i++) {
                        KbChunk c = stale.get(i);
                        rows.add(new StoredChunk(c.id(), c.kind(), c.title(), c.content(), hash(c),
                                embedder.modelName(), vectors.get(i)));
                    }
                    store.upsert(rows);
                    embedded += rows.size();
                }
                store.retainOnly(kind, keep);
            }

            ready = true;
            lastError = "";
            log.info("ATS knowledge base ready in {} store ({} newly embedded).", store.name(), embedded);
            return true;
        } catch (Exception ex) {
            lastFailure = Instant.now();
            lastError = ex.getMessage() == null ? ex.getClass().getSimpleName() : ex.getMessage();
            log.warn("ATS knowledge base indexing failed: {}", lastError);
            return false;
        }
    }

    private String hash(KbChunk c) {
        return GeminiEmbeddingClient.sha256(embedder.modelName() + "|" + embedder.dimensions() + "|" + c.content());
    }

    public int roleCount() {
        try {
            return store.count(KnowledgeBase.KIND_ROLE);
        } catch (Exception e) {
            return 0;
        }
    }

    public int guideCount() {
        try {
            return store.count(KnowledgeBase.KIND_GUIDE);
        } catch (Exception e) {
            return 0;
        }
    }
}