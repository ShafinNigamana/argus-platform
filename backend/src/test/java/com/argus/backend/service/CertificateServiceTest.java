package com.argus.backend.service;

import com.argus.backend.entity.Verification;
import com.argus.backend.entity.VerificationCertificate;
import com.argus.backend.repository.VerificationCertificateRepository;
import com.argus.backend.repository.VerificationRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

class CertificateServiceTest {

    private VerificationCertificateRepository certRepository;
    private VerificationRepository verificationRepository;
    private KmsSigningService kmsSigningService;
    private CertificateService certificateService;

    @BeforeEach
    void setUp() {
        certRepository = Mockito.mock(VerificationCertificateRepository.class);
        verificationRepository = Mockito.mock(VerificationRepository.class);
        kmsSigningService = new KmsSigningService(); // uses local SHA-256 fallback
        certificateService = new CertificateService(
                certRepository,
                verificationRepository,
                new ObjectMapper(),
                kmsSigningService
        );
    }

    @Test
    void getOrIssue_WhenCompleted_IssuesCertificateSuccessfully() {
        UUID vId = UUID.randomUUID();
        Verification verification = Verification.builder()
                .id(vId)
                .userId("test-user")
                .operationType("TRANSACTION")
                .status(Verification.VerificationStatus.COMPLETED)
                .confidenceScore(94.0)
                .componentScores(Map.of("liveness", 0.95))
                .build();

        when(certRepository.findByVerificationId(vId)).thenReturn(Optional.empty());
        when(verificationRepository.findById(vId)).thenReturn(Optional.of(verification));
        when(certRepository.save(any(VerificationCertificate.class))).thenAnswer(invocation -> {
            VerificationCertificate c = invocation.getArgument(0);
            c.setId(UUID.randomUUID());
            return c;
        });

        VerificationCertificate cert = certificateService.getOrIssue(vId);

        assertNotNull(cert);
        assertNotNull(cert.getSignature());
        assertNotNull(cert.getIssuedAt());
        assertNotNull(cert.getExpiresAt());
        assertFalse(cert.isRevoked());
        assertEquals(vId, cert.getVerificationId());
    }

    @Test
    void getOrIssue_WhenAlreadyIssued_ReturnsExistingCertificate() {
        UUID vId = UUID.randomUUID();
        VerificationCertificate existing = VerificationCertificate.builder()
                .id(UUID.randomUUID())
                .verificationId(vId)
                .signature("existing-sig")
                .build();

        when(certRepository.findByVerificationId(vId)).thenReturn(Optional.of(existing));

        VerificationCertificate cert = certificateService.getOrIssue(vId);
        assertSame(existing, cert);
    }

    @Test
    void getOrIssue_WhenVerificationNotCompleted_ThrowsException() {
        UUID vId = UUID.randomUUID();
        Verification verification = Verification.builder()
                .id(vId)
                .userId("test-user")
                .operationType("TRANSACTION")
                .status(Verification.VerificationStatus.IN_PROGRESS)
                .build();

        when(certRepository.findByVerificationId(vId)).thenReturn(Optional.empty());
        when(verificationRepository.findById(vId)).thenReturn(Optional.of(verification));

        assertThrows(IllegalArgumentException.class, () -> certificateService.getOrIssue(vId));
    }
}
