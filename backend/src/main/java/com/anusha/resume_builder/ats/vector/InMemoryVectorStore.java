package com.anusha.resume_builder.ats.vector;

import com.anusha.resume_builder.ats.embedding.VectorMath;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/** Brute-force cosine search. Used when pgvector is unavailable, and in tests. */
public class InMemoryVectorStore implements VectorStore {

    private final Map<String, StoredChunk> chunks = new ConcurrentHashMap<>();

    @Override
    public String name() {
        return "memory";
    }

    @Override
    public void upsert(List<StoredChunk> batch) {
        for (StoredChunk c : batch) {
            chunks.put(c.id(), c);
        }
    }

    @Override
    public List<ScoredChunk> search(float[] query, String kind, int k) {
        List<ScoredChunk> scored = new ArrayList<>();
        for (StoredChunk c : chunks.values()) {
            if (c.kind().equals(kind)) {
                scored.add(new ScoredChunk(c.id(), c.kind(), c.title(), c.content(),
                        VectorMath.cosine(query, c.embedding())));
            }
        }
        scored.sort(Comparator.comparingDouble(ScoredChunk::similarity).reversed());
        return scored.size() > k ? new ArrayList<>(scored.subList(0, k)) : scored;
    }

    @Override
    public Map<String, String> contentHashes(String kind) {
        Map<String, String> out = new HashMap<>();
        for (StoredChunk c : chunks.values()) {
            if (c.kind().equals(kind)) {
                out.put(c.id(), c.contentHash());
            }
        }
        return out;
    }

    @Override
    public void retainOnly(String kind, Set<String> keepIds) {
        chunks.values().removeIf(c -> c.kind().equals(kind) && !keepIds.contains(c.id()));
    }

    @Override
    public int count(String kind) {
        return (int) chunks.values().stream().filter(c -> c.kind().equals(kind)).count();
    }
}