package com.argus.backend.dto;

import com.argus.backend.entity.Verification.VerificationStatus;
import com.argus.backend.model.VerificationVerdict;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/**
 * Summary DTO for verification sessions history list (GET /api/v1/verify) per Stage 2 + 3.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VerificationSummaryResponse {
    private UUID verificationId;
    private String userId;
    private String operationType;
    private VerificationStatus status;
    private VerificationVerdict verdict;
    private Double confidenceScore;
    private String reasonCode;
    private String reason;
    private Instant createdAt;
    private Instant updatedAt;
    private UUID certificateId;
}
