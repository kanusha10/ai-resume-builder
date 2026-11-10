package com.anusha.resume_builder.ats.analysis;

import com.anusha.resume_builder.ats.analysis.Requirements.Requirement;
import com.anusha.resume_builder.ats.analysis.Requirements.RequirementSet;
import com.anusha.resume_builder.ats.analysis.ResumeChunker.ResumeChunk;
import com.anusha.resume_builder.ats.embedding.EmbeddingClient;
import com.anusha.resume_builder.ats.embedding.VectorMath;
import com.anusha.resume_builder.ats.kb.KnowledgeBase;
import com.anusha.resume_builder.ats.llm.LlmClient;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class RequirementMatcher {

    private static final Logger log = LoggerFactory.getLogger(RequirementMatcher.class);
    private static final int TOP_K = 3;
    private static final int JUDGE_BATCH = 18;

    public enum Status { MET, PARTIAL, MISSING }

    public enum Where { EXPERIENCE, SKILLS_ONLY, SEMANTIC, NONE }

    public record MatchResult(Requirement requirement, Status status, Where where, double score, String evidence,
                              String evidenceLabel, String section, double similarity, String reason, String method) {
    }

    public record Outcome(List<MatchResult> results, List<String> warnings, boolean semanticUsed, boolean llmJudgeUsed) {
    }

    private final KnowledgeBase kb;
    private final EmbeddingClient embedder;
    private final LlmClient llm;
    private final double metThreshold;
    private final double partialThreshold;
    private final double floor;
    private final ObjectMapper mapper = new ObjectMapper();

    public RequirementMatcher(KnowledgeBase kb, EmbeddingClient embedder, LlmClient llm,
                              double metThreshold, double partialThreshold, double floor) {
        this.kb = kb;
        this.embedder = embedder;
        this.llm = llm;
        this.metThreshold = metThreshold;
        this.partialThreshold = partialThreshold;
        this.floor = floor;
    }

    public Outcome match(RequirementSet set, ResumeModel resume, List<ResumeChunk> chunks) {
        List<String> warnings = new ArrayList<>();
        Map<Integer, MatchResult> done = new HashMap<>();
        List<Requirement> pending = new ArrayList<>();

        for (Requirement req : set.items()) {
            MatchResult lexical = req.isSkill() ? lexicalSkill(req, chunks) : null;
            if (lexical != null) {
                done.put(req.id(), lexical);
            } else {
                pending.add(req);
            }
        }

        boolean semanticUsed = false;
        boolean judgeUsed = false;

        if (!pending.isEmpty() && !chunks.isEmpty()) {
            Map<Integer, List<Candidate>> candidates = null;

            if (embedder.isAvailable()) {
                try {
                    candidates = retrieve(pending, chunks);
                    semanticUsed = true;
                } catch (Exception ex) {
                    log.warn("Semantic retrieval failed, using lexical overlap: {}", ex.getMessage());
                    warnings.add("Semantic matching was unavailable for this run; word-overlap matching was used instead.");
                }
            } else {
                warnings.add("Semantic matching is not configured (no embedding key), so word-overlap matching was used.");
            }

            boolean lexicalFallback = candidates == null;
            if (lexicalFallback) {
                candidates = lexicalCandidates(pending, chunks);
            }

            Map<Integer, MatchResult> judged = new HashMap<>();
            if (semanticUsed && llm.isAvailable()) {
                try {
                    judged = judge(pending, candidates);
                    judgeUsed = !judged.isEmpty();
                } catch (Exception ex) {
                    log.warn("LLM judgment failed, using similarity thresholds: {}", ex.getMessage());
                    warnings.add("AI verification of matches was unavailable; similarity thresholds were used.");
                }
            }

            for (Requirement req : pending) {
                MatchResult r = judged.get(req.id());
                if (r == null) {
                    r = byThreshold(req, candidates.getOrDefault(req.id(), List.of()), lexicalFallback);
                }
                done.put(req.id(), r);
            }
        } else {
            for (Requirement req : pending) {
                done.put(req.id(), missing(req, "Nothing in the resume relates to this requirement."));
            }
        }

        List<MatchResult> ordered = new ArrayList<>();
        for (Requirement req : set.items()) {
            ordered.add(done.get(req.id()));
        }
        return new Outcome(ordered, warnings, semanticUsed, judgeUsed);
    }

    private MatchResult lexicalSkill(Requirement req, List<ResumeChunk> chunks) {
        List<String> spellings = new ArrayList<>(kb.spellingsOf(req.skill() == null ? req.text() : req.skill()));

        ResumeChunk usage = null;
        ResumeChunk listed = null;

        for (ResumeChunk c : chunks) {
            if (!TextMatcher.containsAny(c.display(), spellings)) {
                continue;
            }
            if (c.isUsageEvidence()) {
                if (usage == null || (c.type().equals("bullet") && usage.type().equals("project"))) {
                    usage = c;
                }
            } else if (listed == null) {
                listed = c;
            }
        }

        if (usage != null) {
            return new MatchResult(req, Status.MET, Where.EXPERIENCE, 1.0, usage.display(), usage.label(),
                    usage.section(), 1.0, "Used in your " + usage.label().split(":")[0].toLowerCase() + ".", "lexical");
        }
        if (listed != null) {
            return new MatchResult(req, Status.MET, Where.SKILLS_ONLY, 0.75, listed.display(), listed.label(),
                    listed.section(), 1.0, "Listed but not shown in any experience or project bullet.", "lexical");
        }
        return null;
    }

    private record Candidate(ResumeChunk chunk, double similarity, double lexical) {
    }

    private Map<Integer, List<Candidate>> retrieve(List<Requirement> pending, List<ResumeChunk> chunks) throws Exception {
        List<String> chunkTexts = new ArrayList<>();
        chunks.forEach(c -> chunkTexts.add(c.embedText()));
        List<float[]> chunkVectors = embedder.embed(chunkTexts, EmbeddingClient.Task.DOCUMENT);

        List<String> reqTexts = new ArrayList<>();
        pending.forEach(r -> reqTexts.add(r.text()));
        List<float[]> reqVectors = embedder.embed(reqTexts, EmbeddingClient.Task.QUERY);

        Map<Integer, List<Candidate>> out = new HashMap<>();
        for (int i = 0; i < pending.size(); i++) {
            List<Candidate> scored = new ArrayList<>();
            for (int j = 0; j < chunks.size(); j++) {
                scored.add(new Candidate(chunks.get(j), VectorMath.cosine(reqVectors.get(i), chunkVectors.get(j)),
                        TextMatcher.tokenOverlap(pending.get(i).text(), chunks.get(j).display())));
            }
            scored.sort(Comparator.comparingDouble(Candidate::similarity).reversed());
            List<Candidate> top = new ArrayList<>(scored.subList(0, Math.min(TOP_K, scored.size())));

            Candidate bestLexical = scored.stream().max(Comparator.comparingDouble(Candidate::lexical)).orElse(null);
            if (bestLexical != null && bestLexical.lexical() >= 0.2 && !top.contains(bestLexical) && !top.isEmpty()) {
                top.set(top.size() - 1, bestLexical);
            }
            out.put(pending.get(i).id(), top);
        }
        return out;
    }

    private Map<Integer, List<Candidate>> lexicalCandidates(List<Requirement> pending, List<ResumeChunk> chunks) {
        Map<Integer, List<Candidate>> out = new HashMap<>();
        for (Requirement req : pending) {
            List<Candidate> scored = new ArrayList<>();
            for (ResumeChunk c : chunks) {
                double overlap = TextMatcher.tokenOverlap(req.text(), c.display());
                scored.add(new Candidate(c, overlap, overlap));
            }
            scored.sort(Comparator.comparingDouble(Candidate::similarity).reversed());
            out.put(req.id(), new ArrayList<>(scored.subList(0, Math.min(TOP_K, scored.size()))));
        }
        return out;
    }

    private Map<Integer, MatchResult> judge(List<Requirement> pending, Map<Integer, List<Candidate>> candidates) throws Exception {
        Map<Integer, MatchResult> out = new HashMap<>();

        List<Requirement> toJudge = new ArrayList<>();
        for (Requirement r : pending) {
            List<Candidate> c = candidates.getOrDefault(r.id(), List.of());
            boolean weak = c.isEmpty()
                    || (c.get(0).similarity() < floor && c.stream().mapToDouble(Candidate::lexical).max().orElse(0) < 0.15);
            if (weak) {
                out.put(r.id(), missing(r, "No related content found in your resume."));
            } else {
                toJudge.add(r);
            }
        }

        for (int start = 0; start < toJudge.size(); start += JUDGE_BATCH) {
            List<Requirement> batch = toJudge.subList(start, Math.min(start + JUDGE_BATCH, toJudge.size()));
            JsonNode response = llm.generateJson(judgeSystem(), judgePrompt(batch, candidates));
            applyJudgement(response, batch, candidates, out);
        }
        return out;
    }

    private static String judgeSystem() {
        return "You are a strict resume-to-requirement verifier. Judge only from the evidence provided. "
                + "Never assume skills that are not stated. Reply with one JSON object only.";
    }

    private String judgePrompt(List<Requirement> batch, Map<Integer, List<Candidate>> candidates) throws Exception {
        ArrayNode items = mapper.createArrayNode();
        for (Requirement r : batch) {
            ObjectNode o = items.addObject();
            o.put("id", r.id());
            o.put("requirement", r.text());
            ArrayNode ev = o.putArray("evidence");
            int ref = 1;
            for (Candidate c : candidates.get(r.id())) {
                ObjectNode e = ev.addObject();
                e.put("ref", ref++);
                e.put("section", c.chunk().label());
                e.put("text", c.chunk().display());
            }
        }

        return "For each requirement decide whether the resume evidence demonstrates it.\n"
                + "- \"met\": the evidence explicitly shows the requirement (same skill, or clearly equivalent work).\n"
                + "- \"partial\": related experience exists but the requirement is not fully shown (different tool, missing scope, or only implied).\n"
                + "- \"missing\": the evidence does not show it.\n"
                + "Return JSON: {\"results\": [{\"id\": number, \"status\": \"met\"|\"partial\"|\"missing\", "
                + "\"evidenceRef\": number (the ref that best supports it, or 0), \"reason\": string (max 18 words)}]}\n"
                + "Include every id.\n\nINPUT:\n" + mapper.writeValueAsString(items);
    }

    private void applyJudgement(JsonNode response, List<Requirement> batch, Map<Integer, List<Candidate>> candidates,
                                Map<Integer, MatchResult> out) {
        Map<Integer, Requirement> byId = new HashMap<>();
        batch.forEach(r -> byId.put(r.id(), r));

        for (JsonNode r : response.path("results")) {
            Requirement req = byId.get(r.path("id").asInt(-1));
            if (req == null || out.containsKey(req.id())) {
                continue;
            }

            String status = r.path("status").asText("").toLowerCase();
            int ref = r.path("evidenceRef").asInt(0);
            List<Candidate> cands = candidates.get(req.id());
            Candidate best = ref >= 1 && ref <= cands.size() ? cands.get(ref - 1) : cands.get(0);
            String reason = trim(r.path("reason").asText(""), 160);

            switch (status) {
                case "met" -> out.put(req.id(), new MatchResult(req, Status.MET, Where.SEMANTIC,
                        req.isSkill() ? 0.9 : 1.0, best.chunk().display(), best.chunk().label(),
                        best.chunk().section(), best.similarity(), reason.isEmpty() ? "Shown in your resume." : reason, "semantic+llm"));
                case "partial" -> out.put(req.id(), new MatchResult(req, Status.PARTIAL, Where.SEMANTIC,
                        req.isSkill() ? 0.45 : 0.5, best.chunk().display(), best.chunk().label(),
                        best.chunk().section(), best.similarity(), reason.isEmpty() ? "Related experience, but not fully shown." : reason, "semantic+llm"));
                case "missing" -> out.put(req.id(), missing(req, reason.isEmpty() ? "Not shown in your resume." : reason));
                default -> {
                }
            }
        }
    }

    private MatchResult byThreshold(Requirement req, List<Candidate> cands, boolean lexicalOnly) {
        if (cands.isEmpty()) {
            return missing(req, "Nothing in the resume relates to this requirement.");
        }
        Candidate best = cands.get(0);
        double sim = best.similarity();

        double met = lexicalOnly ? 0.7 : metThreshold;
        double partial = lexicalOnly ? 0.4 : partialThreshold;
        String method = lexicalOnly ? "word-overlap" : "semantic-threshold";

        if (sim >= met) {
            return new MatchResult(req, Status.MET, Where.SEMANTIC, req.isSkill() ? 0.85 : 1.0, best.chunk().display(),
                    best.chunk().label(), best.chunk().section(), sim, "Closely related content found.", method);
        }
        if (sim >= partial) {
            return new MatchResult(req, Status.PARTIAL, Where.SEMANTIC, req.isSkill() ? 0.4 : 0.5, best.chunk().display(),
                    best.chunk().label(), best.chunk().section(), sim, "Somewhat related content found.", method);
        }
        return missing(req, "No related content found in your resume.");
    }

    private MatchResult missing(Requirement req, String reason) {
        String section = req.isSkill() ? "skills" : "experience";
        return new MatchResult(req, Status.MISSING, Where.NONE, 0, "", "", section, 0, reason, "none");
    }

    private static String trim(String s, int max) {
        String t = s == null ? "" : s.trim();
        return t.length() > max ? t.substring(0, max - 3) + "..." : t;
    }
}