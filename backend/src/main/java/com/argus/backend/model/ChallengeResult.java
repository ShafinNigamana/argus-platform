package com.argus.backend.model;

import lombok.Data;

/**
 * Output of the Challenge Validation Engine.
 * Contains the final score, validity flag, and optional failure reason.
 */
@Data
public class ChallengeResult {

    /** Final weighted challenge score (0.0–1.0). */
    private double challengeScore;

    /** Whether the challenge was considered successfully completed. */
    private boolean valid;

    /** Reason for failure, null if the challenge was valid. */
    private String failReason;
}
