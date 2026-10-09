package com.argus.backend.repository;

import com.argus.backend.entity.Verification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Spring Data JPA repository for {@link Verification} records.
 * TDD §2.4 — Verification Repository.
 */
@Repository
public interface VerificationRepository extends JpaRepository<Verification, UUID>, JpaSpecificationExecutor<Verification> {

    List<Verification> findByUserId(String userId);

    List<Verification> findByStatus(Verification.VerificationStatus status);

    List<Verification> findByUserIdAndStatus(String userId, Verification.VerificationStatus status);

    List<Verification> findByCreatedAtBetween(Instant from, Instant to);
}
