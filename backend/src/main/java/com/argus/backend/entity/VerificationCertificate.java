package com.argus.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * JPA entity for cryptographic verification certificates.
 *
 * <p>A certificate is issued after a verification workflow completes with a PASS result.
 * The {@code signature} is generated using SHA-256 locally (fallback) or via Cloud KMS
 * asymmetric signing when {@code gcp.kms.key-name} is configured. TDD §3.1.3.
 *
 * <p>Third parties can validate authenticity using the stored {@code publicKey} and
 * recomputing the signature over {@code certificateData}.
 */
@Entity
@Table(name = "verification_certificates")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VerificationCertificate {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(nullable = false, updatable = false)
    private UUID id;

    /** FK to the verification this certificate proves. One-to-one relationship. */
    @Column(name = "verification_id", nullable = false)
    private UUID verificationId;

    /**
     * Full certificate payload serialized as JSONB.
     * Contains: verificationId, userId, operationType, confidenceScore,
     * componentScores, issuedAt, expiresAt, issuer.
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "certificate_data", nullable = false)
    private Map<String, Object> certificateData;

    /**
     * Hex-encoded SHA-256 (or KMS asymmetric) signature over the canonical
     * JSON string of {@code certificateData}.
     */
    @Column(nullable = false, length = 512)
    private String signature;

    /**
     * PEM-encoded public key for third-party signature verification.
     * Populated when KMS asymmetric signing is active; null for local SHA-256 HMAC.
     */
    @Column(name = "public_key", columnDefinition = "TEXT")
    private String publicKey;

    @Column(name = "issued_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant issuedAt = Instant.now();

    /** Certificates are valid for 24 hours by default (configurable). */
    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(nullable = false)
    @Builder.Default
    private boolean revoked = false;

    @Column(name = "revocation_reason")
    private String revocationReason;
}
