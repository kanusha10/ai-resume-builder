package com.anusha.resume_builder.resume.controller;

import com.anusha.resume_builder.resume.dto.ResumeRequest;
import com.anusha.resume_builder.resume.dto.ResumeResponse;
import com.anusha.resume_builder.resume.service.ResumeParserService;
import com.anusha.resume_builder.resume.service.ResumeService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/resumes")
public class ResumeController {

    private final ResumeService resumeService;
    private final ResumeParserService resumeParserService;

    public ResumeController(ResumeService resumeService, ResumeParserService resumeParserService) {
        this.resumeService = resumeService;
        this.resumeParserService = resumeParserService;
    }

    /**
     * POST /api/resumes/upload
     * Accepts PDF/DOCX/TXT multipart file and parses it into JSON
     */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadAndParseResume(@RequestParam("file") MultipartFile file) {
        try {
            if (file == null || file.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Uploaded file cannot be empty."));
            }
            Map<String, Object> parsedResume = resumeParserService.parseResumeFile(file);
            return ResponseEntity.ok(parsedResume);
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to parse resume: " + ex.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<List<ResumeResponse>> getAllResumes(
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                resumeService.getAllResumes(authentication)
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<ResumeResponse> getResume(
            @PathVariable Long id,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                resumeService.getResume(id, authentication)
        );
    }

    @PostMapping
    public ResponseEntity<ResumeResponse> createResume(
            @Valid @RequestBody ResumeRequest request,
            Authentication authentication
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(
                        resumeService.createResume(
                                request,
                                authentication
                        )
                );
    }

    @PutMapping("/{id}")
    public ResponseEntity<ResumeResponse> updateResume(
            @PathVariable Long id,
            @Valid @RequestBody ResumeRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                resumeService.updateResume(
                        id,
                        request,
                        authentication
                )
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteResume(
            @PathVariable Long id,
            Authentication authentication
    ) {
        resumeService.deleteResume(id, authentication);

        return ResponseEntity.noContent().build();
    }

    @PostMapping("/ai-enhance")
    public ResponseEntity<?> enhanceText(@RequestBody Map<String, String> request) {
        try {
            String type = request.get("type");
            String text = request.get("text");
            String role = request.get("role");
            String context = request.get("context");

            Map<String, String> result = resumeParserService.enhanceText(type, text, role, context);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}