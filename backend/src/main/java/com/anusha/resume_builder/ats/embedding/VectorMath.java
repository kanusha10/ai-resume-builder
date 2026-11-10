package com.anusha.resume_builder.ats.embedding;

import java.util.Locale;

/** Small, dependency-free vector helpers used by the embedding client and vector stores. */
public final class VectorMath {

    private VectorMath() {
    }

    /** Returns a unit-length copy of the vector (a zero vector is returned unchanged). */
    public static float[] normalize(float[] v) {
        double sum = 0;
        for (float x : v) {
            sum += (double) x * x;
        }
        double norm = Math.sqrt(sum);
        float[] out = new float[v.length];
        if (norm == 0) {
            System.arraycopy(v, 0, out, 0, v.length);
            return out;
        }
        for (int i = 0; i < v.length; i++) {
            out[i] = (float) (v[i] / norm);
        }
        return out;
    }

    /**
     * Forces a vector to exactly {@code dims} dimensions and unit length.
     * Longer vectors are truncated (what Matryoshka-style embedding models expect) and re-normalized;
     * shorter vectors are rejected because they cannot be compared safely.
     */
    public static float[] fit(float[] v, int dims) {
        if (v.length < dims) {
            throw new IllegalArgumentException(
                    "Embedding has " + v.length + " dimensions, expected " + dims);
        }
        float[] cut = v.length == dims ? v : java.util.Arrays.copyOf(v, dims);
        return normalize(cut);
    }

    /** Cosine similarity in [-1, 1]. Safe for vectors that are not unit length. */
    public static double cosine(float[] a, float[] b) {
        if (a.length != b.length) {
            throw new IllegalArgumentException("Vector length mismatch: " + a.length + " vs " + b.length);
        }
        double dot = 0;
        double na = 0;
        double nb = 0;
        for (int i = 0; i < a.length; i++) {
            dot += (double) a[i] * b[i];
            na += (double) a[i] * a[i];
            nb += (double) b[i] * b[i];
        }
        if (na == 0 || nb == 0) {
            return 0;
        }
        return dot / (Math.sqrt(na) * Math.sqrt(nb));
    }

    /** Formats a vector as a pgvector literal, e.g. {@code [0.1,0.2,0.3]}. */
    public static String toPgLiteral(float[] v) {
        StringBuilder sb = new StringBuilder(v.length * 10 + 2);
        sb.append('[');
        for (int i = 0; i < v.length; i++) {
            if (i > 0) {
                sb.append(',');
            }
            sb.append(String.format(Locale.ROOT, "%.7g", v[i]));
        }
        return sb.append(']').toString();
    }
}