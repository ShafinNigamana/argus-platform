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
 * JPA entity for verification attempts.
 *
 * <p>Represents a single human-verification workflow initiated via {@code POST /api/v1/verify}.
 * Status transitions: INITIATED → IN_PROGRESS → COMPLETED | FAILED
 *
 * <p>TDD §3.1.1
 */
@Entity
@Table(name = "verifications")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Verification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(nullable = false, updatable = false)
    private UUID id;

    /**
     * External caller-supplied user identifier (opaque string — not an internal user ID).
     * Argus does not authenticate who the user is; it verifies they are present.
     */
    @Column(name = "user_id", nullable = false)
    private String userId;

    /** Caller-supplied label describing what operation requires verification. */
    @Column(name = "operation_type", nullable = false)
    private String operationType;

    /**
     * Lifecycle status. Managed exclusively by VerificationOrchestrator.
     * Values: INITIATED, IN_PROGRESS, COMPLETED, FAILED
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private VerificationStatus status = VerificationStatus.INITIATED;

    /** Overall confidence score 0–100 synthesised by the AI Confidence Engine. */
    @Column(name = "confidence_score")
    private Double confidenceScore;

    /**
     * Per-component scores stored as JSONB for flexibility.
     * Example: {"liveness":0.9,"behavior":0.85,"challenge":1.0}
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "component_scores")
    private Map<String, Object> componentScores;

    /** Caller-supplied context passed at verification initiation (stored as JSONB). */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column
    private Map<String, Object> metadata;

    /** FK to the issued certificate; null until verification completes and certificate is issued. */
    @Column(name = "certificate_id")
    private UUID certificateId;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }

    /** Allowed lifecycle states for a verification workflow. */
    public enum VerificationStatus {
        INITIATED, IN_PROGRESS, COMPLETED, FAILED
    }
}
