package com.argus.backend.model;

import lombok.Data;

@Data
public class LivenessResult {
    private double livenessScore;
    private String status;
}
