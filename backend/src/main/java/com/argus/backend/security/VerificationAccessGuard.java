package com.argus.backend.security;

import com.argus.backend.entity.Verification;
import com.argus.backend.repository.VerificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Central security guard enforcing data ownership and role authorization
 * on Verification resources per Stage 1 security hardening.
 *
 * <p>Enforces design rules:
 * <ul>
 *   <li>D2: READ access allowed for the verification owner, ROLE_ADMIN, or ROLE_SUPERADMIN.</li>
 *   <li>D3: MUTATE access allowed for the OWNER ONLY (administrators cannot mutate another user's session).</li>
 *   <li>D5: Unknown id throws IllegalArgumentException (mapped to 404).
 *           Forbidden caller throws AccessDeniedException (mapped to 403).</li>
 * </ul>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class VerificationAccessGuard {

    private final VerificationRepository verificationRepository;

    /**
     * Enforces READ permission (GET /verify/{id}, GET /verify/{id}/certificate).
     * Allowed for: owner, ROLE_ADMIN, or ROLE_SUPERADMIN.
     *
     * @param verificationId target verification id
     * @param auth authenticated principal
     * @return the verified Verification entity
     * @throws IllegalArgumentException if verification is not found (HTTP 404)
     * @throws AccessDeniedException if caller lacks permission (HTTP 403)
     */
    public Verification checkReadAccess(UUID verificationId, Authentication auth) {
        Verification verification = findOrThrow(verificationId);
        String principal = getPrincipalName(auth);

        if (isOwner(verification, principal) || canReadVerifications(auth)) {
            return verification;
        }

        log.warn("Read access denied on verification {}: principal '{}' is neither owner '{}' nor authorized reader",
                verificationId, principal, verification.getUserId());
        throw new AccessDeniedException("Access denied: you do not have permission to view verification " + verificationId);
    }

    /**
     * Enforces MUTATE permission (/face, /complete, challenge submit).
     * Allowed for: OWNER ONLY (even administrators or auditors cannot mutate another user's session).
     *
     * @param verificationId target verification id
     * @param auth authenticated principal
     * @return the verified Verification entity
     * @throws IllegalArgumentException if verification is not found (HTTP 404)
     * @throws AccessDeniedException if caller is not the owner (HTTP 403)
     */
    public Verification checkMutateAccess(UUID verificationId, Authentication auth) {
        Verification verification = findOrThrow(verificationId);
        String principal = getPrincipalName(auth);

        if (isOwner(verification, principal)) {
            return verification;
        }

        log.warn("Mutate access denied on verification {}: principal '{}' is not owner '{}'",
                verificationId, principal, verification.getUserId());
        throw new AccessDeniedException("Access denied: you do not have permission to modify verification " + verificationId);
    }

    /**
     * Resolves the target userId filter for verification history listing (GET /api/v1/verify).
     * <ul>
     *   <li>For ROLE_USER: strictly bound to the authenticated principal. Any requested foreign userId is ignored and warned.</li>
     *   <li>For ROLE_ADMIN / ROLE_SUPERADMIN / ROLE_AUDIT: permits broader queries (all users if null/blank, or specific user if requested).</li>
     * </ul>
     *
     * @param requestedUserId client-requested userId parameter (optional)
     * @param auth authenticated principal
     * @return effective userId to filter by, or null to query all users (admin/audit only)
     */
    public String resolveEffectiveUserIdForList(String requestedUserId, Authentication auth) {
        String principal = getPrincipalName(auth);

        if (canReadVerifications(auth)) {
            return (requestedUserId != null && !requestedUserId.isBlank()) ? requestedUserId : null;
        }

        if (requestedUserId != null && !requestedUserId.isBlank() && !requestedUserId.equals(principal)) {
            log.warn("List access: user '{}' attempted to query records for '{}'; restricting to principal",
                    principal, requestedUserId);
        }

        return principal;
    }

    private Verification findOrThrow(UUID verificationId) {
        return verificationRepository.findById(verificationId)
                .orElseThrow(() -> new IllegalArgumentException("Verification not found: " + verificationId));
    }

    private String getPrincipalName(Authentication auth) {
        return (auth != null && auth.getName() != null) ? auth.getName() : "anonymous";
    }

    private boolean isOwner(Verification verification, String principal) {
        return verification.getUserId() != null && verification.getUserId().equals(principal);
    }

    private boolean canReadVerifications(Authentication auth) {
        if (auth == null || auth.getAuthorities() == null) {
            return false;
        }
        for (GrantedAuthority authority : auth.getAuthorities()) {
            String role = authority.getAuthority();
            if ("ROLE_ADMIN".equals(role) || "ROLE_SUPERADMIN".equals(role) || "ROLE_AUDIT".equals(role)) {
                return true;
            }
        }
        return false;
    }

    private boolean hasElevatedRole(Authentication auth) {
        if (auth == null || auth.getAuthorities() == null) {
            return false;
        }
        for (GrantedAuthority authority : auth.getAuthorities()) {
            String role = authority.getAuthority();
            if ("ROLE_ADMIN".equals(role) || "ROLE_SUPERADMIN".equals(role)) {
                return true;
            }
        }
        return false;
    }
}
