package com.anusha.resume_builder.ats.analysis;

import com.anusha.resume_builder.ats.kb.KnowledgeBase;

import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

public final class TextMatcher {

    private static final Map<String, Pattern> PATTERNS = new ConcurrentHashMap<>();

    private static final Set<String> STOP_WORDS = Set.of(
            "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "have", "in", "is", "it",
            "of", "on", "or", "that", "the", "to", "with", "will", "you", "your", "our", "we", "their", "this",
            "using", "use", "used", "work", "working", "ability", "strong", "good", "knowledge", "experience",
            "skills", "skill", "etc", "including", "within", "across", "related", "such", "who", "can", "must");

    private TextMatcher() {
    }

    public static String normalize(String s) {
        if (s == null) {
            return "";
        }
        return s.toLowerCase(Locale.ROOT)
                .replace('\u2013', '-').replace('\u2014', '-').replace('\u2019', '\'')
                .replaceAll("\\s+", " ")
                .trim();
    }

    public static boolean containsTerm(String text, String term) {
        if (text == null || term == null) {
            return false;
        }
        String t = term.trim();
        if (t.isEmpty()) {
            return false;
        }

        if (isAmbiguousShortName(t)) {
            return matchAmbiguous(text, t);
        }

        Pattern p = PATTERNS.computeIfAbsent(t.toLowerCase(Locale.ROOT), key -> {
            String body = Pattern.quote(key);
            String plural = key.length() > 3 ? "(?:s)?" : "";
            return Pattern.compile("(?<![a-z0-9+#])" + body + plural + "(?![a-z0-9+#])");
        });

        return p.matcher(normalize(text)).find();
    }

    public static boolean containsAny(String text, Collection<String> spellings) {
        for (String s : spellings) {
            if (containsTerm(text, s)) {
                return true;
            }
        }
        return false;
    }

    private static boolean isAmbiguousShortName(String t) {
        String l = t.toLowerCase(Locale.ROOT);
        return l.equals("c") || l.equals("r") || l.equals("go");
    }

    private static boolean matchAmbiguous(String text, String term) {
        String canonical = term.equalsIgnoreCase("go") ? "Go" : term.toUpperCase(Locale.ROOT);
        Pattern p = PATTERNS.computeIfAbsent("amb:" + canonical, key -> Pattern.compile(
                "(?<![A-Za-z0-9+#.])" + Pattern.quote(canonical) + "(?![A-Za-z0-9+#&-])(?!\\s+to\\b)"));
        return p.matcher(text).find();
    }

    public static Set<String> findSkills(String text, KnowledgeBase kb) {
        Set<String> found = new LinkedHashSet<>();
        for (KnowledgeBase.SkillEntry s : kb.skills()) {
            if (containsAny(text, kb.spellingsOf(s.name()))) {
                found.add(s.name());
            }
        }
        return found;
    }

    public static Set<String> tokens(String text) {
        Set<String> out = new LinkedHashSet<>();
        for (String t : normalize(text).split("[^a-z0-9+#.]+")) {
            String clean = t.replaceAll("^\\.+|\\.+$", "");
            if (clean.length() > 1 && !STOP_WORDS.contains(clean)) {
                out.add(clean);
            }
        }
        return out;
    }

    public static double tokenOverlap(String requirement, String chunk) {
        Set<String> req = tokens(requirement);
        if (req.isEmpty()) {
            return 0;
        }
        Set<String> chunkTokens = tokens(chunk);
        int hit = 0;
        for (String t : req) {
            if (chunkTokens.contains(t)) {
                hit++;
            }
        }
        return (double) hit / req.size();
    }
}