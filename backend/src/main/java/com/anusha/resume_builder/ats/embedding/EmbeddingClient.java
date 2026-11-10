package com.anusha.resume_builder.ats.embedding;

import java.io.IOException;
import java.util.List;

/** Turns text into dense vectors. Implementations must return unit-length vectors of {@link #dimensions()}. */
public interface EmbeddingClient {

    /**
     * Retrieval models embed "things being searched for" and "things being searched" differently.
     * QUERY is used for job requirements and lookup text, DOCUMENT for resume chunks and the knowledge base.
     */
    enum Task { DOCUMENT, QUERY }

    /** False when no credentials are configured; callers then fall back to lexical matching. */
    boolean isAvailable();

    String modelName();

    int dimensions();

    /** Returns one vector per input text, in the same order. */
    List<float[]> embed(List<String> texts, Task task) throws IOException;
}