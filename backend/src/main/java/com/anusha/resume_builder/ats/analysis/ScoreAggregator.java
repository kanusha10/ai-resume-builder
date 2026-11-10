package com.anusha.resume_builder.ats.analysis;

import com.anusha.resume_builder.ats.analysis.RequirementMatcher.MatchResult;
import com.anusha.resume_builder.ats.analysis.RequirementMatcher.Status;
import com.anusha.resume_builder.ats.analysis.Requirements.Mode;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class ScoreAggregator {

    public static final String KEYWORDS = "keywords";
    public static final String REQUIREMENTS = "requirements";
    public static final String IMPACT = "impact";
    public static final String STRUCTURE = "structure";
    public static final String FORMATTING = "formatting";
    public static final String TARGETING = "targeting";

    private static final Map<String, String> LABELS = Map.of(
            KEYWORDS, "Keyword & skill match",
            REQUIREMENTS, "Requirements fit",
            IMPACT, "Experience impact",
            STRUCTURE, "Structure & completeness",
            FORMATTING, "Formatting & readability",
            TARGETING, "Role targeting");

    private ScoreAggregator() {
    }

    public record ComponentScore(String key, String label, double earned, double max, double ratio, String summary) {
        public int percent() {
            return max == 0 ? 0 : (int) Math.round(earned / max * 100);
        }
    }

    public record Scoring(int score, double uncappedScore, String grade, String tone,
                          List<ComponentScore> components, List<String> caps) {
        public ComponentScore component(String key) {
            return components.stream().filter(c -> c.key().equals(key)).findFirst().orElse(null);
        }
    }

    private static Map<String, Double> weights(Mode mode) {
        Map<String, Double> w = new LinkedHashMap<>();
        switch (mode) {
            case JOB_DESCRIPTION -> {
                w.put(KEYWORDS, 30.0);
                w.put(REQUIREMENTS, 20.0);
                w.put(IMPACT, 18.0);
                w.put(STRUCTURE, 14.0);
                w.put(FORMATTING, 10.0);
                w.put(TARGETING, 8.0);
            }
            case ROLE_PROFILE -> {
                w.put(KEYWORDS, 28.0);
                w.put(REQUIREMENTS, 14.0);
                w.put(IMPACT, 20.0);
                w.put(STRUCTURE, 16.0);
                w.put(FORMATTING, 12.0);
                w.put(TARGETING, 10.0);
            }
            default -> {
                w.put(IMPACT, 30.0);
                w.put(STRUCTURE, 28.0);
                w.put(FORMATTING, 20.0);
                w.put(TARGETING, 22.0);
            }
        }
        return w;
    }

    public static Scoring score(Mode mode, List<MatchResult> results, QualityScorer.Report q) {
        List<MatchResult> skills = results.stream().filter(r -> r.requirement().isSkill()).toList();
        List<MatchResult> reqs = results.stream().filter(r -> !r.requirement().isSkill()).toList();

        Map<String, Double> weights = weights(mode);
        weights.keySet().removeIf(k -> switch (k) {
            case KEYWORDS -> skills.isEmpty();
            case REQUIREMENTS -> reqs.isEmpty();
            case TARGETING -> !q.has(QualityScorer.TARGETING);
            default -> false;
        });

        double totalWeight = weights.values().stream().mapToDouble(Double::doubleValue).sum();
        double scale = totalWeight == 0 ? 0 : 100.0 / totalWeight;

        List<ComponentScore> components = new ArrayList<>();
        double total = 0;

        for (Map.Entry<String, Double> e : weights.entrySet()) {
            String key = e.getKey();
            double max = round1(e.getValue() * scale);
            double ratio;
            String summary;

            switch (key) {
                case KEYWORDS -> {
                    ratio = weightedCoverage(skills, 0.4);
                    long reqTotal = skills.stream().filter(r -> r.requirement().required()).count();
                    long reqFound = skills.stream().filter(r -> r.requirement().required() && r.status() == Status.MET).count();
                    long prefTotal = skills.size() - reqTotal;
                    long prefFound = skills.stream().filter(r -> !r.requirement().required() && r.status() == Status.MET).count();
                    summary = reqFound + " of " + reqTotal + " required skills found"
                            + (prefTotal > 0 ? ", " + prefFound + " of " + prefTotal + " preferred" : "");
                }
                case REQUIREMENTS -> {
                    ratio = weightedCoverage(reqs, 0.6);
                    long met = reqs.stream().filter(r -> r.status() == Status.MET).count();
                    long partial = reqs.stream().filter(r -> r.status() == Status.PARTIAL).count();
                    summary = met + " met, " + partial + " partial, " + (reqs.size() - met - partial) + " not shown";
                }
                case IMPACT -> {
                    ratio = q.ratio(QualityScorer.IMPACT);
                    summary = q.stats().actionVerbPercent() + "% action verbs, " + q.stats().quantifiedPercent() + "% quantified";
                }
                case STRUCTURE -> {
                    ratio = q.ratio(QualityScorer.STRUCTURE);
                    summary = passSummary(q, QualityScorer.STRUCTURE);
                }
                case FORMATTING -> {
                    ratio = q.ratio(QualityScorer.FORMATTING);
                    summary = passSummary(q, QualityScorer.FORMATTING);
                }
                default -> {
                    ratio = q.ratio(QualityScorer.TARGETING);
                    summary = passSummary(q, QualityScorer.TARGETING);
                }
            }

            double earned = round1(ratio * max);
            total += earned;
            components.add(new ComponentScore(key, LABELS.get(key), earned, max, ratio, summary));
        }

        List<String> caps = new ArrayList<>();
        double cap = 100;

        QualityScorer.Stats st = q.stats();
        if (st.bullets() == 0) {
            cap = lower(cap, 45, caps, "Score capped at 45: no experience, internship or project bullet points.");
        } else if (st.bullets() < 4) {
            cap = lower(cap, 62, caps, "Score capped at 62: fewer than 4 bullet points.");
        }
        if (q.checks().stream().anyMatch(c -> c.key().equals("skills") && c.points() == 0)) {
            cap = lower(cap, 68, caps, "Score capped at 68: no skills section.");
        }
        if (q.checks().stream().anyMatch(c -> c.key().equals("email") && c.points() == 0)) {
            cap = lower(cap, 60, caps, "Score capped at 60: no email address.");
        }

        List<MatchResult> requiredSkills = skills.stream().filter(r -> r.requirement().required()).toList();
        if (mode != Mode.QUALITY_ONLY && requiredSkills.size() >= 5) {
            double cov = weightedCoverage(requiredSkills, 1.0);
            String target = mode == Mode.JOB_DESCRIPTION ? "this job posting" : "this role";
            if (cov < 0.25) {
                cap = lower(cap, 55, caps, "Score capped at 55: very low match with " + target + ".");
            } else if (cov < 0.45) {
                cap = lower(cap, 70, caps, "Score capped at 70: low match with " + target + ".");
            }
        }

        double uncapped = Math.max(0, Math.min(100, total));
        int finalScore = (int) Math.round(Math.min(uncapped, cap));

        String grade;
        String tone;
        if (finalScore >= 85) {
            grade = "Excellent";
            tone = "excellent";
        } else if (finalScore >= 70) {
            grade = "Good";
            tone = "good";
        } else if (finalScore >= 55) {
            grade = "Fair";
            tone = "fair";
        } else {
            grade = "Needs work";
            tone = "poor";
        }

        return new Scoring(finalScore, round1(uncapped), grade, tone, components, caps);
    }

    static double weightedCoverage(List<MatchResult> results, double preferredWeight) {
        double num = 0;
        double den = 0;
        for (MatchResult r : results) {
            double w = r.requirement().required() ? 1.0 : preferredWeight;
            num += w * r.score();
            den += w;
        }
        return den == 0 ? 0 : num / den;
    }

    private static String passSummary(QualityScorer.Report q, String category) {
        long total = q.checks().stream().filter(c -> c.category().equals(category)).count();
        long pass = q.checks().stream().filter(c -> c.category().equals(category) && c.status().equals("pass")).count();
        return pass + " of " + total + " checks passed";
    }

    private static double lower(double cap, double value, List<String> caps, String message) {
        if (value < cap) {
            caps.add(message);
            return value;
        }
        return cap;
    }

    static double round1(double v) {
        return Math.round(v * 10.0) / 10.0;
    }
}