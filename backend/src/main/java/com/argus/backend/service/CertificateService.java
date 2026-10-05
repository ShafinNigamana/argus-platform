package com.argus.backend.service;

import com.argus.backend.entity.Verification;
import com.argus.backend.entity.VerificationCertificate;
import com.argus.backend.repository.VerificationCertificateRepository;
import com.argus.backend.repository.VerificationRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;

/**
 * Issues and manages verification certificates.
 *
 * <p>A certificate is issued after a verification completes with a PASS outcome.
 * The certificate payload is signed using SHA-256 (local fallback) or Cloud KMS
 * asymmetric signing when {@code gcp.kms.key-name} is configured. TDD §3.1.3, §5.3.
 *
 * <p>The certificate JSON payload is canonical: keys sorted, no extra whitespace.
 * The signature is computed over this canonical form so third parties can reproduce it.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CertificateService {

    private static final long CERT_VALIDITY_HOURS = 24;
    private static final String ISSUER = "argus-platform";

    private final VerificationCertificateRepository certRepository;
    private final VerificationRepository            verificationRepository;
    private final ObjectMapper                      objectMapper;
    private final KmsSigningService                 kmsSigningService;

    /**
     * Retrieves the certificate for a completed verification, issuing it on first access.
     *
     * @param verificationId UUID of the verification
     * @return the VerificationCertificate (new or existing)
     * @throws IllegalArgumentException if the verification is not found or not COMPLETED
     */
    @Transactional
    public VerificationCertificate getOrIssue(UUID verificationId) {
        // Return existing certificate if already issued
        Optional<VerificationCertificate> existing = certRepository.findByVerificationId(verificationId);
        if (existing.isPresent()) {
            return existing.get();
        }

        // Fetch and validate the verification
        Verification verification = verificationRepository.findById(verificationId)
                .orElseThrow(() -> new IllegalArgumentException("Verification not found: " + verificationId));

        if (verification.getStatus() != Verification.VerificationStatus.COMPLETED) {
            throw new IllegalArgumentException(
                "Certificate can only be issued for COMPLETED verifications. " +
                "Current status: " + verification.getStatus());
        }

        // Build certificate payload
        Map<String, Object> payload = buildPayload(verification);

        // Sign the canonical JSON representation of the payload using KMS or local fallback
        String canonicalJson = toCanonicalJson(payload);
        String signature     = kmsSigningService.sign(canonicalJson);
        String publicKey     = kmsSigningService.getPublicKeyPem();

        Instant now       = Instant.now();
        Instant expiresAt = now.plusSeconds(CERT_VALIDITY_HOURS * 3600);

        VerificationCertificate cert = VerificationCertificate.builder()
                .verificationId(verificationId)
                .certificateData(payload)
                .signature(signature)
                .publicKey(publicKey)
                .issuedAt(now)
                .expiresAt(expiresAt)
                .revoked(false)
                .build();

        cert = certRepository.save(cert);

        // Update verification with the certificate reference
        verification.setCertificateId(cert.getId());
        verificationRepository.save(verification);

        log.info("Certificate {} issued for verification {}", cert.getId(), verificationId);
        return cert;
    }

    /**
     * Revokes a certificate by ID.
     *
     * @param certificateId  UUID of the certificate
     * @param reason         human-readable revocation reason
     */
    @Transactional
    public void revoke(UUID certificateId, String reason) {
        VerificationCertificate cert = certRepository.findById(certificateId)
                .orElseThrow(() -> new IllegalArgumentException("Certificate not found: " + certificateId));
        cert.setRevoked(true);
        cert.setRevocationReason(reason);
        certRepository.save(cert);
        log.info("Certificate {} revoked: {}", certificateId, reason);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private Map<String, Object> buildPayload(Verification v) {
        // Use TreeMap to ensure consistent key ordering for canonical JSON
        Map<String, Object> payload = new TreeMap<>();
        payload.put("verificationId",  v.getId().toString());
        payload.put("userId",          v.getUserId());
        payload.put("operationType",   v.getOperationType());
        payload.put("confidenceScore", v.getConfidenceScore());
        payload.put("componentScores", v.getComponentScores());
        payload.put("issuedAt",        Instant.now().toString());
        payload.put("expiresAt",       Instant.now().plusSeconds(CERT_VALIDITY_HOURS * 3600).toString());
        payload.put("issuer",          ISSUER);
        return payload;
    }

    /**
     * Serializes the payload to canonical JSON (sorted keys, no pretty-print).
     * The same canonical form must be used for both signing and verification.
     */
    private String toCanonicalJson(Map<String, Object> payload) {
        try {
            // TreeMap already has sorted keys; ObjectMapper preserves insertion order
            return objectMapper.writeValueAsString(payload);
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize certificate payload", e);
        }
    }
}
