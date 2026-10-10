package com.argus.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Tracks authentication and registration attempt rates in the persistent database.
 * Enables consistent, multi-instance abuse protection across horizontal replicas (e.g. Cloud Run).
 */
@Entity
@Table(name = "auth_rate_limits")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthRateLimit {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "rate_key", nullable = false)
    private String rateKey;

    @Column(name = "action_type", nullable = false)
    private String actionType;

    @Column(name = "attempts", nullable = false)
    private int attempts;

    @Column(name = "first_attempt_at", nullable = false)
    private Instant firstAttemptAt;

    @Column(name = "last_attempt_at", nullable = false)
    private Instant lastAttemptAt;

    @Column(name = "blocked_until")
    private Instant blockedUntil;
}
