package com.anusha.resume_builder.ats.dto;

import java.util.List;

/** The full result returned by POST /api/ats/analyze. Field names are the contract with the frontend. */
public record AtsAnalysisResponse(
        int score,
        String grade,
        String tone,
        String mode,
        String headline,
        String summary,
        Target target,
        List<Component> components,
        SkillSummary skills,
        List<RequirementResult> requirements,
        List<Check> checks,
        List<String> strengths,
        List<Issue> issues,
        List<Action> actions,
        List<Rewrite> rewrites,
        List<Source> sources,
        Stats stats,
        Meta meta) {

    /** @param sourceKind job-description | role-profile | ai-inferred | none */
    public record Target(String title, String domain, String source, String sourceKind, double confidence) {
    }

    public record Component(String key, String label, double earned, double max, int percent, String summary) {
    }

    /** @param where experience | skills-only | semantic */
    public record SkillMatch(String term, boolean required, String where, String evidence, String section) {
    }

    public record SkillSummary(List<SkillMatch> matched, List<MissingSkill> missing, int found, int total,
                               int coveragePercent) {
    }

    public record MissingSkill(String term, boolean required, String section) {
    }

    /** @param status met | partial | missing; @param type skill | responsibility | qualification */
    public record RequirementResult(String text, String type, boolean required, String status, String where,
                                    String evidence, String evidenceLabel, String section, double similarity,
                                    String reason) {
    }

    /** @param status pass | warn | fail */
    public record Check(String key, String category, String label, String status, double points, double max,
                        String detail, String tip, String section) {
    }

    /** @param severity high | medium | low; @param impact estimated score points gained if fixed */
    public record Issue(String title, String detail, String severity, double impact, String section) {
    }

    public record Action(String title, String why, String how, double impact, String section, List<String> sources) {
    }

    public record Rewrite(String original, String improved, String reason, String section) {
    }

    /** A retrieved knowledge-base item that informed the result. */
    public record Source(String id, String kind, String title, double relevance) {
    }

    public record Stats(int words, int bullets, int actionVerbPercent, int quantifiedPercent, int skills) {
    }

    /**
     * @param engine   rag (semantic retrieval was used) | rules (deterministic fallback)
     * @param degraded true when part of the pipeline was unavailable and a fallback was used
     */
    public record Meta(String engine, boolean llmUsed, boolean semanticUsed, String embeddingModel,
                       String vectorStore, List<String> scoreCaps, List<String> warnings, long tookMs,
                       boolean degraded) {
    }
}