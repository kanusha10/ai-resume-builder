
package com.anusha.resume_builder.auth.repository;

import com.anusha.resume_builder.auth.entity.PendingRegistration;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PendingRegistrationRepository
        extends JpaRepository<PendingRegistration, Long> {

    Optional<PendingRegistration> findByEmail(String email);

    void deleteByEmail(String email);
}
