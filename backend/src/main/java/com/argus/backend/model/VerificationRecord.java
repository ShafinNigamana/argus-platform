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
    
    // Ledger Fields
    private String kmsSignature;
    private String previousSignature;
    private long ledgerIndex;
    
    @Builder.Default
    private boolean verified = true;

    // AI Forensic Fields
    private double aiScore;
    private String aiReasoning;
}
