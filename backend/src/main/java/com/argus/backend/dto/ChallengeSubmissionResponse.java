package com.argus.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Response payload for POST /api/v1/challenges/{verificationId}.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChallengeSubmissionResponse {
    private UUID verificationId;
    private String challengeId;
    private boolean valid;
    private double score;
    private String status;
    private String message;
}
