package com.anusha.resume_builder.ats.analysis;

import com.anusha.resume_builder.ats.analysis.Requirements.Mode;
import com.anusha.resume_builder.ats.analysis.Requirements.Requirement;
import com.anusha.resume_builder.ats.analysis.Requirements.RequirementSet;
import com.anusha.resume_builder.ats.analysis.Requirements.SourceRef;
import com.anusha.resume_builder.ats.analysis.Requirements.Type;
import com.anusha.resume_builder.ats.embedding.EmbeddingClient;
import com.anusha.resume_builder.ats.kb.KnowledgeBase;
import com.anusha.resume_builder.ats.kb.KnowledgeBase.RoleProfile;
import com.anusha.resume_builder.ats.llm.LlmClient;
import com.anusha.resume_builder.ats.vector.VectorStore;
import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.BooleanSupplier;

public class RequirementExtractor {

    private static final Logger log = LoggerFactory.getLogger(RequirementExtractor.class);

    private static final int MAX_REQUIRED_SKILLS = 25;
    private static final int MAX_PREFERRED_SKILLS = 15;
    private static final int MAX_RESPONSIBILITIES = 10;
    private static final int MAX_QUALIFICATIONS = 6;

    private static final String SYSTEM = "You extract structured hiring requirements. Reply with one JSON object only. "
            + "Never invent requirements that are not supported by the input.";

    private final KnowledgeBase kb;
    private final EmbeddingClient embedder;
    private final VectorStore store;
    private final LlmClient llm;
    private final BooleanSupplier kbReady;
    private final double roleMinSimilarity;

    public RequirementExtractor(KnowledgeBase kb, EmbeddingClient embedder, VectorStore store, LlmClient llm,
                                BooleanSupplier kbReady, double roleMinSimilarity) {
        this.kb = kb;
        this.embedder = embedder;
        this.store = store;
        this.llm = llm;
        this.kbReady = kbReady;
        this.roleMinSimilarity = roleMinSimilarity;
    }

    public RequirementSet fromJobDescription(String jd, String titleHint) {
        List<String> warnings = new ArrayList<>();
        Draft draft = null;

        if (llm.isAvailable()) {
            try {
                draft = parseDraft(llm.generateJson(SYSTEM, jdPrompt(jd)), jd, true);
            } catch (Exception ex) {
                log.warn("JD extraction via LLM failed: {}", ex.getMessage());
                warnings.add("AI extraction of the job description was unavailable, so a keyword-based reader was used.");
            }
        }

        if (draft == null || draft.size() < 3) {
            Draft heuristic = heuristic(jd);
            draft = draft == null ? heuristic : draft.mergeWith(heuristic);
        }

        String title = firstNonBlank(titleHint, draft.title);
        String domain = draft.domain;
        if ((domain == null || domain.isBlank()) && !title.isBlank()) {
            domain = kb.findRoleByTitle(title).filter(e -> e.getValue() >= 0.5).map(e -> e.getKey().domain()).orElse(null);
        }

        List<Requirement> items = toItems(draft);
        if (items.isEmpty()) {
            warnings.add("No clear requirements were found in the job description, so only resume quality was scored.");
            return RequirementSet.qualityOnly(title, "The pasted job description had no recognizable requirements.", warnings);
        }

        return new RequirementSet(Mode.JOB_DESCRIPTION, title, domain, "Your pasted job description",
                1.0, false, items, List.of(), warnings);
    }

    private static String jdPrompt(String jd) {
        return "Extract the hiring requirements from this job description.\n"
                + "Return JSON: {\"jobTitle\": string, \"domain\": string, \"requiredSkills\": [string], "
                + "\"preferredSkills\": [string], \"responsibilities\": [string], \"qualifications\": [string]}.\n"
                + "Rules:\n"
                + "- Skills are short technology/tool/method names exactly as written (e.g. \"Spring Boot\", \"CI/CD\").\n"
                + "- requiredSkills: stated as required or clearly core. preferredSkills: nice to have, bonus, preferred.\n"
                + "- responsibilities: up to 8 short duties, each under 25 words, paraphrased from the text.\n"
                + "- qualifications: degrees, years of experience, certifications (up to 5).\n"
                + "- Only include items present in the text. Do not add typical skills for the role.\n\n"
                + "JOB DESCRIPTION:\n\"\"\"\n" + jd + "\n\"\"\"";
    }

    public RequirementSet fromRoleTitle(String title) {
        List<String> warnings = new ArrayList<>();
        RoleProfile profile = null;
        double confidence = 0;
        String via = "";
        double relevance = 0;

        Optional<Map.Entry<RoleProfile, Double>> lexical = kb.findRoleByTitle(title);

        if (lexical.isPresent() && lexical.get().getValue() >= 0.85) {
            profile = lexical.get().getKey();
            confidence = lexical.get().getValue();
            relevance = confidence;
            via = "title match";
        }

        if (profile == null && embedder.isAvailable() && kbReady.getAsBoolean()) {
            try {
                float[] q = embedder.embed(List.of(title + " job role"), EmbeddingClient.Task.QUERY).get(0);
                List<VectorStore.ScoredChunk> hits = store.search(q, KnowledgeBase.KIND_ROLE, 3);
                if (!hits.isEmpty() && hits.get(0).similarity() >= roleMinSimilarity) {
                    String id = hits.get(0).id().replaceFirst("^role:", "");
                    profile = kb.roleById(id).orElse(null);
                    confidence = hits.get(0).similarity();
                    relevance = confidence;
                    via = "semantic retrieval from the " + store.name() + " knowledge base";
                }
            } catch (Exception ex) {
                log.warn("Role retrieval failed: {}", ex.getMessage());
                warnings.add("Semantic role lookup was unavailable; the role was matched by title only.");
            }
        }

        if (profile == null && lexical.isPresent() && lexical.get().getValue() >= 0.5) {
            profile = lexical.get().getKey();
            confidence = lexical.get().getValue();
            relevance = confidence;
            via = "closest title match";
        }

        if (profile != null) {
            return fromProfile(profile, title, via, confidence, relevance, warnings);
        }

        if (llm.isAvailable() && !title.isBlank()) {
            try {
                Draft d = parseDraft(llm.generateJson(SYSTEM, rolePrompt(title)), title, false);
                List<Requirement> items = toItems(d);
                if (!items.isEmpty()) {
                    warnings.add("\"" + title + "\" is not in the role knowledge base, so typical requirements were inferred by AI. Paste a job description for a precise match.");
                    return new RequirementSet(Mode.ROLE_PROFILE, title, d.domain, "AI-inferred typical requirements for \"" + title + "\"",
                            0.5, true, items, List.of(), warnings);
                }
            } catch (Exception ex) {
                log.warn("Role synthesis via LLM failed: {}", ex.getMessage());
            }
        }

        warnings.add(title.isBlank()
                ? "No job title or description was provided, so only resume quality was scored."
                : "\"" + title + "\" was not recognized, so only resume quality was scored. Paste a job description for a job-specific score.");
        return RequirementSet.qualityOnly(title, "No matching role profile was found.", warnings);
    }

    private RequirementSet fromProfile(RoleProfile p, String requestedTitle, String via, double confidence,
                                       double relevance, List<String> warnings) {
        List<Requirement> items = new ArrayList<>();
        int id = 0;
        for (String s : p.coreSkills()) {
            items.add(new Requirement(id++, canonical(s), Type.SKILL, true, canonical(s)));
        }
        for (String s : p.niceToHaveSkills()) {
            items.add(new Requirement(id++, canonical(s), Type.SKILL, false, canonical(s)));
        }
        for (String r : p.responsibilities()) {
            items.add(new Requirement(id++, r, Type.RESPONSIBILITY, true, null));
        }

        String note = "Role knowledge base: " + p.title() + " (" + via + ")";
        return new RequirementSet(Mode.ROLE_PROFILE, requestedTitle.isBlank() ? p.title() : requestedTitle, p.domain(),
                note, Math.min(1.0, confidence), false, items,
                List.of(new SourceRef("role:" + p.id(), KnowledgeBase.KIND_ROLE, p.title(), relevance)), warnings);
    }

    private static String rolePrompt(String title) {
        return "List the typical hiring requirements for the job title \"" + title + "\".\n"
                + "Return JSON: {\"jobTitle\": string, \"domain\": string, \"requiredSkills\": [string], "
                + "\"preferredSkills\": [string], \"responsibilities\": [string], \"qualifications\": []}.\n"
                + "Use 6-10 required skills, 4-8 preferred skills and 5-6 short responsibilities (under 25 words each). "
                + "Skills are short tool/technology names. Be conservative and mainstream.";
    }

    private static final class Draft {
        String title = "";
        String domain = "";
        final Set<String> required = new LinkedHashSet<>();
        final Set<String> preferred = new LinkedHashSet<>();
        final List<String> responsibilities = new ArrayList<>();
        final List<String> qualifications = new ArrayList<>();

        int size() {
            return required.size() + preferred.size() + responsibilities.size() + qualifications.size();
        }

        Draft mergeWith(Draft other) {
            if (title.isBlank()) {
                title = other.title;
            }
            if (domain.isBlank()) {
                domain = other.domain;
            }
            required.addAll(other.required);
            preferred.addAll(other.preferred);
            for (String r : other.responsibilities) {
                if (!responsibilities.contains(r)) {
                    responsibilities.add(r);
                }
            }
            for (String q : other.qualifications) {
                if (!qualifications.contains(q)) {
                    qualifications.add(q);
                }
            }
            return this;
        }
    }

    private Draft parseDraft(JsonNode j, String source, boolean validateAgainstSource) {
        Draft d = new Draft();
        d.title = j.path("jobTitle").asText("").trim();
        d.domain = j.path("domain").asText("").trim();

        for (JsonNode s : j.path("requiredSkills")) {
            addSkill(d.required, s.asText(""), source, validateAgainstSource);
        }
        for (JsonNode s : j.path("preferredSkills")) {
            addSkill(d.preferred, s.asText(""), source, validateAgainstSource);
        }
        d.preferred.removeAll(d.required);

        for (JsonNode r : j.path("responsibilities")) {
            String t = clean(r.asText(""));
            if (isUsableSentence(t) && d.responsibilities.size() < MAX_RESPONSIBILITIES) {
                d.responsibilities.add(t);
            }
        }
        for (JsonNode q : j.path("qualifications")) {
            String t = clean(q.asText(""));
            if (isUsableSentence(t) && d.qualifications.size() < MAX_QUALIFICATIONS) {
                d.qualifications.add(t);
            }
        }
        return d;
    }

    private void addSkill(Set<String> target, String raw, String source, boolean validate) {
        String term = raw == null ? "" : raw.trim();
        if (term.isEmpty() || term.length() > 40) {
            return;
        }
        String name = canonical(term);

        if (validate) {
            Set<String> spellings = new LinkedHashSet<>(kb.spellingsOf(name));
            spellings.add(term);
            if (!TextMatcher.containsAny(source, spellings)) {
                return;
            }
        }

        if (target.size() < MAX_REQUIRED_SKILLS) {
            target.add(name);
        }
    }

    private String canonical(String term) {
        return kb.canonicalSkill(term).map(KnowledgeBase.SkillEntry::name).orElse(term.trim());
    }

    private List<Requirement> toItems(Draft d) {
        List<Requirement> items = new ArrayList<>();
        int id = 0;
        Set<String> seen = new LinkedHashSet<>();

        for (String s : d.required) {
            if (seen.add(s.toLowerCase(Locale.ROOT))) {
                items.add(new Requirement(id++, s, Type.SKILL, true, s));
            }
        }
        int preferredCount = 0;
        for (String s : d.preferred) {
            if (preferredCount < MAX_PREFERRED_SKILLS && seen.add(s.toLowerCase(Locale.ROOT))) {
                items.add(new Requirement(id++, s, Type.SKILL, false, s));
                preferredCount++;
            }
        }
        for (String r : d.responsibilities) {
            items.add(new Requirement(id++, r, Type.RESPONSIBILITY, true, null));
        }
        for (String q : d.qualifications) {
            items.add(new Requirement(id++, q, Type.QUALIFICATION, true, null));
        }
        return items;
    }

    private Draft heuristic(String jd) {
        Draft d = new Draft();
        String[] lines = jd.split("\\r?\\n");
        boolean inPreferred = false;
        boolean inResponsibilities = false;
        boolean inQualifications = false;
        StringBuilder requiredText = new StringBuilder();
        StringBuilder preferredText = new StringBuilder();

        for (String raw : lines) {
            String line = raw.trim();
            if (line.isEmpty()) {
                continue;
            }
            String lower = line.toLowerCase(Locale.ROOT);
            boolean heading = line.length() < 60 && (line.endsWith(":") || line.equals(line.toUpperCase(Locale.ROOT)) || lower.matches("^[a-z ']+$"));

            if (heading || lower.length() < 70) {
                if (lower.matches(".*(preferred|nice to have|good to have|bonus|plus|desirable).*")) {
                    inPreferred = true;
                    inResponsibilities = false;
                    inQualifications = false;
                } else if (lower.matches(".*(responsibilit|what you.?ll do|duties|role overview|you will).*")) {
                    inResponsibilities = true;
                    inPreferred = false;
                    inQualifications = false;
                } else if (lower.matches(".*(requirement|qualification|must have|what we.?re looking|skills|who you are|eligibility).*")) {
                    inPreferred = false;
                    inResponsibilities = false;
                    inQualifications = lower.contains("qualification") || lower.contains("eligibility");
                }
            }

            boolean preferredLine = inPreferred || lower.matches(".*\\b(preferred|nice to have|good to have|bonus|a plus)\\b.*");
            (preferredLine ? preferredText : requiredText).append(line).append('\n');

            String bullet = clean(line.replaceFirst("^[\\s\u2022*\\-\u2013\u25AA>\\d.)]+", ""));
            int w = bullet.split("\\s+").length;
            boolean looksLikeItem = raw.trim().matches("^[\u2022*\\-\u2013\u25AA>].*") || raw.trim().matches("^\\d+[.)].*");
            if (looksLikeItem && w >= 5 && w <= 40) {
                if (inResponsibilities && d.responsibilities.size() < MAX_RESPONSIBILITIES) {
                    d.responsibilities.add(bullet);
                } else if (inQualifications && d.qualifications.size() < MAX_QUALIFICATIONS) {
                    d.qualifications.add(bullet);
                } else if (!inPreferred && !inResponsibilities && lower.matches(".*(degree|bachelor|master|b\\.?tech|b\\.?e\\b|years? of experience|certif).*")
                        && d.qualifications.size() < MAX_QUALIFICATIONS) {
                    d.qualifications.add(bullet);
                }
            }

            if (d.title.isBlank() && d.size() == 0 && w <= 8 && line.length() < 70 && !heading) {
                d.title = line;
            }
        }

        for (String s : TextMatcher.findSkills(requiredText.toString(), kb)) {
            if (d.required.size() < MAX_REQUIRED_SKILLS) {
                d.required.add(s);
            }
        }
        for (String s : TextMatcher.findSkills(preferredText.toString(), kb)) {
            if (!d.required.contains(s) && d.preferred.size() < MAX_PREFERRED_SKILLS) {
                d.preferred.add(s);
            }
        }

        return d;
    }

    private static boolean isUsableSentence(String t) {
        if (t.isBlank()) {
            return false;
        }
        int w = t.split("\\s+").length;
        return w >= 3 && w <= 45;
    }

    private static String clean(String s) {
        String t = s == null ? "" : s.replaceAll("\\s+", " ").trim();
        return t.length() > 220 ? t.substring(0, 217) + "..." : t;
    }

    private static String firstNonBlank(String a, String b) {
        return a != null && !a.isBlank() ? a.trim() : b == null ? "" : b.trim();
    }
}