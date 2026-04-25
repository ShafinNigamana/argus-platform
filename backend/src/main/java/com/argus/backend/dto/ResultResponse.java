package com.argus.backend.dto;

import lombok.Data;

/**
 * Data Transfer Object for retrieving session results.
 */
@Data
public class ResultResponse {
    private String status;
    private double progress;
    private Double bpm = 0.0;
    private Double signalQuality = 0.0;
    private Boolean valid;
    private Double livenessScore = 0.0;
    private String livenessStatus = "UNCERTAIN";
    private Double behaviorScore;
    private Double challengeScore;
    private String failReason;
    private String confidence;
}
