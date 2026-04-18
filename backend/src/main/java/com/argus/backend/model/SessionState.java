package com.argus.backend.model;

/**
 * Enum representing the lifecycle states of a verification session.
 */
public enum SessionState {
    INIT,
    COLLECTING,
    PROCESSING,
    COMPLETED,
    FAILED,
    EXPIRED
}
