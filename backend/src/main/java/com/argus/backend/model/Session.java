package com.argus.backend.model;

import lombok.Data;

import java.util.List;

/**
 * Represents a single verification session in the Argus system.
 * Tracks session lifecycle, timing, processing state, and results.
 */
@Data
public class Session {

    private String sessionId;
    private SessionState state;
    private SignalBuffer buffer = new SignalBuffer(450);
    private long createdAt;
    private long lastUpdatedAt;
    private long lastProcessedAt;
    private boolean processing;
    private ProcessingResult result;
    private BehaviorResult behaviorResult;
    private ChallengeResult challengeResult;
    private BehaviorInput behaviorInput;
    private List<ChallengeInput> challengeInputs;
    private String verificationId;
    private Double antiSpoofScore;
    private Boolean antiSpoofReal;
    private String antiSpoofReasoning;
}
