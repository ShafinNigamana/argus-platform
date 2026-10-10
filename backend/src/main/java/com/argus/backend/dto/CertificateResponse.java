package com.argus.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Response for GET /api/v1/verify/{verificationId}/certificate.
 * TDD §4.1.
 */
@Data
@Builder
public class CertificateResponse {
    private UUID    certificateId;
    private UUID    verificationId;
    private Map<String, Object> certificateData;
    private String  signature;
    private String  publicKey;
    private String  signingMode;
    private Instant issuedAt;
    private Instant expiresAt;
    private boolean revoked;
}
