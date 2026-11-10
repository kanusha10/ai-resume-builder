package com.anusha.resume_builder.ats.analysis;

import java.util.ArrayList;
import java.util.List;

public final class ResumeChunker {

    private static final int MAX_CHUNKS = 120;

    private ResumeChunker() {
    }

    public record ResumeChunk(String id, String type, String section, String label, String display, String embedText) {

        public boolean isUsageEvidence() {
            return type.equals("bullet") || type.equals("entry") || type.equals("project");
        }
    }

    public static List<ResumeChunk> chunk(ResumeModel r) {
        List<ResumeChunk> out = new ArrayList<>();

        if (!r.summary.isBlank()) {
            out.add(new ResumeChunk("summary", "summary", "summary", "Summary", r.summary, r.summary));
        }

        addWork(out, r.experience, "experience", "Experience");
        addWork(out, r.internships, "internships", "Internships");

        int p = 0;
        for (ResumeModel.Entry e : r.projects) {
            String label = "Project: " + (e.title().isBlank() ? "Untitled" : e.title());
            String header = e.title() + (e.tech().isBlank() ? "" : " | " + e.tech());
            if (!header.isBlank()) {
                out.add(new ResumeChunk("proj" + p + "-h", "project", "projects", label, header, header));
            }
            int b = 0;
            for (String bullet : e.bullets()) {
                out.add(new ResumeChunk("proj" + p + "-b" + b++, "bullet", "projects", label, bullet,
                        e.title() + (e.tech().isBlank() ? "" : " (" + e.tech() + ")") + ": " + bullet));
            }
            p++;
        }

        int g = 0;
        for (ResumeModel.SkillGroup group : r.skillGroups) {
            String text = group.category() + ": " + String.join(", ", group.skills());
            out.add(new ResumeChunk("skills" + g++, "skills", "skills", "Skills: " + group.category(), text, text));
        }

        int ed = 0;
        for (ResumeModel.Education e : r.education) {
            String text = (e.degree().isBlank() ? e.level() : e.degree())
                    + (e.field().isBlank() ? "" : " in " + e.field())
                    + (e.institution().isBlank() ? "" : ", " + e.institution());
            if (!text.isBlank()) {
                out.add(new ResumeChunk("edu" + ed++, "education", "education", "Education", text.trim(), text.trim()));
            }
        }

        int c = 0;
        for (String cert : r.certifications) {
            out.add(new ResumeChunk("cert" + c++, "cert", "certifications", "Certification", cert, cert));
        }

        return out.size() > MAX_CHUNKS ? new ArrayList<>(out.subList(0, MAX_CHUNKS)) : out;
    }

    private static void addWork(List<ResumeChunk> out, List<ResumeModel.Entry> entries, String section, String prefix) {
        int i = 0;
        for (ResumeModel.Entry e : entries) {
            String label = prefix + ": " + e.label();
            if (!e.label().isBlank()) {
                out.add(new ResumeChunk(section + i + "-h", "entry", section, label, e.label(), e.label()));
            }
            int b = 0;
            for (String bullet : e.bullets()) {
                out.add(new ResumeChunk(section + i + "-b" + b++, "bullet", section, label, bullet,
                        e.label() + ": " + bullet));
            }
            i++;
        }
    }
}