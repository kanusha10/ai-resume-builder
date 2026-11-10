package com.anusha.resume_builder.ats.vector;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Storage and similarity search for knowledge-base chunks (role profiles and ATS guidelines).
 * Resume text is intentionally NOT stored here: it is embedded per request and discarded.
 */
public interface VectorStore {

    /** Short label shown in the API response, e.g. "pgvector" or "memory". */
    String name();

    void upsert(List<StoredChunk> chunks) throws Exception;

    /** Nearest chunks of the given kind by cosine similarity, best first. */
    List<ScoredChunk> search(float[] query, String kind, int k) throws Exception;

    /** chunk id -> content hash, used to embed only new or changed chunks. */
    Map<String, String> contentHashes(String kind) throws Exception;

    /** Deletes chunks of this kind whose id is not in {@code keepIds}. */
    void retainOnly(String kind, Set<String> keepIds) throws Exception;

    int count(String kind) throws Exception;

    record StoredChunk(String id, String kind, String title, String content, String contentHash,
                       String embeddingModel, float[] embedding) {
    }

    record ScoredChunk(String id, String kind, String title, String content, double similarity) {
    }
}