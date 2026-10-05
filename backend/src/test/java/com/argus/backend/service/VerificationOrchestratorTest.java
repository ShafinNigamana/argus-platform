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
}
