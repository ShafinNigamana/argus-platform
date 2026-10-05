package com.argus.backend.controller;

import com.argus.backend.dto.VerifyRequest;
import com.argus.backend.dto.VerifyResponse;
import com.argus.backend.entity.VerificationCertificate;
import com.argus.backend.service.AuditLogService;
import com.argus.backend.service.CertificateService;
import com.argus.backend.service.VerificationOrchestrator;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class VerificationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private VerificationOrchestrator orchestrator;

    @MockBean
    private CertificateService certificateService;

    @MockBean
    private AuditLogService auditLogService;

    @Test
    void initiateVerification_Unauthenticated_Returns401() throws Exception {
        VerifyRequest request = VerifyRequest.builder()
                .userId("user123")
                .operationType("TRANSACTION")
                .metadata(Map.of())
                .build();

        mockMvc.perform(post("/api/v1/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "testuser", roles = {"USER"})
    void initiateVerification_Authenticated_Returns200WithId() throws Exception {
        UUID vId = UUID.randomUUID();
        VerifyRequest request = VerifyRequest.builder()
                .userId("user123")
                .operationType("TRANSACTION")
                .metadata(Map.of())
                .build();

        VerifyResponse response = VerifyResponse.builder()
                .verificationId(vId)
                .status("INITIATED")
                .redirectUrl("/verify/" + vId)
                .createdAt(Instant.now())
                .build();

        when(orchestrator.initiate(any(VerifyRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/v1/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.verificationId").value(vId.toString()))
                .andExpect(jsonPath("$.status").value("INITIATED"));
    }

    @Test
    @WithMockUser(username = "testuser", roles = {"USER"})
    void getStatus_Authenticated_Returns200WithScores() throws Exception {
        UUID vId = UUID.randomUUID();
        VerifyResponse response = VerifyResponse.builder()
                .verificationId(vId)
                .status("COMPLETED")
                .confidenceScore(91.5)
                .componentScores(Map.of("liveness", 0.92))
                .createdAt(Instant.now())
                .build();

        when(orchestrator.getStatus(vId)).thenReturn(response);

        mockMvc.perform(get("/api/v1/verify/" + vId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.verificationId").value(vId.toString()))
                .andExpect(jsonPath("$.confidenceScore").value(91.5))
                .andExpect(jsonPath("$.status").value("COMPLETED"));
    }

    @Test
    @WithMockUser(username = "testuser", roles = {"USER"})
    void getCertificate_Authenticated_Returns200WithSignature() throws Exception {
        UUID vId = UUID.randomUUID();
        UUID certId = UUID.randomUUID();
        VerificationCertificate cert = VerificationCertificate.builder()
                .id(certId)
                .verificationId(vId)
                .certificateData(Map.of("confidenceScore", 91.5))
                .signature("dummy-sha256-signature")
                .publicKey("dummy-pubkey")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(86400))
                .revoked(false)
                .build();

        when(certificateService.getOrIssue(vId)).thenReturn(cert);

        mockMvc.perform(get("/api/v1/verify/" + vId + "/certificate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.certificateId").value(certId.toString()))
                .andExpect(jsonPath("$.signature").value("dummy-sha256-signature"))
                .andExpect(jsonPath("$.revoked").value(false));
    }
}
