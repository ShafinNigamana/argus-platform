package com.argus.backend.model;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class VerificationRecord {
    private String sessionId;
    private double score;
    private long timestamp;
    private String hash;
}
