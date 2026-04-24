package com.argus.backend.model;

import lombok.Data;
import java.util.List;

/**
 * Internal input model for the Challenge Validation Engine.
 * Aggregates the challenge prompt metadata and the user's response events.
 */
@Data
public class ChallengeInput {

    /** The type of challenge issued: "BLINK" or "HEAD_TURN". */
    private String challengeType;

    /** Epoch timestamp (ms) when the challenge was shown to the user. */
    private long issuedAt;

    /** Epoch timestamp (ms) when the user completed the challenge. */
    private long completedAt;

    /** List of events captured during the challenge window. */
    private List<ChallengeEvent> events;
}
