package com.argus.backend.model;

import lombok.Data;

/**
 * Represents a single verification session in the Argus system.
 * Tracks session lifecycle, timing, processing state, and results.
 */
@Data
public class Session {

    private String sessionId;
    private SessionState state;
    private SignalBuffer buffer = new SignalBuffer(60);
    private long createdAt;
    private long lastUpdatedAt;
    private long lastProcessedAt;
    private boolean processing;
    private LivenessResult result;
}
