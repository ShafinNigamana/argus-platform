package com.argus.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * JPA entity for organisation-specific verification policies.
 *
 * <p>Policies configure how the Argus platform behaves for a given organisation:
 * what confidence threshold to require, which challenge types to use, and
 * how long a verification session may last. TDD §3.1.4.
 *
 * <p>Only users with the ADMIN role may create or modify policies (enforced via RBAC
 * in {@code AdminController}).
 */
@Entity
@Table(name = "policies")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Policy {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(length = 255)
    private String organisation;

    /**
     * Minimum confidence score (0–100) required to issue a PASS result.
     * Default is 80.0 per TDD §3.1.4.
     */
    @Column(name = "confidence_threshold", nullable = false)
    @Builder.Default
    private double confidenceThreshold = 80.0;

    /**
     * List of challenge types to include in the verification workflow.
     * Examples: ["HEAD_TURN", "BLINK", "TEXT_INPUT"]
     * Stored as JSONB for easy extensibility without schema changes.
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "challenge_types")
    private List<String> challengeTypes;

    /** Maximum allowed duration (seconds) for a single verification session. Default 90s. */
    @Column(name = "max_duration_seconds", nullable = false)
    @Builder.Default
    private int maxDurationSeconds = 90;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();

    @Column(name = "created_by")
    private String createdBy;

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
