package com.anusha.resume_builder.ats.analysis;

import java.util.List;

public final class Requirements {

    private Requirements() {
    }

    public enum Mode { JOB_DESCRIPTION, ROLE_PROFILE, QUALITY_ONLY }

    public enum Type { SKILL, RESPONSIBILITY, QUALIFICATION }

    public record Requirement(int id, String text, Type type, boolean required, String skill) {
        public boolean isSkill() {
            return type == Type.SKILL;
        }
    }

    public record SourceRef(String id, String kind, String title, double relevance) {
    }

    public record RequirementSet(Mode mode, String title, String domain, String sourceNote, double confidence,
                                 boolean aiInferred, List<Requirement> items, List<SourceRef> sources,
                                 List<String> warnings) {

        public static RequirementSet qualityOnly(String title, String note, List<String> warnings) {
            return new RequirementSet(Mode.QUALITY_ONLY, title, null, note, 0, false, List.of(), List.of(), warnings);
        }

        public long countSkills() {
            return items.stream().filter(Requirement::isSkill).count();
        }

        public long countNonSkills() {
            return items.stream().filter(r -> !r.isSkill()).count();
        }
    }
}