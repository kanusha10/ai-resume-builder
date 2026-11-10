package com.anusha.resume_builder.ats.service;

import com.anusha.resume_builder.ats.dto.AtsAnalysisResponse;
import com.anusha.resume_builder.ats.dto.AtsAnalyzeRequest;
import com.anusha.resume_builder.ats.dto.SavedAtsAnalysis;
import com.anusha.resume_builder.ats.entity.AtsAnalysis;
import com.anusha.resume_builder.ats.repository.AtsAnalysisRepository;
import com.anusha.resume_builder.auth.entity.User;
import com.anusha.resume_builder.auth.repository.UserRepository;
import com.anusha.resume_builder.resume.entity.Resume;
import com.anusha.resume_builder.resume.repository.ResumeRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;

@Service
public class AtsHistoryService {

    private final AtsAnalysisRepository analyses;
    private final ResumeRepository resumes;
    private final UserRepository users;
    private final ObjectMapper mapper = new ObjectMapper();

    public AtsHistoryService(AtsAnalysisRepository analyses, ResumeRepository resumes, UserRepository users) {
        this.analyses = analyses;
        this.resumes = resumes;
        this.users = users;
    }

    @Transactional
    public void save(Authentication authentication, AtsAnalyzeRequest request, AtsAnalysisResponse result)
            throws JsonProcessingException {
        Resume resume = ownedResume(authentication, request.resumeId());
        if (resume == null) {
            return;
        }

        AtsAnalysis row = analyses.findByResumeId(resume.getId()).orElseGet(AtsAnalysis::new);
        row.setResume(resume);
        row.setScore(result.score());
        row.setContentSignature(limit(request.contentSignature(), 64));
        row.setJobTitle(limit(request.jobTitle(), 150));
        row.setJobDescription(request.jobDescription());
        row.setResultJson(mapper.writeValueAsString(result));
        row.setAnalyzedAt(Instant.now());
        analyses.save(row);
    }

    @Transactional(readOnly = true)
    public Optional<SavedAtsAnalysis> latest(Authentication authentication, Long resumeId) {
        Resume resume = ownedResume(authentication, resumeId);
        if (resume == null) {
            return Optional.empty();
        }

        return analyses.findByResumeId(resume.getId()).map(row -> new SavedAtsAnalysis(
                row.getScore(),
                row.getContentSignature(),
                row.getJobTitle(),
                row.getJobDescription(),
                row.getAnalyzedAt().toEpochMilli(),
                row.getResultJson()));
    }

    private Resume ownedResume(Authentication authentication, Long resumeId) {
        if (authentication == null || !authentication.isAuthenticated() || resumeId == null) {
            return null;
        }

        User user = users.findByEmail(authentication.getName()).orElse(null);
        if (user == null) {
            return null;
        }

        return resumes.findByIdAndUserId(resumeId, user.getId()).orElse(null);
    }

    private static String limit(String value, int max) {
        if (value == null) {
            return null;
        }
        return value.length() > max ? value.substring(0, max) : value;
    }
}