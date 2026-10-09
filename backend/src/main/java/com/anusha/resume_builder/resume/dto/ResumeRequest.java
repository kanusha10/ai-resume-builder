package com.anusha.resume_builder.resume.dto;

import jakarta.validation.constraints.NotBlank;

public class ResumeRequest {

    @NotBlank(message = "Resume name is required")
    private String name;

    @NotBlank(message = "Template is required")
    private String template;

    @NotBlank(message = "Color is required")
    private String color;

    private String resumeData;

    public ResumeRequest() {
    }

    public String getName() {
        return name;
    }

    public String getTemplate() {
        return template;
    }

    public String getColor() {
        return color;
    }

    public String getResumeData() {
        return resumeData;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setTemplate(String template) {
        this.template = template;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public void setResumeData(String resumeData) {
        this.resumeData = resumeData;
    }
}