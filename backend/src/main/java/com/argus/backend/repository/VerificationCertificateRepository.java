package com.argus.backend.repository;

import com.argus.backend.entity.VerificationCertificate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA repository for {@link VerificationCertificate}.
 * TDD §2.4, §3.1.3.
 */
@Repository
public interface VerificationCertificateRepository extends JpaRepository<VerificationCertificate, UUID> {

    /** Used by GET /api/v1/verify/{verificationId}/certificate. */
    Optional<VerificationCertificate> findByVerificationId(UUID verificationId);

    /** Check whether a non-revoked certificate exists for a given verification. */
    boolean existsByVerificationIdAndRevokedFalse(UUID verificationId);
}
