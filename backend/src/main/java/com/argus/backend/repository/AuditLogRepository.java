package com.argus.backend.repository;

import com.argus.backend.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Spring Data JPA repository for {@link AuditLog} records.
 *
 * <p>This repository is READ + INSERT only at the application layer.
 * Never call {@code save()} with a modified existing record.
 * TDD §2.4, §3.1.2.
 */
@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

    List<AuditLog> findByUserId(String userId);

    List<AuditLog> findByUserIdOrderByCreatedAtDesc(String userId);

    List<AuditLog> findByEventType(String eventType);

    List<AuditLog> findByResourceId(String resourceId);

    /** Supports the GET /api/v1/admin/audit-logs date-range filter. */
    List<AuditLog> findByCreatedAtBetweenOrderByCreatedAtDesc(Instant from, Instant to);

    List<AuditLog> findByUserIdAndCreatedAtBetweenOrderByCreatedAtDesc(
            String userId, Instant from, Instant to);
}
