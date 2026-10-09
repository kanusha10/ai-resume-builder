package com.anusha.resume_builder.resume.dto;

import com.anusha.resume_builder.resume.entity.Resume;

import java.time.LocalDateTime;

public class ResumeResponse {

    private Long id;
    private String name;
    private String template;
    private String color;
    private String resumeData;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public ResumeResponse() {
    }

    public ResumeResponse(Resume resume) {
        this.id = resume.getId();
        this.name = resume.getName();
        this.template = resume.getTemplate();
        this.color = resume.getColor();
        this.resumeData = resume.getResumeData();
        this.createdAt = resume.getCreatedAt();
        this.updatedAt = resume.getUpdatedAt();
    }

    public Long getId() {
        return id;
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

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}