package com.anusha.resume_builder.ats.analysis;

import com.anusha.resume_builder.ats.analysis.QualityScorer.WeakBullet;
import com.anusha.resume_builder.ats.llm.LlmClient;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class NarrativeBuilder {

    private static final Logger log = LoggerFactory.getLogger(NarrativeBuilder.class);
    private static final Pattern NUMBER = Pattern.compile("\\d+(?:[.,]\\d+)?");
    private static final Pattern PLACEHOLDER = Pattern.compile("\\[[^\\]]*\\]");

    public record Finding(String id, String title, String detail, String tip, double impact, String severity, String section) {
    }

    public record Guide(String id, String title, String text, double relevance) {
    }

    public record ActionItem(String title, String why, String how, double impact, String section, List<String> sources) {
    }

    public record RewriteItem(String original, String improved, String reason, String section) {
    }

    public record Narrative(String headline, String summary, List<ActionItem> actions, List<RewriteItem> rewrites,
                            boolean llmUsed, List<String> warnings) {
    }

    public record Context(String targetTitle, String mode, int score, String grade, List<String> strengths,
                          List<Finding> findings, List<WeakBullet> weakBullets, List<Guide> guides) {
    }

    private final LlmClient llm;
    private final ObjectMapper mapper = new ObjectMapper();

    public NarrativeBuilder(LlmClient llm) {
        this.llm = llm;
    }

    public Narrative build(Context ctx) {
        List<Finding> top = ctx.findings().size() > 6 ? ctx.findings().subList(0, 6) : ctx.findings();
        List<String> warnings = new ArrayList<>();

        if (llm.isAvailable() && (!top.isEmpty() || !ctx.weakBullets().isEmpty())) {
            try {
                Narrative n = fromLlm(ctx, top);
                if (n != null) {
                    return n;
                }
            } catch (Exception ex) {
                log.warn("Narrative generation via LLM failed: {}", ex.getMessage());
                warnings.add("AI-written advice was unavailable; standard guidance is shown instead.");
            }
        }

        return deterministic(ctx, top, warnings);
    }

    private Narrative fromLlm(Context ctx, List<Finding> top) throws Exception {
        List<WeakBullet> bullets = ctx.weakBullets().size() > 5 ? ctx.weakBullets().subList(0, 5) : ctx.weakBullets();
        JsonNode j = llm.generateJson(system(), prompt(ctx, top, bullets));

        Map<String, Finding> findingById = new HashMap<>();
        top.forEach(f -> findingById.put(f.id(), f));
        Set<String> guideIds = new HashSet<>();
        ctx.guides().forEach(g -> guideIds.add(g.id()));

        List<ActionItem> actions = new ArrayList<>();
        Set<String> used = new HashSet<>();
        for (JsonNode a : j.path("actions")) {
            Finding f = findingById.get(a.path("findingId").asText(""));
            if (f == null || !used.add(f.id())) {
                continue;
            }
            List<String> sources = new ArrayList<>();
            for (JsonNode s : a.path("sources")) {
                if (guideIds.contains(s.asText())) {
                    sources.add(s.asText());
                }
            }
            String why = clip(a.path("why").asText(""), 260);
            String how = clip(a.path("how").asText(""), 320);
            actions.add(new ActionItem(f.title(), why.isBlank() ? f.detail() : why, how.isBlank() ? f.tip() : how,
                    f.impact(), f.section(), sources));
        }

        for (Finding f : top) {
            if (used.add(f.id())) {
                actions.add(new ActionItem(f.title(), f.detail(), f.tip(), f.impact(), f.section(), List.of()));
            }
        }
        actions.sort((x, y) -> Double.compare(y.impact(), x.impact()));

        List<RewriteItem> rewrites = new ArrayList<>();
        for (JsonNode r : j.path("rewrites")) {
            int idx = r.path("bulletIndex").asInt(-1);
            if (idx < 0 || idx >= bullets.size()) {
                continue;
            }
            WeakBullet original = bullets.get(idx);
            String improved = r.path("improved").asText("").trim();
            if (isSafeRewrite(original.text(), improved) && rewrites.size() < 5) {
                rewrites.add(new RewriteItem(original.text(), improved, clip(r.path("reason").asText(""), 200), original.section()));
            }
        }

        String headline = clip(j.path("headline").asText(""), 120);
        String summary = clip(j.path("summary").asText(""), 420);
        if (headline.isBlank() || summary.isBlank()) {
            Narrative fallback = deterministic(ctx, top, new ArrayList<>());
            headline = headline.isBlank() ? fallback.headline() : headline;
            summary = summary.isBlank() ? fallback.summary() : summary;
        }

        return new Narrative(headline, summary, actions, rewrites, true, List.of());
    }

    private static String system() {
        return "You are a precise, professional resume reviewer for applicant tracking systems. "
                + "You write concise advice grounded only in the findings you are given. "
                + "You never invent experience, skills, employers, dates or numbers. Reply with one JSON object only.";
    }

    private String prompt(Context ctx, List<Finding> top, List<WeakBullet> bullets) throws Exception {
        ObjectNode in = mapper.createObjectNode();
        in.put("target", ctx.targetTitle() == null ? "" : ctx.targetTitle());
        in.put("scoringMode", ctx.mode());
        in.put("score", ctx.score());
        in.put("grade", ctx.grade());

        ArrayNode str = in.putArray("strengths");
        ctx.strengths().stream().limit(5).forEach(str::add);

        ArrayNode fs = in.putArray("findings");
        for (Finding f : top) {
            ObjectNode o = fs.addObject();
            o.put("findingId", f.id());
            o.put("problem", f.title());
            o.put("detail", f.detail());
            o.put("standardFix", f.tip());
        }

        ArrayNode bs = in.putArray("weakBullets");
        for (int i = 0; i < bullets.size(); i++) {
            ObjectNode o = bs.addObject();
            o.put("bulletIndex", i);
            o.put("text", bullets.get(i).text());
            ArrayNode problems = o.putArray("problems");
            if (bullets.get(i).noVerb()) {
                problems.add("does not start with a strong action verb");
            }
            if (bullets.get(i).noMetric()) {
                problems.add("has no number or measurable result");
            }
        }

        ArrayNode gs = in.putArray("atsGuidance");
        for (Guide g : ctx.guides()) {
            ObjectNode o = gs.addObject();
            o.put("id", g.id());
            o.put("title", g.title());
            o.put("guidance", g.text());
        }

        return "Write the advice for this resume review.\n"
                + "Return JSON: {\"headline\": string (max 14 words), \"summary\": string (2-3 sentences, plain and specific), "
                + "\"actions\": [{\"findingId\": string, \"why\": string (max 30 words), \"how\": string (max 45 words, concrete), "
                + "\"sources\": [string ids from atsGuidance that support this advice]}], "
                + "\"rewrites\": [{\"bulletIndex\": number, \"improved\": string, \"reason\": string (max 20 words)}]}\n"
                + "Rules:\n"
                + "- Use only the findingIds provided. Cite only ids that appear in atsGuidance.\n"
                + "- Rewrites must keep the same facts as the original bullet. Start with a strong action verb. "
                + "Do NOT add numbers, tools, employers or results that are not in the original. "
                + "If a metric would help, insert a bracketed placeholder such as [X%] or [N users] for the user to fill in.\n"
                + "- Do not mention the numeric score in actions. Do not change any impact numbers.\n"
                + "- Be direct and professional; no flattery.\n\n"
                + "INPUT:\n" + mapper.writeValueAsString(in);
    }

    static boolean isSafeRewrite(String original, String improved) {
        if (improved.isBlank() || improved.equalsIgnoreCase(original.trim()) || improved.length() > 320) {
            return false;
        }
        if (!QualityScorer.startsWithAction(improved)) {
            return false;
        }
        if (improved.matches("(?is).*\\b(i|my|me)\\b.*")) {
            return false;
        }

        String withoutPlaceholders = PLACEHOLDER.matcher(improved).replaceAll(" ");
        Set<String> originalNumbers = new HashSet<>();
        Matcher mo = NUMBER.matcher(original);
        while (mo.find()) {
            originalNumbers.add(mo.group());
        }
        Matcher mi = NUMBER.matcher(withoutPlaceholders);
        while (mi.find()) {
            if (!originalNumbers.contains(mi.group())) {
                return false;
            }
        }
        return true;
    }

    private Narrative deterministic(Context ctx, List<Finding> top, List<String> warnings) {
        List<ActionItem> actions = new ArrayList<>();
        for (Finding f : top) {
            actions.add(new ActionItem(f.title(), f.detail(), f.tip(), f.impact(), f.section(), guideIdsFor(ctx, f)));
        }

        String target = ctx.targetTitle() == null || ctx.targetTitle().isBlank() ? "general ATS readiness" : ctx.targetTitle();
        String headline = switch (ctx.grade()) {
            case "Excellent" -> "Strong, ATS-ready resume";
            case "Good" -> "Solid resume with a few high-impact fixes";
            case "Fair" -> "Decent foundation that needs targeted improvements";
            default -> "Key sections need work before you apply";
        };

        String summary = "Your resume scores " + ctx.score() + "/100 for " + target + ". "
                + (top.isEmpty() ? "No significant issues were found."
                : "The biggest gains come from: " + String.join("; ", top.stream().limit(3).map(Finding::title).toList()) + ".");

        return new Narrative(headline, summary, actions, List.of(), false, warnings);
    }

    private List<String> guideIdsFor(Context ctx, Finding f) {
        String query = f.title() + " " + f.tip();
        Guide best = null;
        double bestScore = 0;
        for (Guide g : ctx.guides()) {
            double s = TextMatcher.tokenOverlap(query, g.title() + " " + g.text());
            if (s > bestScore) {
                bestScore = s;
                best = g;
            }
        }
        return best != null && bestScore >= 0.2 ? List.of(best.id()) : List.of();
    }

    private static String clip(String s, int max) {
        String t = s == null ? "" : s.replaceAll("\\s+", " ").trim();
        return t.length() > max ? t.substring(0, max - 3) + "..." : t;
    }
}