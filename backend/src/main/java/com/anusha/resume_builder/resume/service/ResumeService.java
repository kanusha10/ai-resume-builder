package com.anusha.resume_builder.resume.service;

import com.anusha.resume_builder.auth.entity.User;
import com.anusha.resume_builder.auth.repository.UserRepository;
import com.anusha.resume_builder.resume.dto.ResumeRequest;
import com.anusha.resume_builder.resume.dto.ResumeResponse;
import com.anusha.resume_builder.resume.entity.Resume;
import com.anusha.resume_builder.resume.repository.ResumeRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class ResumeService {

    private final ResumeRepository resumeRepository;
    private final UserRepository userRepository;

    public ResumeService(
            ResumeRepository resumeRepository,
            UserRepository userRepository
    ) {
        this.resumeRepository = resumeRepository;
        this.userRepository = userRepository;
    }

    public List<ResumeResponse> getAllResumes(Authentication authentication) {

        User user = getCurrentUser(authentication);

        return resumeRepository
                .findAllByUserIdOrderByUpdatedAtDesc(user.getId())
                .stream()
                .map(ResumeResponse::new)
                .toList();
    }

    public ResumeResponse getResume(
            Long resumeId,
            Authentication authentication
    ) {

        User user = getCurrentUser(authentication);

        Resume resume = resumeRepository
                .findByIdAndUserId(resumeId, user.getId())
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Resume not found"
                        )
                );

        return new ResumeResponse(resume);
    }

    public ResumeResponse createResume(
            ResumeRequest request,
            Authentication authentication
    ) {

        User user = getCurrentUser(authentication);

        Resume resume = new Resume();

        resume.setUser(user);
        resume.setName(request.getName());
        resume.setTemplate(request.getTemplate());
        resume.setColor(request.getColor());
        resume.setResumeData(request.getResumeData());

        Resume savedResume = resumeRepository.save(resume);

        return new ResumeResponse(savedResume);
    }

    public ResumeResponse updateResume(
            Long resumeId,
            ResumeRequest request,
            Authentication authentication
    ) {

        User user = getCurrentUser(authentication);

        Resume resume = resumeRepository
                .findByIdAndUserId(resumeId, user.getId())
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Resume not found"
                        )
                );

        resume.setName(request.getName());
        resume.setTemplate(request.getTemplate());
        resume.setColor(request.getColor());
        resume.setResumeData(request.getResumeData());

        Resume updatedResume = resumeRepository.save(resume);

        return new ResumeResponse(updatedResume);
    }

    public void deleteResume(
            Long resumeId,
            Authentication authentication
    ) {

        User user = getCurrentUser(authentication);

        Resume resume = resumeRepository
                .findByIdAndUserId(resumeId, user.getId())
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Resume not found"
                        )
                );

        resumeRepository.delete(resume);
    }

    private User getCurrentUser(Authentication authentication) {

        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Authentication required"
            );
        }

        String email = authentication.getName();

        return userRepository
                .findByEmail(email)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.UNAUTHORIZED,
                                "User not found"
                        )
                );
    }
}