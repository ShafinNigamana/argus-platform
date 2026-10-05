package com.argus.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Request payload for POST /api/v1/challenges/{verificationId} per TDD §4.1.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChallengeSubmissionRequest {

    @NotBlank(message = "challengeId is required")
    private String challengeId;

    /**
     * The response payload for the challenge.
     * Can contain structured response data, e.g., action taken, coordinates, gesture metadata.
     */
    private Object response;

    private Long timestamp;

    private Map<String, Object> metadata;
}
