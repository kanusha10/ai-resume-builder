package com.anusha.resume_builder.ats.analysis;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

public final class QualityScorer {

    public static final String STRUCTURE = "structure";
    public static final String IMPACT = "impact";
    public static final String FORMATTING = "formatting";
    public static final String TARGETING = "targeting";

    private static final Set<String> ACTION_VERBS = Set.copyOf(new java.util.LinkedHashSet<>(java.util.Arrays.asList(
            "achieved", "accelerated", "administered", "analyzed", "analysed", "architected", "authored",
            "automated", "built", "collaborated", "configured", "consolidated", "constructed", "contributed",
            "coordinated", "created", "customized", "debugged", "decreased", "delivered", "deployed",
            "designed", "developed", "directed", "documented", "drove", "eliminated", "enhanced",
            "engineered", "established", "evaluated", "executed", "expanded", "facilitated", "implemented",
            "improved", "increased", "initiated", "integrated", "introduced", "launched", "led",
            "leveraged", "maintained", "managed", "migrated", "mentored", "modernized", "monitored",
            "optimized", "orchestrated", "organized", "owned", "partnered", "performed", "pioneered",
            "planned", "presented", "produced", "programmed", "proposed", "published", "reduced",
            "refactored", "released", "replaced", "resolved", "restructured", "reviewed", "ran",
            "scaled", "secured", "simplified", "solved", "spearheaded", "standardized", "streamlined",
            "strengthened", "supervised", "tested", "trained", "transformed", "troubleshot", "upgraded",
            "utilized", "validated", "wrote", "won", "taught", "drafted", "converted",
            "generated", "applied", "adapted", "unified", "negotiated", "recruited", "closed",
            "generated", "reconciled", "prepared", "processed", "audited")));

    private static final List<String> WEAK_OPENERS = List.of(
            "responsible for", "worked on", "worked with", "helped", "assisted", "involved in",
            "participated in", "duties included", "tasked with");

    private static final Set<String> TITLE_STOP = Set.of(
            "with", "and", "the", "for", "intern", "senior", "junior", "lead", "associate", "engineer",
            "developer", "specialist", "executive", "analyst", "manager");

    private static final Pattern DATE_OK = Pattern.compile(
            "^(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?\\s+)?\\d{4}$"
                    + "|^\\d{1,2}[/-]\\d{4}$|^(?:present|current|ongoing|till date|now)$|^expected\\s+.*\\d{4}$",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private static final Pattern FIRST_PERSON = Pattern.compile("\\b(i|my|me|myself|i'm|i've)\\b", Pattern.CASE_INSENSITIVE);
    private static final Pattern EMOJI_OR_SYMBOL = Pattern.compile(
            "[\\x{1F300}-\\x{1FAFF}\\x{2600}-\\x{27BF}\\x{2B00}-\\x{2BFF}\\x{1F000}-\\x{1F2FF}]");

    public record Check(String key, String category, String label, double max, double points, String status,
                        String detail, String tip, String section) {
        public double lost() {
            return max - points;
        }
    }

    public record WeakBullet(String text, String section, String label, boolean noVerb, boolean noMetric) {
    }

    public record Stats(int bullets, int actionVerbPercent, int quantifiedPercent, int words, int skills) {
    }

    public record Report(List<Check> checks, List<WeakBullet> weakBullets, Stats stats) {

        public double ratio(String category) {
            double max = 0;
            double pts = 0;
            for (Check c : checks) {
                if (c.category().equals(category)) {
                    max += c.max();
                    pts += c.points();
                }
            }
            return max == 0 ? 0 : pts / max;
        }

        public boolean has(String category) {
            return checks.stream().anyMatch(c -> c.category().equals(category));
        }

        public double maxOf(String category) {
            return checks.stream().filter(c -> c.category().equals(category)).mapToDouble(Check::max).sum();
        }
    }

    private final List<Check> checks = new ArrayList<>();

    private QualityScorer() {
    }

    public static Report analyze(ResumeModel r, String targetTitle) {
        QualityScorer q = new QualityScorer();
        return q.run(r, targetTitle == null ? "" : targetTitle.trim());
    }

    private Report run(ResumeModel r, String targetTitle) {
        List<String> workBullets = r.workBullets();
        List<String> projectBullets = r.projectBullets();
        List<String> allBullets = r.allBullets();
        List<String> impactBullets = workBullets.isEmpty() ? projectBullets : workBullets;
        boolean usingProjects = workBullets.isEmpty() && !projectBullets.isEmpty();
        String impactSection = usingProjects ? "projects" : (r.experience.isEmpty() && !r.internships.isEmpty() ? "internships" : "experience");

        structure(r);
        impact(r, impactBullets, usingProjects, impactSection);
        formatting(r, allBullets, impactSection);
        if (!targetTitle.isBlank()) {
            targeting(r, targetTitle);
        }

        double verbShare = share(impactBullets, QualityScorer::startsWithAction);
        double metricShare = share(impactBullets, b -> b.matches(".*\\d.*"));

        List<WeakBullet> weak = new ArrayList<>();
        collectWeak(weak, r.experience, "experience");
        collectWeak(weak, r.internships, "internships");
        collectWeak(weak, r.projects, "projects");
        weak.sort(Comparator.comparingInt((WeakBullet w) -> (w.noVerb() ? 1 : 0) + (w.noMetric() ? 1 : 0)).reversed());

        Stats stats = new Stats(allBullets.size(), (int) Math.round(verbShare * 100),
                (int) Math.round(metricShare * 100), r.wordCount(), r.allSkills().size());

        return new Report(checks, weak.size() > 8 ? new ArrayList<>(weak.subList(0, 8)) : weak, stats);
    }

    private void structure(ResumeModel r) {
        add(STRUCTURE, "name", "Full name", 3, r.fullName.length() >= 3 ? 1 : 0,
                "Your name is present.", "No full name found.", "Add your full name exactly as it appears on your documents.", "personal");

        add(STRUCTURE, "email", "Email address", 4, EMAIL.matcher(r.email).matches() ? 1 : r.email.isBlank() ? 0 : 0.4,
                "A valid email address is listed.", r.email.isBlank() ? "No email address found." : "The email address looks invalid.",
                "Use a professional email (name@domain.com). ATS parsers use it as your unique ID.", "personal");

        int digits = r.phone.replaceAll("\\D", "").length();
        add(STRUCTURE, "phone", "Phone number", 3, digits >= 10 ? 1 : digits > 0 ? 0.5 : 0,
                "A complete phone number is listed.", digits > 0 ? "The phone number looks incomplete." : "No phone number found.",
                "Add a phone number with country code, for example +91 98765 43210.", "personal");

        add(STRUCTURE, "location", "Location", 2, r.location.isBlank() ? 0 : 1,
                "Your city or region is listed.", "No location found.",
                "Add your city and state. Many ATS filters search by location.", "personal");

        add(STRUCTURE, "links", "Professional links", 3,
                (!r.linkedin.isBlank() || !r.github.isBlank() || !r.website.isBlank()) ? 1 : 0,
                "A professional profile link is included.", "No LinkedIn, GitHub or portfolio link found.",
                "Add your LinkedIn and, for technical roles, a GitHub profile.", "personal");

        int summaryWords = words(r.summary);
        add(STRUCTURE, "summary", "Professional summary", 4, summaryWords > 0 ? 1 : 0,
                "A professional summary is present.", "No professional summary found.",
                "Add a 3-4 line summary of your target role, strongest skills and one concrete outcome.", "summary");

        double lenRatio = summaryWords >= 30 && summaryWords <= 90 ? 1
                : (summaryWords >= 15 && summaryWords < 30) || (summaryWords > 90 && summaryWords <= 130) ? 0.6
                : summaryWords > 0 ? 0.3 : 0;
        add(STRUCTURE, "summary-length", "Summary length", 3, lenRatio,
                "Your summary is " + summaryWords + " words, a good length.",
                summaryWords == 0 ? "There is no summary to measure."
                        : summaryWords < 30 ? "Your summary is only " + summaryWords + " words." : "Your summary is " + summaryWords + " words, which is long.",
                "Aim for 30-90 words: enough to show your focus, short enough to scan in seconds.", "summary");

        add(STRUCTURE, "skills", "Skills section", 5, r.allSkills().isEmpty() ? 0 : 1,
                "A skills section is present.", "No skills found.",
                "Add your technical skills. ATS keyword filters read this section first.", "skills");

        int groups = r.skillGroups.size();
        add(STRUCTURE, "skills-groups", "Skill categories", 3, groups >= 2 ? 1 : groups == 1 ? 0.5 : 0,
                "Skills are grouped into " + groups + " categories.",
                groups == 1 ? "All skills sit in a single category." : "No skill categories found.",
                "Group skills, for example Languages, Frameworks, Databases and Tools.", "skills");

        add(STRUCTURE, "education", "Education section", 4, r.education.isEmpty() ? 0 : 1,
                "Education is listed.", "No education found.", "Add your highest qualification first.", "education");

        double eduComplete = share(r.education, e -> !e.institution().isBlank()
                && (!e.degree().isBlank() || !e.level().isBlank()) && (!e.end().isBlank() || !e.start().isBlank()));
        add(STRUCTURE, "education-complete", "Degree, school and dates", 3, eduComplete,
                "Every education entry has a degree, institution and dates.",
                r.education.isEmpty() ? "There are no entries to check." : "Some education entries are missing a degree, institution or dates.",
                "Complete the degree name, institution and years for each entry.", "education");

        add(STRUCTURE, "grade", "GPA / grade", 2, r.education.stream().anyMatch(e -> !e.grade().isBlank()) ? 1 : 0,
                "A grade or CGPA is listed.", r.education.isEmpty() ? "There are no entries to check." : "No grade or CGPA found.",
                "Add your CGPA or percentage, especially within three years of graduating.", "education");

        double exp = !r.experience.isEmpty() ? 1 : !r.internships.isEmpty() ? 0.8 : r.projects.size() >= 2 ? 0.5 : 0;
        add(STRUCTURE, "experience", "Work experience or internships", 6, exp,
                "Relevant experience is listed.",
                r.projects.size() >= 2 ? "No work experience or internships; projects carry the profile." : "No work experience, internships or projects found.",
                "Add internships, freelance work or substantial projects with action-led bullets.",
                r.internships.isEmpty() && r.experience.isEmpty() ? "experience" : "internships");

        add(STRUCTURE, "extras", "Certifications or achievements", 2,
                (!r.certifications.isEmpty() || !r.achievements.isEmpty()) ? 1 : 0,
                "Certifications or achievements are listed.", "No certifications or achievements found.",
                "Add relevant certifications, awards or hackathon results with issuer and year.", "certifications");
    }

    private void impact(ResumeModel r, List<String> bullets, boolean usingProjects, String section) {
        String basis = usingProjects ? " (based on your projects)" : "";

        add(IMPACT, "bullet-count", "Enough bullet points", 5, Math.min(1.0, bullets.size() / 6.0),
                bullets.size() + " bullet points found" + basis + ".",
                bullets.isEmpty() ? "There are no bullet points to evaluate." : "Only " + bullets.size() + " bullet points found" + basis + ".",
                "Write 3-5 bullets per role or project; one achievement per line.", section);

        List<ResumeModel.Entry> entries = usingProjects ? r.projects : r.workEntries();
        add(IMPACT, "bullets-per-entry", "Bullets on every entry", 4, share(entries, e -> e.bullets().size() >= 2),
                "Each entry has at least two bullet points.",
                entries.isEmpty() ? "There are no entries to check." : "Some entries have fewer than two bullet points.",
                "Give every role and project at least two bullets.", section);

        double verbs = share(bullets, QualityScorer::startsWithAction);
        add(IMPACT, "action-verbs", "Action verbs", 8, verbs,
                Math.round(verbs * 100) + "% of bullets open with an action verb" + basis + ".",
                bullets.isEmpty() ? "There are no bullets to check." : "Only " + Math.round(verbs * 100) + "% of bullets open with an action verb" + basis + ".",
                "Start each bullet with a strong verb such as Built, Reduced or Led. Avoid 'Responsible for' and 'Worked on'.", section);

        double metrics = share(bullets, b -> b.matches(".*\\d.*"));
        add(IMPACT, "metrics", "Quantified results", 8, Math.min(1.0, metrics / 0.4),
                Math.round(metrics * 100) + "% of bullets include a number or metric" + basis + ".",
                bullets.isEmpty() ? "There are no bullets to check." : "Only " + Math.round(metrics * 100) + "% of bullets include a number or metric" + basis + ".",
                "Add numbers: users served, % improvement, time saved, team size or data volume.", section);

        double weak = share(bullets, b -> !startsWithWeak(b));
        add(IMPACT, "weak-openers", "No weak openers", 3, bullets.isEmpty() ? 0 : weak,
                "No bullets start with a weak phrase.",
                bullets.isEmpty() ? "There are no bullets to check." : "Some bullets start with phrases like 'Responsible for' or 'Worked on'.",
                "Replace weak openers with what you actually did and achieved.", section);
    }

    private void formatting(ResumeModel r, List<String> bullets, String section) {
        double len = share(bullets, b -> {
            int w = words(b);
            return w >= 5 && w <= 30;
        });
        add(FORMATTING, "bullet-length", "Bullet length", 4, len,
                "Your bullets are a scannable length (5-30 words).",
                bullets.isEmpty() ? "There are no bullets to check." : "Some bullets are too short or too long.",
                "Keep each bullet to one or two lines, roughly 10-25 words.", section);

        double fp = share(bullets, b -> FIRST_PERSON.matcher(b).find());
        add(FORMATTING, "first-person", "No first-person phrasing", 2, bullets.isEmpty() ? 0 : 1 - Math.min(1, fp * 3),
                "Bullets avoid first-person pronouns.",
                bullets.isEmpty() ? "There are no bullets to check." : "Some bullets use I, me or my.",
                "Drop the pronoun: write 'Built a REST API...' instead of 'I built a REST API...'.", section);

        List<String> dates = new ArrayList<>();
        int entries = 0;
        for (ResumeModel.Entry e : r.workEntries()) {
            entries++;
            dates.add(e.start());
            dates.add(e.end());
        }
        for (ResumeModel.Education e : r.education) {
            entries++;
            dates.add(e.start());
            dates.add(e.end());
        }
        long ok = dates.stream().filter(d -> !d.isBlank() && DATE_OK.matcher(d.trim()).matches()).count();
        long nonBlank = dates.stream().filter(d -> !d.isBlank()).count();
        double dateRatio = entries == 0 ? 0 : (nonBlank == 0 ? 0 : (double) ok / nonBlank) * Math.min(1.0, nonBlank / (entries * 1.5));
        add(FORMATTING, "dates", "Clear, consistent dates", 3, dateRatio,
                "Dates are present and in a consistent, parseable format.",
                entries == 0 ? "There are no dated entries to check." : "Some dates are missing or not in a standard format (for example Aug 2024 - Present).",
                "Use one format such as 'Aug 2024' and 'Present' on every role and degree.", r.workEntries().isEmpty() ? "education" : "experience");

        int totalWords = r.wordCount();
        double density = totalWords >= 250 && totalWords <= 900 ? 1
                : (totalWords >= 150 && totalWords < 250) || (totalWords > 900 && totalWords <= 1200) ? 0.6
                : totalWords > 0 ? 0.3 : 0;
        add(FORMATTING, "length", "Resume length", 3, density,
                "About " + totalWords + " words, which suits a one or two page resume.",
                totalWords == 0 ? "The resume is empty." : totalWords < 250 ? "About " + totalWords + " words; the resume looks thin."
                        : "About " + totalWords + " words; the resume may run past two pages.",
                "Target roughly 300-700 words. Add detail if thin; trim older roles if long.", "experience");

        boolean symbols = EMOJI_OR_SYMBOL.matcher(r.fullText()).find();
        add(FORMATTING, "symbols", "Plain, parseable characters", 2, symbols ? 0 : 1,
                "No emoji or decorative symbols found.", "Emoji or decorative symbols found; ATS parsers can misread them.",
                "Use plain text and standard bullet points.", "summary");

        long caps = bullets.stream().filter(b -> b.length() > 12 && b.equals(b.toUpperCase(Locale.ROOT)) && b.matches(".*[A-Z].*")).count();
        add(FORMATTING, "all-caps", "No all-caps text blocks", 1, caps == 0 ? 1 : 0,
                "No bullets are written in all capitals.", "Some bullets are written entirely in capital letters.",
                "Use normal sentence case for bullets.", section);

        long distinct = bullets.stream().map(b -> b.toLowerCase(Locale.ROOT).trim()).distinct().count();
        add(FORMATTING, "duplicates", "No repeated bullets", 1, bullets.isEmpty() ? 0 : (distinct == bullets.size() ? 1 : 0),
                "Every bullet is unique.", bullets.isEmpty() ? "There are no bullets to check." : "Some bullets are repeated word for word.",
                "Remove duplicates or merge them into one stronger bullet.", section);
    }

    private void targeting(ResumeModel r, String targetTitle) {
        Set<String> tokens = significantTitleTokens(targetTitle);

        add(TARGETING, "headline", "Professional headline", 3, r.role.isBlank() ? 0 : 1,
                "A headline appears under your name.", "No headline (target role) is set.",
                "Set your target role in the editor so it appears under your name.", "personal");

        double inSummary = tokenHit(tokens, r.summary);
        add(TARGETING, "title-in-summary", "Target role in summary", 4, r.summary.isBlank() ? 0 : inSummary,
                "Your summary reflects the target role.",
                r.summary.isBlank() ? "There is no summary to check." : "Your summary doesn't mention the target role \"" + targetTitle + "\".",
                "Use the job title or its key terms in the first sentence of your summary.", "summary");

        StringBuilder titles = new StringBuilder(r.role).append(' ');
        r.workEntries().forEach(e -> titles.append(e.title()).append(' '));
        r.projects.forEach(e -> titles.append(e.title()).append(' ').append(e.tech()).append(' '));
        double inTitles = tokenHit(tokens, titles.toString());
        add(TARGETING, "title-in-experience", "Role titles align with target", 3, inTitles,
                "Your role titles and projects align with the target role.",
                "Your role titles and projects don't clearly relate to \"" + targetTitle + "\".",
                "Where truthful, phrase titles and project names in the target role's vocabulary.", "experience");
    }

    private static Set<String> significantTitleTokens(String title) {
        Set<String> t = TextMatcher.tokens(title);
        Set<String> filtered = new java.util.LinkedHashSet<>();
        for (String x : t) {
            if (x.length() > 2 && !TITLE_STOP.contains(x)) {
                filtered.add(x);
            }
        }
        return filtered.isEmpty() ? t : filtered;
    }

    private static double tokenHit(Set<String> tokens, String text) {
        if (tokens.isEmpty() || text == null || text.isBlank()) {
            return 0;
        }
        int hit = 0;
        for (String t : tokens) {
            if (TextMatcher.containsTerm(text, t)) {
                hit++;
            }
        }
        return (double) hit / tokens.size();
    }

    private void collectWeak(List<WeakBullet> out, List<ResumeModel.Entry> entries, String section) {
        for (ResumeModel.Entry e : entries) {
            for (String b : e.bullets()) {
                boolean noVerb = !startsWithAction(b);
                boolean noMetric = !b.matches(".*\\d.*");
                if (noVerb || noMetric) {
                    out.add(new WeakBullet(b, section, e.label().isBlank() ? e.title() : e.label(), noVerb, noMetric));
                }
            }
        }
    }

    static boolean startsWithAction(String bullet) {
        String lower = bullet.toLowerCase(Locale.ROOT).trim();
        if (startsWithWeak(lower)) {
            return false;
        }
        String first = lower.split("\\s+")[0].replaceAll("[^a-z]", "");
        if (first.isEmpty()) {
            return false;
        }
        return ACTION_VERBS.contains(first) || (first.length() > 3 && first.endsWith("ed"));
    }

    static boolean startsWithWeak(String bullet) {
        String lower = bullet.toLowerCase(Locale.ROOT).trim();
        return WEAK_OPENERS.stream().anyMatch(lower::startsWith);
    }

    private static int words(String s) {
        return s == null || s.isBlank() ? 0 : s.trim().split("\\s+").length;
    }

    private static <T> double share(List<T> items, java.util.function.Predicate<T> p) {
        if (items.isEmpty()) {
            return 0;
        }
        long n = items.stream().filter(p).count();
        return (double) n / items.size();
    }

    private void add(String category, String key, String label, double max, double ratio,
                     String pass, String fail, String tip, String section) {
        double r = Math.max(0, Math.min(1, ratio));
        String status = r >= 0.85 ? "pass" : r >= 0.45 ? "warn" : "fail";
        double points = Math.round(max * r * 10.0) / 10.0;
        checks.add(new Check(key, category, label, max, points, status,
                status.equals("pass") ? pass : fail, status.equals("pass") ? "" : tip, section));
    }
}