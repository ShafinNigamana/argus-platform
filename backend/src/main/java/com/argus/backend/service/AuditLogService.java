package com.argus.backend.service;

import com.argus.backend.entity.AuditLog;
import com.argus.backend.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Write-only audit logging service.
 *
 * <p>Logs are INSERT-only; never updated or deleted after creation.
 * All write operations are {@code @Async} to avoid blocking API response time
 * (audit writes are fire-and-forget for the request path). TDD §3.1.2, §9.1.
 *
 * <p>The read path (for GET /api/v1/admin/audit-logs) is synchronous.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    // -------------------------------------------------------------------------
    // Write operations (async, fire-and-forget)
    // -------------------------------------------------------------------------

    /**
     * Records an audit event asynchronously.
     *
     * @param eventType    classified event (e.g. "VERIFICATION_INITIATED")
     * @param userId       ID of the acting user (null for system events)
     * @param resourceId   affected resource ID (verificationId, policyId, etc.)
     * @param resourceType resource type label ("VERIFICATION", "POLICY", "AUTH", "CERTIFICATE")
     * @param details      human-readable action summary
     * @param ipAddress    client IP address
     */
    @Async
    public void log(String eventType,
                    String userId,
                    String resourceId,
                    String resourceType,
                    String details,
                    String ipAddress) {
        log(eventType, userId, resourceId, resourceType, details, ipAddress, null);
    }

    /**
     * Records an audit event with additional structured metadata.
     */
    @Async
    public void log(String eventType,
                    String userId,
                    String resourceId,
                    String resourceType,
                    String details,
                    String ipAddress,
                    Map<String, Object> metadata) {
        try {
            AuditLog entry = AuditLog.builder()
                    .eventType(eventType)
                    .userId(userId)
                    .resourceId(resourceId)
                    .resourceType(resourceType)
                    .actionDetails(details)
                    .ipAddress(ipAddress)
                    .metadata(metadata)
                    .immutable(true)
                    .build();
            auditLogRepository.save(entry);
        } catch (Exception e) {
            // Never let audit failure break the main request flow
            log.error("Failed to write audit log event={} userId={}: {}", eventType, userId, e.getMessage());
        }
    }

    // -------------------------------------------------------------------------
    // Read operations (synchronous, for admin query API)
    // -------------------------------------------------------------------------

    /**
     * Queries audit logs filtered by date range, with optional userId filter.
     * Supports GET /api/v1/admin/audit-logs. TDD §4.1.
     *
     * @param userId optional; if null returns all events in the date range
     * @param from   start of range (inclusive)
     * @param to     end of range (inclusive)
     * @param limit  max records to return (capped at 1000)
     */
    public List<AuditLog> query(String userId, Instant from, Instant to, int limit) {
        int safeLimit = Math.min(limit, 1000);
        List<AuditLog> results;

        if (userId != null && !userId.isBlank()) {
            results = auditLogRepository
                    .findByUserIdAndCreatedAtBetweenOrderByCreatedAtDesc(userId, from, to);
        } else {
            results = auditLogRepository
                    .findByCreatedAtBetweenOrderByCreatedAtDesc(from, to);
        }

        return results.stream().limit(safeLimit).toList();
    }

    // -------------------------------------------------------------------------
    // Convenience event constants (reduces magic string usage in callers)
    // -------------------------------------------------------------------------

    public static final String EVT_VERIFICATION_INITIATED  = "VERIFICATION_INITIATED";
    public static final String EVT_VERIFICATION_COMPLETED  = "VERIFICATION_COMPLETED";
    public static final String EVT_CHALLENGE_SUBMITTED     = "CHALLENGE_SUBMITTED";
    public static final String EVT_CERTIFICATE_ISSUED      = "CERTIFICATE_ISSUED";
    public static final String EVT_POLICY_CREATED          = "POLICY_CREATED";
    public static final String EVT_AUDIT_LOG_QUERIED       = "AUDIT_LOG_QUERIED";
    public static final String EVT_AUTH_LOGIN_SUCCESS      = "AUTH_LOGIN_SUCCESS";
    public static final String EVT_AUTH_LOGIN_FAILURE      = "AUTH_LOGIN_FAILURE";
    public static final String EVT_AUTH_TOKEN_REFRESHED    = "AUTH_TOKEN_REFRESHED";
    public static final String EVT_AUTH_REGISTERED         = "AUTH_REGISTERED";
}
