package com.anusha.resume_builder.ats.dto;

public record SavedAtsAnalysis(int score, String contentSignature, String jobTitle, String jobDescription,
                               long analyzedAt, String resultJson) {
}