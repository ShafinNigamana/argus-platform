package com.argus.backend.controller;

import com.argus.backend.dto.PolicyRequest;
import com.argus.backend.entity.AuditLog;
import com.argus.backend.entity.Policy;
import com.argus.backend.repository.PolicyRepository;
import com.argus.backend.service.AuditLogService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

/**
 * Admin controller for policy management and audit log queries.
 *
 * <p>Implements TDD §4.1:
 * <ul>
 *   <li>POST /api/v1/admin/policies         — create/upsert policy (ADMIN role)</li>
 *   <li>GET  /api/v1/admin/audit-logs       — query audit logs (AUDIT role)</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private final PolicyRepository policyRepository;
    private final AuditLogService  auditLogService;

    // -------------------------------------------------------------------------
    // Policy management — ADMIN role required
    // -------------------------------------------------------------------------

    /**
     * Creates a new verification policy.
     *
     * @param request policy configuration
     * @param auth    authenticated principal (used as createdBy)
     * @return 201 with created policy
     */
    @PostMapping("/policies")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    public ResponseEntity<Policy> createPolicy(
            @Valid @RequestBody PolicyRequest request,
            Authentication auth,
            HttpServletRequest httpRequest) {

        Policy policy = Policy.builder()
                .name(request.getName())
                .organisation(request.getOrganisation())
                .confidenceThreshold(request.getConfidenceThreshold())
                .challengeTypes(request.getChallengeTypes())
                .maxDurationSeconds(request.getMaxDurationSeconds())
                .active(request.isActive())
                .createdBy(auth.getName())
                .build();

        policy = policyRepository.save(policy);

        auditLogService.log(
                AuditLogService.EVT_POLICY_CREATED,
                auth.getName(),
                policy.getId().toString(),
                "POLICY",
                "Policy created: " + policy.getName(),
                httpRequest.getRemoteAddr()
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(policy);
    }

    /**
     * Lists all active policies (for ADMIN self-service visibility).
     */
    @GetMapping("/policies")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    public ResponseEntity<List<Policy>> listPolicies() {
        return ResponseEntity.ok(policyRepository.findByActiveTrue());
    }

    /**
     * Retrieves a specific policy by ID.
     */
    @GetMapping("/policies/{policyId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    public ResponseEntity<Policy> getPolicy(@PathVariable UUID policyId) {
        return policyRepository.findById(policyId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // -------------------------------------------------------------------------
    // Audit log query — AUDIT role required
    // -------------------------------------------------------------------------

    /**
     * Queries audit logs with optional filtering.
     *
     * <p>TDD §4.1: filters by date range, userId, status, limit.
     *
     * @param userId optional user filter
     * @param from   start date (inclusive, defaults to 30 days ago)
     * @param to     end date (inclusive, defaults to today)
     * @param limit  max records (default 100, capped at 1000)
     */
    @GetMapping("/audit-logs")
    @PreAuthorize("hasAnyRole('AUDIT','ADMIN','SUPERADMIN')")
    public ResponseEntity<List<AuditLog>> queryAuditLogs(
            @RequestParam(required = false) String userId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "100") int limit,
            Authentication auth,
            HttpServletRequest httpRequest) {

        Instant fromInstant = (from != null)
                ? from.atStartOfDay(ZoneOffset.UTC).toInstant()
                : Instant.now().minusSeconds(30L * 24 * 3600); // 30 days default

        Instant toInstant = (to != null)
                ? to.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant()
                : Instant.now();

        List<AuditLog> logs = auditLogService.query(userId, fromInstant, toInstant, limit);

        // Log that the audit log itself was queried
        auditLogService.log(
                AuditLogService.EVT_AUDIT_LOG_QUERIED,
                auth.getName(),
                null,
                "AUDIT",
                "Audit log queried: userId=" + userId + " from=" + fromInstant + " to=" + toInstant,
                httpRequest.getRemoteAddr()
        );

        return ResponseEntity.ok(logs);
    }
}
