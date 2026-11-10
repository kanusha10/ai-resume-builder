package com.anusha.resume_builder.ats.repository;

import com.anusha.resume_builder.ats.entity.AtsAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AtsAnalysisRepository extends JpaRepository<AtsAnalysis, Long> {

    Optional<AtsAnalysis> findByResumeId(Long resumeId);
}