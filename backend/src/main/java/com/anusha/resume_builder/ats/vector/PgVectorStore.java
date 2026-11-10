package com.anusha.resume_builder.ats.vector;

import com.anusha.resume_builder.ats.embedding.VectorMath;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Vector store backed by the application's existing PostgreSQL database using the pgvector extension.
 *
 * Table {@code ats_kb_chunk} holds the knowledge base. Cosine distance ({@code <=>}) is used for search, with an
 * HNSW index when the installed pgvector version supports it. Plain JDBC is used on purpose: no extra
 * dependency, and it works with whatever DataSource Spring Boot has already configured.
 */
public class PgVectorStore implements VectorStore {

    private static final Logger log = LoggerFactory.getLogger(PgVectorStore.class);
    private static final String TABLE = "ats_kb_chunk";

    private final DataSource dataSource;
    private final int dimensions;

    public PgVectorStore(DataSource dataSource, int dimensions) {
        this.dataSource = dataSource;
        this.dimensions = dimensions;
    }

    /** Creates the extension, table and indexes if needed. Throws if pgvector is unavailable. */
    public void init() throws SQLException {
        try (Connection c = dataSource.getConnection(); Statement s = c.createStatement()) {
            s.execute("CREATE EXTENSION IF NOT EXISTS vector");
            s.execute("CREATE TABLE IF NOT EXISTS " + TABLE + " ("
                    + "id TEXT PRIMARY KEY, "
                    + "kind TEXT NOT NULL, "
                    + "title TEXT NOT NULL, "
                    + "content TEXT NOT NULL, "
                    + "content_hash TEXT NOT NULL, "
                    + "embedding_model TEXT NOT NULL, "
                    + "embedding vector(" + dimensions + ") NOT NULL, "
                    + "updated_at TIMESTAMPTZ NOT NULL DEFAULT now())");
            s.execute("CREATE INDEX IF NOT EXISTS ats_kb_chunk_kind_idx ON " + TABLE + " (kind)");

            int existing = existingDimensions(c);
            if (existing > 0 && existing != dimensions) {
                throw new IllegalStateException("Table " + TABLE + " stores " + existing
                        + "-dimension vectors but ats.embedding.dimensions=" + dimensions
                        + ". Drop the table (DROP TABLE " + TABLE + ") so it is rebuilt.");
            }

            try {
                s.execute("CREATE INDEX IF NOT EXISTS ats_kb_chunk_embedding_idx ON " + TABLE
                        + " USING hnsw (embedding vector_cosine_ops)");
            } catch (SQLException indexError) {
                // pgvector < 0.5 has no HNSW. Exact search is still fast for a knowledge base this small.
                log.warn("HNSW index not created ({}). Falling back to exact search.", indexError.getMessage());
            }
        }
    }

    private int existingDimensions(Connection c) throws SQLException {
        String sql = "SELECT a.atttypmod FROM pg_attribute a WHERE a.attrelid = ?::regclass "
                + "AND a.attname = 'embedding' AND NOT a.attisdropped";
        try (PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setString(1, TABLE);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? rs.getInt(1) : -1;
            }
        }
    }

    @Override
    public String name() {
        return "pgvector";
    }

    @Override
    public void upsert(List<StoredChunk> chunks) throws SQLException {
        if (chunks.isEmpty()) {
            return;
        }
        String sql = "INSERT INTO " + TABLE
                + " (id, kind, title, content, content_hash, embedding_model, embedding, updated_at) "
                + "VALUES (?, ?, ?, ?, ?, ?, ?::vector, now()) "
                + "ON CONFLICT (id) DO UPDATE SET kind = EXCLUDED.kind, title = EXCLUDED.title, "
                + "content = EXCLUDED.content, content_hash = EXCLUDED.content_hash, "
                + "embedding_model = EXCLUDED.embedding_model, embedding = EXCLUDED.embedding, updated_at = now()";

        try (Connection c = dataSource.getConnection()) {
            c.setAutoCommit(false);
            try (PreparedStatement ps = c.prepareStatement(sql)) {
                for (StoredChunk ch : chunks) {
                    ps.setString(1, ch.id());
                    ps.setString(2, ch.kind());
                    ps.setString(3, ch.title());
                    ps.setString(4, ch.content());
                    ps.setString(5, ch.contentHash());
                    ps.setString(6, ch.embeddingModel());
                    ps.setString(7, VectorMath.toPgLiteral(ch.embedding()));
                    ps.addBatch();
                }
                ps.executeBatch();
                c.commit();
            } catch (SQLException e) {
                c.rollback();
                throw e;
            }
        }
    }

    @Override
    public List<ScoredChunk> search(float[] query, String kind, int k) throws SQLException {
        String sql = "SELECT id, kind, title, content, 1 - (embedding <=> ?::vector) AS similarity "
                + "FROM " + TABLE + " WHERE kind = ? ORDER BY embedding <=> ?::vector LIMIT ?";
        String literal = VectorMath.toPgLiteral(query);

        try (Connection c = dataSource.getConnection()) {
            c.setAutoCommit(false);
            try {
                // Make HNSW scan wide enough that the kind filter never starves the result set.
                try (PreparedStatement cfg = c.prepareStatement("SELECT set_config('hnsw.ef_search', '200', true)")) {
                    cfg.execute();
                }

                List<ScoredChunk> out = new ArrayList<>();
                try (PreparedStatement ps = c.prepareStatement(sql)) {
                    ps.setString(1, literal);
                    ps.setString(2, kind);
                    ps.setString(3, literal);
                    ps.setInt(4, k);
                    try (ResultSet rs = ps.executeQuery()) {
                        while (rs.next()) {
                            out.add(new ScoredChunk(rs.getString(1), rs.getString(2), rs.getString(3),
                                    rs.getString(4), rs.getDouble(5)));
                        }
                    }
                }
                c.commit();
                return out;
            } catch (SQLException e) {
                c.rollback();
                throw e;
            }
        }
    }

    @Override
    public Map<String, String> contentHashes(String kind) throws SQLException {
        Map<String, String> out = new HashMap<>();
        try (Connection c = dataSource.getConnection();
             PreparedStatement ps = c.prepareStatement("SELECT id, content_hash FROM " + TABLE + " WHERE kind = ?")) {
            ps.setString(1, kind);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    out.put(rs.getString(1), rs.getString(2));
                }
            }
        }
        return out;
    }

    @Override
    public void retainOnly(String kind, Set<String> keepIds) throws SQLException {
        for (String id : contentHashes(kind).keySet()) {
            if (!keepIds.contains(id)) {
                try (Connection c = dataSource.getConnection();
                     PreparedStatement ps = c.prepareStatement("DELETE FROM " + TABLE + " WHERE id = ?")) {
                    ps.setString(1, id);
                    ps.executeUpdate();
                }
            }
        }
    }

    @Override
    public int count(String kind) throws SQLException {
        try (Connection c = dataSource.getConnection();
             PreparedStatement ps = c.prepareStatement("SELECT count(*) FROM " + TABLE + " WHERE kind = ?")) {
            ps.setString(1, kind);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? rs.getInt(1) : 0;
            }
        }
    }
}