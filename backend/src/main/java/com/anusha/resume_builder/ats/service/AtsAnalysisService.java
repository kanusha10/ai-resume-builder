package com.anusha.resume_builder.ats.service;

import com.anusha.resume_builder.ats.analysis.NarrativeBuilder;
import com.anusha.resume_builder.ats.analysis.NarrativeBuilder.Finding;
import com.anusha.resume_builder.ats.analysis.NarrativeBuilder.Guide;
import com.anusha.resume_builder.ats.analysis.NarrativeBuilder.Narrative;
import com.anusha.resume_builder.ats.analysis.QualityScorer;
import com.anusha.resume_builder.ats.analysis.RequirementExtractor;
import com.anusha.resume_builder.ats.analysis.RequirementMatcher;
import com.anusha.resume_builder.ats.analysis.RequirementMatcher.MatchResult;
import com.anusha.resume_builder.ats.analysis.RequirementMatcher.Status;
import com.anusha.resume_builder.ats.analysis.RequirementMatcher.Where;
import com.anusha.resume_builder.ats.analysis.Requirements.Mode;
import com.anusha.resume_builder.ats.analysis.Requirements.RequirementSet;
import com.anusha.resume_builder.ats.analysis.Requirements.SourceRef;
import com.anusha.resume_builder.ats.analysis.ResumeChunker;
import com.anusha.resume_builder.ats.analysis.ResumeChunker.ResumeChunk;
import com.anusha.resume_builder.ats.analysis.ResumeModel;
import com.anusha.resume_builder.ats.analysis.ScoreAggregator;
import com.anusha.resume_builder.ats.analysis.ScoreAggregator.ComponentScore;
import com.anusha.resume_builder.ats.analysis.ScoreAggregator.Scoring;
import com.anusha.resume_builder.ats.analysis.TextMatcher;
import com.anusha.resume_builder.ats.dto.AtsAnalysisResponse;
import com.anusha.resume_builder.ats.dto.AtsAnalyzeRequest;
import com.anusha.resume_builder.ats.embedding.EmbeddingClient;
import com.anusha.resume_builder.ats.kb.KnowledgeBase;
import com.anusha.resume_builder.ats.llm.LlmClient;
import com.anusha.resume_builder.ats.vector.VectorStore;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

public class AtsAnalysisService {

    private static final Logger log = LoggerFactory.getLogger(AtsAnalysisService.class);
    private static final int MIN_JD_CHARS = 60;

    private final KnowledgeBase kb;
    private final EmbeddingClient embedder;
    private final VectorStore store;
    private final LlmClient llm;
    private final KnowledgeBaseIndexer indexer;
    private final RequirementExtractor extractor;
    private final RequirementMatcher matcher;
    private final NarrativeBuilder narrativeBuilder;
    private final ObjectMapper mapper = new ObjectMapper();

    public AtsAnalysisService(KnowledgeBase kb, EmbeddingClient embedder, VectorStore store, LlmClient llm,
                              KnowledgeBaseIndexer indexer, double roleMinSimilarity,
                              double metThreshold, double partialThreshold, double floor) {
        this.kb = kb;
        this.embedder = embedder;
        this.store = store;
        this.llm = llm;
        this.indexer = indexer;
        this.extractor = new RequirementExtractor(kb, embedder, store, llm, indexer::isReady, roleMinSimilarity);
        this.matcher = new RequirementMatcher(kb, embedder, llm, metThreshold, partialThreshold, floor);
        this.narrativeBuilder = new NarrativeBuilder(llm);
    }

    public AtsAnalysisResponse analyze(AtsAnalyzeRequest request) {
        long started = System.nanoTime();
        List<String> warnings = new ArrayList<>();

        JsonNode resumeJson = mapper.valueToTree(request.resume());
        ResumeModel resume = ResumeModel.from(resumeJson);

        String jd = clean(request.jobDescription());
        String title = clean(request.jobTitle());
        if (!jd.isEmpty() && jd.length() < MIN_JD_CHARS && title.isEmpty()) {
            title = jd;
            jd = "";
        }
        if (title.isEmpty()) {
            title = resume.role;
        }

        boolean kbReady = indexer.ensureIndexed();
        if (!kbReady && embedder.isAvailable()) {
            warnings.add("The role knowledge base is still being prepared; some retrieval used title matching instead.");
        }

        RequirementSet reqs;
        if (jd.length() >= MIN_JD_CHARS) {
            reqs = extractor.fromJobDescription(jd, title);
        } else if (!title.isEmpty()) {
            reqs = extractor.fromRoleTitle(title);
        } else {
            reqs = RequirementSet.qualityOnly("", "No job title or description was provided.",
                    List.of("Add a job title or paste a job description to get a job-specific score."));
        }
        warnings.addAll(reqs.warnings());

        String targetTitle = !reqs.title().isBlank() ? reqs.title() : title;

        List<ResumeChunk> chunks = ResumeChunker.chunk(resume);
        RequirementMatcher.Outcome outcome = reqs.items().isEmpty()
                ? new RequirementMatcher.Outcome(List.of(), List.of(), false, false)
                : matcher.match(reqs, resume, chunks);
        warnings.addAll(outcome.warnings());

        QualityScorer.Report quality = QualityScorer.analyze(resume, targetTitle);
        Scoring scoring = ScoreAggregator.score(reqs.mode(), outcome.results(), quality);

        List<Finding> findings = buildFindings(outcome.results(), quality, scoring);
        List<Guide> guides = retrieveGuides(findings, kbReady, warnings);
        List<String> strengths = buildStrengths(quality, scoring, outcome.results());

        Narrative narrative = narrativeBuilder.build(new NarrativeBuilder.Context(
                targetTitle, reqs.mode().name(), scoring.score(), scoring.grade(), strengths, findings,
                quality.weakBullets(), guides));
        warnings.addAll(narrative.warnings());

        boolean semantic = outcome.semanticUsed();
        boolean llmUsed = outcome.llmJudgeUsed() || narrative.llmUsed();
        boolean degraded = !warnings.isEmpty() && (!semantic || !llm.isAvailable() || !narrative.llmUsed());

        AtsAnalysisResponse response = assemble(reqs, targetTitle, outcome, quality, scoring, findings, guides,
                strengths, narrative, warnings, semantic, llmUsed, degraded, started);

        log.info("ATS analysis done: mode={} score={} semantic={} llm={} took={}ms",
                reqs.mode(), scoring.score(), semantic, llmUsed, response.meta().tookMs());
        return response;
    }

    private List<Finding> buildFindings(List<MatchResult> results, QualityScorer.Report q, Scoring scoring) {
        List<Finding> out = new ArrayList<>();

        for (QualityScorer.Check c : q.checks()) {
            if (c.status().equals("pass")) {
                continue;
            }
            ComponentScore comp = scoring.component(c.category());
            double catMax = q.maxOf(c.category());
            if (comp == null || catMax == 0) {
                continue;
            }
            double impact = round1(c.lost() / catMax * comp.max());
            out.add(new Finding("q-" + c.key(), c.label(), c.detail(), c.tip(), impact, severity(impact), c.section()));
        }

        ComponentScore kw = scoring.component(ScoreAggregator.KEYWORDS);
        List<MatchResult> skills = results.stream().filter(r -> r.requirement().isSkill()).toList();
        if (kw != null && !skills.isEmpty()) {
            double den = skills.stream().mapToDouble(r -> r.requirement().required() ? 1.0 : 0.4).sum();
            List<MatchResult> missReq = skills.stream().filter(r -> r.requirement().required() && r.status() == Status.MISSING).toList();
            List<MatchResult> partReq = skills.stream().filter(r -> r.requirement().required() && r.status() == Status.PARTIAL).toList();
            List<MatchResult> listedReq = skills.stream().filter(r -> r.requirement().required() && r.where() == Where.SKILLS_ONLY).toList();
            List<MatchResult> missPref = skills.stream().filter(r -> !r.requirement().required() && r.status() == Status.MISSING).toList();

            addSkillFinding(out, "kw-missing-required", missReq, den, kw.max(), 1.0,
                    "Add missing required skills", "Not found in your resume: ",
                    "Add each one to your Skills section and show it in a bullet, but only if you genuinely have the skill.", "skills");
            addSkillFinding(out, "kw-partial-required", partReq, den, kw.max(), 1.0,
                    "Make related skills explicit", "Related experience found, but not the exact skill: ",
                    "Name the exact tool or technology the posting uses wherever you honestly worked with it.", "experience");
            addSkillFinding(out, "kw-listed-only", listedReq, den, kw.max(), 0.25,
                    "Show listed skills in your experience", "Listed in Skills but never used in a bullet: ",
                    "Mention these in an experience or project bullet so both the ATS and recruiters see how you used them.", "experience");
            addSkillFinding(out, "kw-missing-preferred", missPref, den, kw.max(), 0.4,
                    "Consider the preferred skills", "Preferred but not found: ",
                    "If you have any of these, add them. They can separate you from similar candidates.", "skills");
        }

        ComponentScore rq = scoring.component(ScoreAggregator.REQUIREMENTS);
        List<MatchResult> reqResults = results.stream().filter(r -> !r.requirement().isSkill()).toList();
        if (rq != null && !reqResults.isEmpty()) {
            double den = reqResults.stream().mapToDouble(r -> r.requirement().required() ? 1.0 : 0.6).sum();
            List<MatchResult> gaps = reqResults.stream().filter(r -> r.score() < 1.0)
                    .sorted(Comparator.comparingDouble((MatchResult r) -> r.score())).limit(4).toList();
            int n = 0;
            for (MatchResult g : gaps) {
                double w = g.requirement().required() ? 1.0 : 0.6;
                double impact = round1(w * (1 - g.score()) / den * rq.max());
                String section = g.status() == Status.MISSING ? "experience" : g.section();
                String detail = g.status() == Status.PARTIAL
                        ? "Partly shown: " + g.reason()
                        : "Not shown: " + g.reason();
                out.add(new Finding("rq-" + n++, "Show experience for: " + abbreviate(g.requirement().text(), 90), detail,
                        "Add a bullet that shows this, naming the tools you used and the result you achieved.",
                        impact, severity(impact), section));
            }
        }

        out.sort(Comparator.comparingDouble(Finding::impact).reversed());
        return out;
    }

    private void addSkillFinding(List<Finding> out, String id, List<MatchResult> group, double den, double kwMax,
                                 double lossFactor, String title, String detailPrefix, String tip, String section) {
        if (group.isEmpty()) {
            return;
        }
        double impact = 0;
        List<String> names = new ArrayList<>();
        for (MatchResult r : group) {
            double w = r.requirement().required() ? 1.0 : 0.4;
            double loss = id.equals("kw-listed-only") ? lossFactor : id.equals("kw-partial-required") ? (1 - r.score()) : (id.equals("kw-missing-preferred") ? 1.0 : 1.0);
            impact += w * loss / den * kwMax;
            names.add(r.requirement().text());
        }
        String list = String.join(", ", names.stream().limit(7).toList()) + (names.size() > 7 ? " (+" + (names.size() - 7) + " more)" : "");
        double rounded = round1(impact);
        out.add(new Finding(id, title + (names.size() > 1 ? " (" + names.size() + ")" : ""), detailPrefix + list + ".", tip,
                rounded, severity(rounded), section));
    }

    private static String severity(double impact) {
        return impact >= 3 ? "high" : impact >= 1.2 ? "medium" : "low";
    }

    private List<String> buildStrengths(QualityScorer.Report q, Scoring scoring, List<MatchResult> results) {
        List<String> out = new ArrayList<>();

        ComponentScore kw = scoring.component(ScoreAggregator.KEYWORDS);
        if (kw != null && kw.ratio() >= 0.7) {
            out.add("Strong skill coverage: " + kw.summary() + ".");
        }
        long strongEvidence = results.stream().filter(r -> !r.requirement().isSkill() && r.status() == Status.MET).count();
        if (strongEvidence > 0) {
            out.add(strongEvidence + " job requirement" + (strongEvidence > 1 ? "s are" : " is") + " clearly demonstrated with evidence in your resume.");
        }

        q.checks().stream()
                .filter(c -> c.status().equals("pass") && c.max() >= 3)
                .sorted(Comparator.comparingDouble(QualityScorer.Check::max).reversed())
                .limit(5)
                .forEach(c -> out.add(c.detail()));
        return out;
    }

    private List<Guide> retrieveGuides(List<Finding> findings, boolean kbReady, List<String> warnings) {
        List<Finding> queries = findings.size() > 5 ? findings.subList(0, 5) : findings;
        if (queries.isEmpty()) {
            return List.of();
        }

        Map<String, Double> best = new LinkedHashMap<>();

        if (kbReady && embedder.isAvailable()) {
            try {
                List<String> texts = queries.stream().map(f -> f.title() + ". " + f.tip()).toList();
                List<float[]> vectors = embedder.embed(texts, EmbeddingClient.Task.QUERY);
                for (float[] v : vectors) {
                    for (VectorStore.ScoredChunk hit : store.search(v, KnowledgeBase.KIND_GUIDE, 2)) {
                        best.merge(hit.id(), hit.similarity(), Math::max);
                    }
                }
            } catch (Exception ex) {
                log.warn("Guideline retrieval failed: {}", ex.getMessage());
                warnings.add("Guidance retrieval was unavailable; matched guidance by keywords instead.");
                best.clear();
            }
        }

        if (best.isEmpty()) {
            for (Finding f : queries) {
                String q = f.title() + " " + f.tip();
                kb.guidelines().stream()
                        .map(g -> Map.entry(g.id(), TextMatcher.tokenOverlap(q, g.title() + " " + g.text() + " " + String.join(" ", g.tags()))))
                        .filter(e -> e.getValue() > 0.15)
                        .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
                        .limit(2)
                        .forEach(e -> best.merge("guide:" + e.getKey(), e.getValue(), Math::max));
            }
        }

        List<Guide> guides = new ArrayList<>();
        best.entrySet().stream()
                .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
                .limit(8)
                .forEach(e -> kb.guidelineById(e.getKey().replaceFirst("^guide:", "")).ifPresent(g ->
                        guides.add(new Guide("guide:" + g.id(), g.title(), g.text(), round2(e.getValue())))));
        return guides;
    }

    private AtsAnalysisResponse assemble(RequirementSet reqs, String targetTitle, RequirementMatcher.Outcome outcome,
                                         QualityScorer.Report quality, Scoring scoring, List<Finding> findings,
                                         List<Guide> guides, List<String> strengths, Narrative narrative,
                                         List<String> warnings, boolean semantic, boolean llmUsed, boolean degraded,
                                         long started) {

        String sourceKind = switch (reqs.mode()) {
            case JOB_DESCRIPTION -> "job-description";
            case ROLE_PROFILE -> reqs.aiInferred() ? "ai-inferred" : "role-profile";
            default -> "none";
        };

        AtsAnalysisResponse.Target target = new AtsAnalysisResponse.Target(
                targetTitle, reqs.domain(), reqs.sourceNote(), sourceKind, round2(reqs.confidence()));

        List<AtsAnalysisResponse.Component> components = scoring.components().stream()
                .map(c -> new AtsAnalysisResponse.Component(c.key(), c.label(), c.earned(), c.max(), c.percent(), c.summary()))
                .toList();

        List<AtsAnalysisResponse.SkillMatch> matched = new ArrayList<>();
        List<AtsAnalysisResponse.MissingSkill> missing = new ArrayList<>();
        int found = 0;
        int totalSkills = 0;
        for (MatchResult r : outcome.results()) {
            if (!r.requirement().isSkill()) {
                continue;
            }
            totalSkills++;
            if (r.status() == Status.MET) {
                found++;
                matched.add(new AtsAnalysisResponse.SkillMatch(r.requirement().text(), r.requirement().required(),
                        whereLabel(r.where()), abbreviate(r.evidence(), 160), r.section()));
            } else {
                missing.add(new AtsAnalysisResponse.MissingSkill(r.requirement().text(), r.requirement().required(),
                        r.status() == Status.PARTIAL ? r.section() : "skills"));
            }
        }
        AtsAnalysisResponse.SkillSummary skills = new AtsAnalysisResponse.SkillSummary(matched, missing, found, totalSkills,
                totalSkills == 0 ? 0 : (int) Math.round(found * 100.0 / totalSkills));

        List<AtsAnalysisResponse.RequirementResult> requirementResults = outcome.results().stream()
                .filter(r -> !r.requirement().isSkill())
                .map(r -> new AtsAnalysisResponse.RequirementResult(r.requirement().text(),
                        r.requirement().type().name().toLowerCase(Locale.ROOT), r.requirement().required(),
                        r.status().name().toLowerCase(Locale.ROOT), whereLabel(r.where()), abbreviate(r.evidence(), 200),
                        r.evidenceLabel(), r.section(), round2(r.similarity()), r.reason()))
                .toList();

        List<AtsAnalysisResponse.Check> checks = quality.checks().stream()
                .map(c -> new AtsAnalysisResponse.Check(c.key(), c.category(), c.label(), c.status(), c.points(), c.max(),
                        c.detail(), c.tip(), c.section()))
                .toList();

        List<AtsAnalysisResponse.Issue> issues = findings.stream().limit(12)
                .map(f -> new AtsAnalysisResponse.Issue(f.title(), f.detail(), f.severity(), f.impact(), f.section()))
                .toList();

        List<AtsAnalysisResponse.Action> actions = narrative.actions().stream()
                .map(a -> new AtsAnalysisResponse.Action(a.title(), a.why(), a.how(), a.impact(), a.section(), a.sources()))
                .toList();

        List<AtsAnalysisResponse.Rewrite> rewrites = narrative.rewrites().stream()
                .map(r -> new AtsAnalysisResponse.Rewrite(r.original(), r.improved(), r.reason(), r.section()))
                .toList();

        List<AtsAnalysisResponse.Source> sources = new ArrayList<>();
        for (SourceRef s : reqs.sources()) {
            sources.add(new AtsAnalysisResponse.Source(s.id(), s.kind(), s.title(), round2(s.relevance())));
        }
        Set<String> cited = new java.util.LinkedHashSet<>();
        narrative.actions().forEach(a -> cited.addAll(a.sources()));
        List<Guide> shown = guides.stream().filter(g -> cited.contains(g.id())).toList();
        if (shown.isEmpty()) {
            shown = guides.stream().limit(3).toList();
        }
        for (Guide g : shown) {
            sources.add(new AtsAnalysisResponse.Source(g.id(), KnowledgeBase.KIND_GUIDE, g.title(), g.relevance()));
        }

        QualityScorer.Stats st = quality.stats();
        AtsAnalysisResponse.Stats stats = new AtsAnalysisResponse.Stats(st.words(), st.bullets(),
                st.actionVerbPercent(), st.quantifiedPercent(), st.skills());

        long took = (System.nanoTime() - started) / 1_000_000;
        List<String> distinctWarnings = warnings.stream().distinct().toList();

        AtsAnalysisResponse.Meta meta = new AtsAnalysisResponse.Meta(semantic ? "rag" : "rules", llmUsed, semantic,
                embedder.modelName(), store.name(), scoring.caps(), distinctWarnings, took, degraded);

        return new AtsAnalysisResponse(scoring.score(), scoring.grade(), scoring.tone(), reqs.mode().name(),
                narrative.headline(), narrative.summary(), target, components, skills, requirementResults, checks,
                strengths, issues, actions, rewrites, sources, stats, meta);
    }

    private static String whereLabel(Where w) {
        return switch (w) {
            case EXPERIENCE -> "experience";
            case SKILLS_ONLY -> "skills-only";
            case SEMANTIC -> "semantic";
            default -> "none";
        };
    }

    private static String clean(String s) {
        return s == null ? "" : s.replace("\r", "").trim();
    }

    private static String abbreviate(String s, int max) {
        String t = s == null ? "" : s.replaceAll("\\s+", " ").trim();
        return t.length() > max ? t.substring(0, max - 3) + "..." : t;
    }

    private static double round1(double v) {
        return Math.round(v * 10.0) / 10.0;
    }

    private static double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}