package com.anusha.resume_builder.ats.kb;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * The curated knowledge the analyzer retrieves from: role profiles, ATS guidelines and a skills lexicon.
 * Loaded from {@code classpath:ats/*.json}; role profiles and guidelines are also embedded into the vector store.
 */
public class KnowledgeBase {

    public static final String KIND_ROLE = "role";
    public static final String KIND_GUIDE = "guide";

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record RoleProfile(String id, String title, List<String> aliases, String domain, String summary,
                              List<String> coreSkills, List<String> niceToHaveSkills,
                              List<String> responsibilities, List<String> keywords) {

        /** The text that gets embedded for retrieval. */
        public String toChunkText() {
            return title + " (" + domain + "). " + summary
                    + " Core skills: " + String.join(", ", coreSkills) + "."
                    + " Also valued: " + String.join(", ", niceToHaveSkills) + "."
                    + " Typical responsibilities: " + String.join("; ", responsibilities) + ".";
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Guideline(String id, String category, String title, String text, List<String> tags) {

        public String toChunkText() {
            return title + ". " + text;
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SkillEntry(String name, String category, List<String> aliases) {
    }

    /** A knowledge-base item ready to be embedded and stored. */
    public record KbChunk(String id, String kind, String title, String content) {
    }

    private final List<RoleProfile> roles;
    private final List<Guideline> guidelines;
    private final List<SkillEntry> skills;
    private final Map<String, SkillEntry> skillByAlias = new HashMap<>();

    public KnowledgeBase(List<RoleProfile> roles, List<Guideline> guidelines, List<SkillEntry> skills) {
        this.roles = roles;
        this.guidelines = guidelines;
        this.skills = skills;

        for (SkillEntry s : skills) {
            skillByAlias.put(norm(s.name()), s);
            if (s.aliases() != null) {
                for (String alias : s.aliases()) {
                    skillByAlias.putIfAbsent(norm(alias), s);
                }
            }
        }
    }

    /** Loads the three JSON files from the classpath ({@code /ats/...}). */
    public static KnowledgeBase loadFromClasspath() throws IOException {
        ObjectMapper mapper = new ObjectMapper();
        return new KnowledgeBase(
                read(mapper, "/ats/role-profiles.json", new TypeReference<List<RoleProfile>>() { }),
                read(mapper, "/ats/guidelines.json", new TypeReference<List<Guideline>>() { }),
                read(mapper, "/ats/skills-lexicon.json", new TypeReference<List<SkillEntry>>() { }));
    }

    private static <T> T read(ObjectMapper mapper, String path, TypeReference<T> type) throws IOException {
        try (InputStream in = KnowledgeBase.class.getResourceAsStream(path)) {
            if (in == null) {
                throw new IOException("Missing knowledge-base resource: " + path);
            }
            return mapper.readValue(in, type);
        }
    }

    public List<RoleProfile> roles() {
        return roles;
    }

    public List<Guideline> guidelines() {
        return guidelines;
    }

    public List<SkillEntry> skills() {
        return skills;
    }

    public Optional<RoleProfile> roleById(String id) {
        return roles.stream().filter(r -> r.id().equals(id)).findFirst();
    }

    public Optional<Guideline> guidelineById(String id) {
        return guidelines.stream().filter(g -> g.id().equals(id)).findFirst();
    }

    /** All role profiles and guidelines as embeddable chunks. Ids are prefixed with their kind. */
    public List<KbChunk> chunks() {
        List<KbChunk> out = new ArrayList<>();
        for (RoleProfile r : roles) {
            out.add(new KbChunk("role:" + r.id(), KIND_ROLE, r.title(), r.toChunkText()));
        }
        for (Guideline g : guidelines) {
            out.add(new KbChunk("guide:" + g.id(), KIND_GUIDE, g.title(), g.toChunkText()));
        }
        return out;
    }

    /** Resolves a free-text skill ("postgres", "ReactJS") to its canonical lexicon entry, if known. */
    public Optional<SkillEntry> canonicalSkill(String term) {
        return Optional.ofNullable(skillByAlias.get(norm(term)));
    }

    /** Every spelling of a skill that should count as a match: the name plus its aliases. */
    public Set<String> spellingsOf(String skillName) {
        Set<String> out = new LinkedHashSet<>();
        out.add(skillName);
        canonicalSkill(skillName).ifPresent(s -> {
            out.add(s.name());
            if (s.aliases() != null) {
                out.addAll(s.aliases());
            }
        });
        return out;
    }

    /**
     * Deterministic title lookup: exact title/alias first, then the best token overlap.
     * Returns the profile and a confidence in [0,1].
     */
    public Optional<Map.Entry<RoleProfile, Double>> findRoleByTitle(String rawTitle) {
        String title = norm(rawTitle);
        if (title.isBlank()) {
            return Optional.empty();
        }

        RoleProfile best = null;
        double bestScore = 0;

        for (RoleProfile r : roles) {
            List<String> names = new ArrayList<>();
            names.add(norm(r.title()));
            if (r.aliases() != null) {
                r.aliases().forEach(a -> names.add(norm(a)));
            }

            double score = 0;
            for (String name : names) {
                if (name.equals(title)) {
                    score = 1.0;
                    break;
                }
                score = Math.max(score, tokenOverlap(title, name));
                // Whole-word containment only: the alias "ba" must not match "backend".
                if (name.length() >= 3 && containsPhrase(title, name)) {
                    score = Math.max(score, 0.85);
                } else if (title.length() >= 3 && containsPhrase(name, title)) {
                    score = Math.max(score, 0.6);
                }
            }

            if (score > bestScore) {
                bestScore = score;
                best = r;
            }
        }

        return best == null ? Optional.empty() : Optional.of(Map.entry(best, bestScore));
    }

    /** True if {@code needle} appears in {@code haystack} as a whole word or phrase. */
    private static boolean containsPhrase(String haystack, String needle) {
        return java.util.regex.Pattern
                .compile("(?<![a-z0-9+#])" + java.util.regex.Pattern.quote(needle) + "(?![a-z0-9+#])")
                .matcher(haystack).find();
    }

    private static double tokenOverlap(String a, String b) {
        Set<String> ta = tokens(a);
        Set<String> tb = tokens(b);
        if (ta.isEmpty() || tb.isEmpty()) {
            return 0;
        }
        int common = 0;
        for (String t : ta) {
            if (tb.contains(t)) {
                common++;
            }
        }
        return (double) common / Math.max(ta.size(), tb.size());
    }

    private static Set<String> tokens(String s) {
        Set<String> out = new LinkedHashSet<>();
        for (String t : s.split("[^a-z0-9+#.]+")) {
            if (t.length() > 1 && !t.equals("and") && !t.equals("the") && !t.equals("of")) {
                out.add(t);
            }
        }
        return out;
    }

    static String norm(String s) {
        return s == null ? "" : s.toLowerCase(Locale.ROOT).trim().replaceAll("\\s+", " ");
    }
}