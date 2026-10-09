package com.anusha.resume_builder.pdf.controller;

import com.anusha.resume_builder.auth.entity.User;
import com.anusha.resume_builder.auth.repository.UserRepository;
import com.anusha.resume_builder.pdf.service.PdfService;
import com.anusha.resume_builder.resume.entity.Resume;
import com.anusha.resume_builder.resume.repository.ResumeRepository;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/resumes")
public class PdfController {

    private final ResumeRepository resumeRepository;

    private final UserRepository userRepository;

    private final PdfService pdfService;

    public PdfController(
            ResumeRepository resumeRepository,
            UserRepository userRepository,
            PdfService pdfService
    ) {
        this.resumeRepository = resumeRepository;
        this.userRepository = userRepository;
        this.pdfService = pdfService;
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<byte[]> downloadResume(
            @PathVariable Long id,
            Authentication authentication
    ) {

        String email = authentication.getName();

        User user =
                userRepository.findByEmail(email)
                        .orElseThrow(
                                () -> new IllegalArgumentException(
                                        "User not found."
                                )
                        );

        Resume resume =
                resumeRepository
                        .findByIdAndUserId(
                                id,
                                user.getId()
                        )
                        .orElseThrow(
                                () -> new IllegalArgumentException(
                                        "Resume not found."
                                )
                        );

        byte[] pdf =
                pdfService.generateResumePdf(resume);

        String filename =
                createFilename(resume.getName());

        HttpHeaders headers =
                new HttpHeaders();

        headers.setContentType(
                MediaType.APPLICATION_PDF
        );

        headers.setContentDisposition(
                ContentDisposition
                        .attachment()
                        .filename(filename)
                        .build()
        );

        headers.setContentLength(
                pdf.length
        );

        return ResponseEntity
                .ok()
                .headers(headers)
                .body(pdf);
    }

    private String createFilename(String resumeName) {

        String safeName =
                resumeName == null
                        ? "resume"
                        : resumeName
                        .trim()
                        .replaceAll(
                                "[^a-zA-Z0-9-_ ]",
                                ""
                        )
                        .replaceAll(
                                "\\s+",
                                "-"
                        );

        if (safeName.isBlank()) {
            safeName = "resume";
        }

        return safeName + ".pdf";
    }
}