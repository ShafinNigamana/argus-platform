package com.argus.backend.dto;

import lombok.Data;

/**
 * Data Transfer Object for retrieving session results.
 */
@Data
public class ResultResponse {
    private String status;
    private double progress;
    private Double bpm;
    private Double signalQuality;
    private Boolean valid;
    private Double livenessScore;
    private String livenessStatus;
    private Double behaviorScore;
    private Double challengeScore;
    private String failReason;
}
