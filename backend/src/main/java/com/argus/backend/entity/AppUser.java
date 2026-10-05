package com.argus.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/**
 * JPA entity for platform users (authentication, not the verified subject).
 *
 * <p>AppUser represents the operator/admin/developer who calls the Argus API,
 * NOT the human being verified. The verified subject is identified by an opaque
 * {@code userId} string on {@link Verification}.
 *
 * <p>Passwords are always BCrypt-hashed before storage. TDD §5.1–5.2.
 */
@Entity
@Table(name = "app_users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(nullable = false, unique = true, length = 150)
    private String username;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    /** BCrypt-hashed password. Never stored or logged in plain text. */
    @Column(nullable = false)
    private String password;

    /**
     * RBAC role. One role per user keeps the model simple.
     * Values: USER | ADMIN | AUDIT | SUPERADMIN
     * TDD §5.2
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private Role role = Role.USER;

    @Column(nullable = false)
    @Builder.Default
    private boolean enabled = true;

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

    /** RBAC roles as defined in TDD §5.2. */
    public enum Role {
        /** Can initiate and poll verifications. */
        USER,
        /** Can manage policies and configure thresholds. */
        ADMIN,
        /** Can query audit logs. */
        AUDIT,
        /** Full system access including user management. */
        SUPERADMIN
    }
}
