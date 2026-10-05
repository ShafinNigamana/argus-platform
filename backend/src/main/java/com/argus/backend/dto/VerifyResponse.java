package com.argus.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Response for POST /api/v1/verify and GET /api/v1/verify/{verificationId}.
 * TDD §4.1.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VerifyResponse {
    private UUID    verificationId;
    private String  status;            // INITIATED | IN_PROGRESS | COMPLETED | FAILED
    private String  userId;
    private String  operationType;
    private Double  confidenceScore;
    private Map<String, Object> componentScores;
    private String  redirectUrl;
    private Instant createdAt;
    private Instant updatedAt;
    /** Populated when status is COMPLETED and certificate has been issued. */
    private UUID    certificateId;
}
