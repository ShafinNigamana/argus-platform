package com.argus.backend.service;

import com.argus.backend.dto.VerifyRequest;
import com.argus.backend.dto.VerifyResponse;
import com.argus.backend.entity.Verification;
import com.argus.backend.repository.VerificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

class VerificationOrchestratorTest {

    private VerificationRepository verificationRepository;
    private VerificationOrchestrator orchestrator;

    @BeforeEach
    void setUp() {
        verificationRepository = Mockito.mock(VerificationRepository.class);
        orchestrator = new VerificationOrchestrator(verificationRepository);
    }

    @Test
    void initiate_CreatesVerificationWithInitiatedStatus() {
        UUID vId = UUID.randomUUID();
        VerifyRequest request = VerifyRequest.builder()
                .userId("client_999")
                .operationType("TRANSFER")
                .metadata(Map.of("amount", 100))
                .build();

        when(verificationRepository.save(any(Verification.class))).thenAnswer(invocation -> {
            Verification v = invocation.getArgument(0);
            v.setId(vId);
            return v;
        });

        VerifyResponse response = orchestrator.initiate(request);

        assertNotNull(response);
        assertEquals(vId, response.getVerificationId());
        assertEquals("INITIATED", response.getStatus());
        assertEquals("client_999", response.getUserId());
    }

    @Test
    void getStatus_Found_ReturnsVerifyResponse() {
        UUID vId = UUID.randomUUID();
        Verification v = Verification.builder()
                .id(vId)
                .userId("client_999")
                .operationType("TRANSFER")
                .status(Verification.VerificationStatus.COMPLETED)
                .confidenceScore(95.0)
                .build();

        when(verificationRepository.findById(vId)).thenReturn(Optional.of(v));

        VerifyResponse response = orchestrator.getStatus(vId);

        assertNotNull(response);
        assertEquals(vId, response.getVerificationId());
        assertEquals("COMPLETED", response.getStatus());
        assertEquals(95.0, response.getConfidenceScore());
    }

    @Test
    void getStatus_NotFound_ThrowsException() {
        UUID vId = UUID.randomUUID();
        when(verificationRepository.findById(vId)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> orchestrator.getStatus(vId));
    }

    @Test
    void verifyFace_AttachesAntiSpoofScoresAndTransitionsToInProgress() {
        UUID vId = UUID.randomUUID();
        Verification v = Verification.builder()
                .id(vId)
                .userId("client_999")
                .operationType("TRANSFER")
                .status(Verification.VerificationStatus.INITIATED)
                .build();

        OnnxLivenessService onnxService = Mockito.mock(OnnxLivenessService.class);
        GeminiForensicService forensicService = Mockito.mock(GeminiForensicService.class);
        CertificateService certService = Mockito.mock(CertificateService.class);

        VerificationOrchestrator fullOrchestrator = new VerificationOrchestrator(
                verificationRepository, onnxService, forensicService, certService);

        when(verificationRepository.findById(vId)).thenReturn(Optional.of(v));
        when(verificationRepository.save(any(Verification.class))).thenAnswer(i -> i.getArgument(0));

        com.argus.backend.dto.AntiSpoofResponse mlResp = com.argus.backend.dto.AntiSpoofResponse.builder()
                .isReal(true)
                .livenessScore(0.97)
                .classification("REAL")
                .reasoning("Natural human face confirmed")
                .inferenceTimeMs(15)
                .build();
        when(onnxService.evaluateBase64Image("dummy-base64")).thenReturn(mlResp);

        com.argus.backend.dto.AntiSpoofResponse result = fullOrchestrator.verifyFace(vId, "dummy-base64");

        assertNotNull(result);
        assertTrue(result.isReal());
        assertEquals(0.97, result.getLivenessScore());
        assertEquals("REAL", result.getClassification());
        assertEquals(Verification.VerificationStatus.IN_PROGRESS, v.getStatus());
        assertNotNull(v.getComponentScores());
        assertEquals(0.97, v.getComponentScores().get("antiSpoof"));
        assertEquals(true, v.getComponentScores().get("antiSpoofReal"));
    }

    @Test
    void evaluateAndComplete_MultiSignalPass_IssuesCertificate() {
        UUID vId = UUID.randomUUID();
        UUID certId = UUID.randomUUID();
        Verification v = Verification.builder()
                .id(vId)
                .userId("client_999")
                .operationType("TRANSFER")
                .status(Verification.VerificationStatus.IN_PROGRESS)
                .componentScores(new java.util.HashMap<>(Map.of("challenge", 1.0, "antiSpoof", 0.96, "antiSpoofReal", true)))
                .build();

        OnnxLivenessService onnxService = Mockito.mock(OnnxLivenessService.class);
        GeminiForensicService forensicService = Mockito.mock(GeminiForensicService.class);
        CertificateService certService = Mockito.mock(CertificateService.class);

        VerificationOrchestrator fullOrchestrator = new VerificationOrchestrator(
                verificationRepository, onnxService, forensicService, certService);

        when(verificationRepository.findById(vId)).thenReturn(Optional.of(v));
        when(verificationRepository.save(any(Verification.class))).thenAnswer(i -> i.getArgument(0));
        when(forensicService.analyzeLiveness(any())).thenReturn(
                com.argus.backend.dto.AiReasoningResponse.builder()
                        .aiLivenessScore(0.95)
                        .confidence("HIGH")
                        .forensicReasoning("Presence validated")
                        .build()
        );

        com.argus.backend.entity.VerificationCertificate cert = com.argus.backend.entity.VerificationCertificate.builder()
                .id(certId)
                .verificationId(vId)
                .signature("sig-123")
                .issuedAt(java.time.Instant.now())
                .expiresAt(java.time.Instant.now().plusSeconds(86400))
                .build();
        when(certService.getOrIssue(vId)).thenReturn(cert);

        com.argus.backend.dto.VerificationCompleteRequest req = com.argus.backend.dto.VerificationCompleteRequest.builder()
                .signalQuality(0.92)
                .averageBpm(74.0)
                .challengePassed(true)
                .behaviorScore(0.90)
                .build();

        VerifyResponse resp = fullOrchestrator.evaluateAndComplete(vId, req);

        assertNotNull(resp);
        assertEquals("COMPLETED", resp.getStatus());
        assertTrue(resp.getConfidenceScore() >= 80.0);
        assertEquals(certId, resp.getCertificateId());
        Mockito.verify(certService).getOrIssue(vId);
    }

    @Test
    void evaluateAndComplete_MultipleFaces_FailsVerification() {
        UUID vId = UUID.randomUUID();
        Verification v = Verification.builder()
                .id(vId)
                .userId("client_999")
                .operationType("TRANSFER")
                .status(Verification.VerificationStatus.IN_PROGRESS)
                .componentScores(new java.util.HashMap<>(Map.of("antiSpoofClassification", "MULTIPLE_FACES", "antiSpoofReal", false)))
                .build();

        OnnxLivenessService onnxService = Mockito.mock(OnnxLivenessService.class);
        GeminiForensicService forensicService = Mockito.mock(GeminiForensicService.class);
        CertificateService certService = Mockito.mock(CertificateService.class);

        VerificationOrchestrator fullOrchestrator = new VerificationOrchestrator(
                verificationRepository, onnxService, forensicService, certService);

        when(verificationRepository.findById(vId)).thenReturn(Optional.of(v));
        when(verificationRepository.save(any(Verification.class))).thenAnswer(i -> i.getArgument(0));

        com.argus.backend.dto.VerificationCompleteRequest req = com.argus.backend.dto.VerificationCompleteRequest.builder()
                .signalQuality(0.90)
                .challengePassed(true)
                .build();

        VerifyResponse resp = fullOrchestrator.evaluateAndComplete(vId, req);

        assertNotNull(resp);
        assertEquals("FAILED", resp.getStatus());
        Mockito.verifyNoInteractions(certService);
    }
}
