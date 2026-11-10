package com.anusha.resume_builder.ats.analysis;

import com.fasterxml.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public final class ResumeModel {

    public record Entry(String section, String title, String org, String location,
                        String start, String end, String description, String tech, String link) {

        public List<String> bullets() {
            return bulletsOf(description);
        }

        public String label() {
            String t = title == null ? "" : title;
            if (org != null && !org.isBlank()) {
                return t.isBlank() ? org : t + " @ " + org;
            }
            return t;
        }
    }

    public record Education(String degree, String level, String field, String institution,
                            String start, String end, String grade) {
    }

    public record SkillGroup(String category, List<String> skills) {
    }

    public final String fullName;
    public final String email;
    public final String phone;
    public final String location;
    public final String linkedin;
    public final String github;
    public final String website;
    public final String role;
    public final String summary;
    public final List<Entry> experience;
    public final List<Entry> internships;
    public final List<Entry> projects;
    public final List<Education> education;
    public final List<SkillGroup> skillGroups;
    public final List<String> certifications;
    public final List<String> achievements;
    public final List<String> languages;
    public final List<String> involvement;

    private ResumeModel(JsonNode r) {
        Set<String> hidden = new HashSet<>();
        for (JsonNode h : r.path("hiddenSections")) {
            hidden.add(h.asText());
        }

        JsonNode p = r.path("personal");
        this.fullName = text(p, "fullName");
        this.email = text(p, "email");
        this.phone = text(p, "phone");
        this.location = text(p, "location");
        this.linkedin = text(p, "linkedin");
        this.github = text(p, "github");
        this.website = text(p, "website");
        this.role = text(r, "role");
        this.summary = hidden.contains("summary") ? "" : text(r, "summary");

        this.experience = hidden.contains("experience") ? List.of() : entries(r.path("experience"), "Experience", "role", "company");
        this.internships = hidden.contains("internships") ? List.of() : entries(r.path("internships"), "Internships", "role", "company");
        this.projects = hidden.contains("projects") ? List.of() : projects(r.path("projects"));

        List<Education> edu = new ArrayList<>();
        if (!hidden.contains("education")) {
            for (JsonNode e : r.path("education")) {
                edu.add(new Education(text(e, "degree"), text(e, "level"), text(e, "field"), text(e, "institution"),
                        text(e, "startDate"), text(e, "endDate"), text(e, "grade")));
            }
        }
        this.education = edu;

        List<SkillGroup> groups = new ArrayList<>();
        if (!hidden.contains("skills") && r.path("skills").isObject()) {
            r.path("skills").fields().forEachRemaining(f -> {
                List<String> items = new ArrayList<>();
                if (f.getValue().isArray()) {
                    for (JsonNode s : f.getValue()) {
                        String v = s.asText("").trim();
                        if (!v.isEmpty()) {
                            items.add(v);
                        }
                    }
                } else if (f.getValue().isTextual()) {
                    for (String s : f.getValue().asText().split("[,;\\n]")) {
                        if (!s.isBlank()) {
                            items.add(s.trim());
                        }
                    }
                }
                if (!items.isEmpty() && !f.getKey().isBlank()) {
                    groups.add(new SkillGroup(f.getKey().trim(), items));
                }
            });
        }
        this.skillGroups = groups;

        this.certifications = hidden.contains("certifications") ? List.of()
                : strings(r.path("certifications"), "name", "issuer", "date");
        this.achievements = hidden.contains("achievements") ? List.of()
                : strings(r.path("achievements"), "title", "issuer", "description");
        this.languages = hidden.contains("languages") ? List.of()
                : strings(r.path("languages"), "name", "proficiency");
        this.involvement = hidden.contains("involvement") ? List.of()
                : strings(r.path("involvement"), "role", "organization", "description");
    }

    public static ResumeModel from(JsonNode root) {
        return new ResumeModel(root == null ? com.fasterxml.jackson.databind.node.MissingNode.getInstance() : root);
    }

    public static List<String> bulletsOf(String description) {
        List<String> out = new ArrayList<>();
        if (description == null) {
            return out;
        }
        for (String line : description.split("\\r?\\n")) {
            String cleaned = line.replaceFirst("^[\\s\u2022*\\\\\\-\u2013\u25AA\u203A>]+", "").trim();
            if (!cleaned.isEmpty()) {
                out.add(cleaned);
            }
        }
        return out;
    }

    public List<Entry> workEntries() {
        List<Entry> all = new ArrayList<>(experience);
        all.addAll(internships);
        return all;
    }

    public List<String> workBullets() {
        List<String> out = new ArrayList<>();
        workEntries().forEach(e -> out.addAll(e.bullets()));
        return out;
    }

    public List<String> projectBullets() {
        List<String> out = new ArrayList<>();
        projects.forEach(e -> out.addAll(e.bullets()));
        return out;
    }

    public List<String> allBullets() {
        List<String> out = workBullets();
        out.addAll(projectBullets());
        return out;
    }

    public List<String> allSkills() {
        List<String> out = new ArrayList<>();
        skillGroups.forEach(g -> out.addAll(g.skills()));
        return out;
    }

    public String fullText() {
        StringBuilder sb = new StringBuilder();
        sb.append(fullName).append(' ').append(role).append(' ').append(summary).append(' ');
        for (Entry e : workEntries()) {
            sb.append(e.title()).append(' ').append(e.org()).append(' ').append(e.description()).append(' ');
        }
        for (Entry e : projects) {
            sb.append(e.title()).append(' ').append(e.tech()).append(' ').append(e.description()).append(' ');
        }
        for (Education e : education) {
            sb.append(e.degree()).append(' ').append(e.field()).append(' ').append(e.institution()).append(' ');
        }
        allSkills().forEach(s -> sb.append(s).append(' '));
        certifications.forEach(s -> sb.append(s).append(' '));
        achievements.forEach(s -> sb.append(s).append(' '));
        involvement.forEach(s -> sb.append(s).append(' '));
        return sb.toString().replaceAll("\\s+", " ").trim();
    }

    public int wordCount() {
        String t = fullText();
        return t.isBlank() ? 0 : t.split("\\s+").length;
    }

    private static String text(JsonNode node, String field) {
        JsonNode v = node.path(field);
        return v.isMissingNode() || v.isNull() ? "" : v.asText("").trim();
    }

    private static List<Entry> entries(JsonNode arr, String section, String titleField, String orgField) {
        List<Entry> out = new ArrayList<>();
        for (JsonNode e : arr) {
            out.add(new Entry(section, text(e, titleField), text(e, orgField), text(e, "location"),
                    text(e, "startDate"), text(e, "endDate"), text(e, "description"), "", ""));
        }
        return out;
    }

    private static List<Entry> projects(JsonNode arr) {
        List<Entry> out = new ArrayList<>();
        for (JsonNode e : arr) {
            out.add(new Entry("Projects", text(e, "name"), "", "", "", "", text(e, "description"),
                    text(e, "technologies"), text(e, "link")));
        }
        return out;
    }

    private static List<String> strings(JsonNode arr, String... fields) {
        List<String> out = new ArrayList<>();
        for (JsonNode e : arr) {
            StringBuilder sb = new StringBuilder();
            for (String f : fields) {
                String v = text(e, f);
                if (!v.isEmpty()) {
                    if (sb.length() > 0) {
                        sb.append(" - ");
                    }
                    sb.append(v);
                }
            }
            if (sb.length() > 0) {
                out.add(sb.toString());
            }
        }
        return out;
    }
}