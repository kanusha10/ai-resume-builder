package com.anusha.resume_builder.ats.dto;

import java.util.Map;

public record AtsAnalyzeRequest(Map<String, Object> resume, String jobTitle, String jobDescription,
                                Long resumeId, String contentSignature) {
}