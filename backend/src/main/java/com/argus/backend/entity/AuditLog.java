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
 * JPA entity for the immutable audit trail.
 *
 * <p>Rows are INSERT-only; the application layer must never UPDATE or DELETE audit logs.
 * The {@code immutable} flag is always {@code true} and serves as an application-level
 * guard and documentation signal. TDD §3.1.2, §9.1.
 *
 * <p>Retention: 1-year policy enforced at the infrastructure / Cloud Logging level.
 */
@Entity
@Table(name = "audit_logs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(nullable = false, updatable = false)
    private UUID id;

    /**
     * Classified event type for programmatic filtering.
     * Examples: VERIFICATION_INITIATED, AUTH_LOGIN_SUCCESS, POLICY_CREATED
     */
    @Column(name = "event_type", nullable = false)
    private String eventType;

    /** ID of the user who triggered the event (null for system-initiated events). */
    @Column(name = "user_id")
    private String userId;

    /** ID of the affected resource (e.g. verificationId, policyId). */
    @Column(name = "resource_id")
    private String resourceId;

    /** Resource type label for filtering: "VERIFICATION", "POLICY", "AUTH", "CERTIFICATE". */
    @Column(name = "resource_type")
    private String resourceType;

    /** Human-readable description of the action. */
    @Column(name = "action_details", columnDefinition = "TEXT")
    private String actionDetails;

    /** Structured additional context stored as JSONB. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column
    private Map<String, Object> metadata;

    /** Client IP address (IPv4 or IPv6). Null if not available (e.g. internal events). */
    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    /**
     * Always true. Signals to readers that this row must not be mutated.
     * Schema-level enforcement is at the application service layer, not DB triggers,
     * so we can run on Cloud SQL without special permissions.
     */
    @Column(nullable = false)
    @Builder.Default
    private boolean immutable = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
