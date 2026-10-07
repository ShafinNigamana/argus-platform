package com.argus.backend.integration;

import com.argus.backend.dto.LoginRequest;
import com.argus.backend.dto.TokenResponse;
import com.argus.backend.dto.VerificationCompleteRequest;
import com.argus.backend.dto.VerifyRequest;
import com.argus.backend.dto.VerifyResponse;
import com.argus.backend.entity.Verification;
import com.argus.backend.entity.VerificationCertificate;
import com.argus.backend.repository.VerificationCertificateRepository;
import com.argus.backend.repository.VerificationRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Base64;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end integration test verifying the unified Argus SGP verification pipeline:
 * Auth -> Verification Initiation -> Face Anti-Spoof (ONNX) -> Challenge -> Complete Decision -> DB -> Certificate.
 */
@SpringBootTest
@AutoConfigureMockMvc
class VerificationPipelineIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private VerificationRepository verificationRepository;

    @Autowired
    private VerificationCertificateRepository certificateRepository;

    @Test
    void fullVerificationPipeline_EndToEnd_PassesAndAnchorsCertificate() throws Exception {
        // 1. Authenticate with default seeded user credentials
        LoginRequest loginReq = LoginRequest.builder()
                .username("user")
                .password("userPassword123")
                .build();

        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk())
                .andReturn();

        TokenResponse tokenResp = objectMapper.readValue(loginResult.getResponse().getContentAsString(), TokenResponse.class);
        assertNotNull(tokenResp.getAccessToken());
        String authHeader = "Bearer " + tokenResp.getAccessToken();

        // 2. Initiate Verification
        VerifyRequest initiateReq = VerifyRequest.builder()
                .userId("client_e2e_1001")
                .operationType("HIGH_VALUE_TRANSACTION")
                .metadata(Map.of("ipAddress", "192.168.1.55", "amount", 125000))
                .build();

        MvcResult initiateResult = mockMvc.perform(post("/api/v1/verify")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(initiateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("INITIATED"))
                .andReturn();

        VerifyResponse initResponse = objectMapper.readValue(initiateResult.getResponse().getContentAsString(), VerifyResponse.class);
        UUID vId = initResponse.getVerificationId();
        assertNotNull(vId);

        // 3. Submit Challenge Response
        String challengeJson = """
                {
                  "challengeId": "chl_blink_2",
                  "response": { "completed": true, "durationMs": 1800, "blinkCount": 2 },
                  "timestamp": 1728144000000
                }
                """;

        mockMvc.perform(post("/api/v1/challenges/" + vId)
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(challengeJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(true));

        // 4. Submit Real Face Image for ONNX Anti-Spoofing (MiniFASNetV2-SE)
        byte[] realFaceBytes = new ClassPathResource("image_T1.jpg").getInputStream().readAllBytes();
        String realFaceBase64 = "data:image/jpeg;base64," + Base64.getEncoder().encodeToString(realFaceBytes);

        String facePayload = objectMapper.writeValueAsString(Map.of("image", realFaceBase64));

        mockMvc.perform(post("/api/v1/verify/" + vId + "/face")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(facePayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.classification").value("REAL"))
                .andExpect(jsonPath("$.real").value(true));

        // 5. Complete Verification (Multi-Signal Fusion: rPPG + Behavior + Challenge + ONNX/PAD + AI)
        VerificationCompleteRequest completeReq = VerificationCompleteRequest.builder()
                .signalQuality(0.95)
                .averageBpm(72.0)
                .challengePassed(true)
                .blinkDynamicsScore(0.92)
                .behaviorScore(0.91)
                .build();

        MvcResult completeResult = mockMvc.perform(post("/api/v1/verify/" + vId + "/complete")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(completeReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andReturn();

        VerifyResponse completedResp = objectMapper.readValue(completeResult.getResponse().getContentAsString(), VerifyResponse.class);
        assertEquals("COMPLETED", completedResp.getStatus());
        assertTrue(completedResp.getConfidenceScore() >= 80.0, "Score should satisfy policy threshold");
        assertNotNull(completedResp.getCertificateId(), "Certificate must be automatically generated and linked");

        // 6. Retrieve Certificate from Trust Layer
        MvcResult certResult = mockMvc.perform(get("/api/v1/verify/" + vId + "/certificate")
                        .header("Authorization", authHeader))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.certificateId").value(completedResp.getCertificateId().toString()))
                .andExpect(jsonPath("$.signature").isNotEmpty())
                .andExpect(jsonPath("$.revoked").value(false))
                .andReturn();

        // 7. Verify Database Persistence (PostgreSQL/JPA)
        Verification persistedVerification = verificationRepository.findById(vId).orElseThrow();
        assertEquals(Verification.VerificationStatus.COMPLETED, persistedVerification.getStatus());
        assertEquals(completedResp.getConfidenceScore(), persistedVerification.getConfidenceScore());
        assertNotNull(persistedVerification.getComponentScores());
        assertEquals(0.95, persistedVerification.getComponentScores().get("rppgQuality"));
        assertNotNull(persistedVerification.getComponentScores().get("antiSpoof"));

        VerificationCertificate persistedCert = certificateRepository.findById(completedResp.getCertificateId()).orElseThrow();
        assertEquals(vId, persistedCert.getVerificationId());
        assertFalse(persistedCert.isRevoked());
        assertNotNull(persistedCert.getSignature());
    }

    @Test
    void multiFaceSpoofAttack_RejectedByPolicy() throws Exception {
        // Authenticate
        LoginRequest loginReq = LoginRequest.builder().username("user").password("userPassword123").build();
        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk())
                .andReturn();
        TokenResponse tokenResp = objectMapper.readValue(loginResult.getResponse().getContentAsString(), TokenResponse.class);
        String authHeader = "Bearer " + tokenResp.getAccessToken();

        // Initiate
        VerifyRequest initiateReq = VerifyRequest.builder()
                .userId("client_multi_face")
                .operationType("LOGIN")
                .build();
        MvcResult initResult = mockMvc.perform(post("/api/v1/verify")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(initiateReq)))
                .andExpect(status().isOk())
                .andReturn();
        VerifyResponse initResponse = objectMapper.readValue(initResult.getResponse().getContentAsString(), VerifyResponse.class);
        UUID vId = initResponse.getVerificationId();

        // Pass spoof image (F1 printed photo attack)
        byte[] fakeFaceBytes = new ClassPathResource("image_F1.jpg").getInputStream().readAllBytes();
        String fakeFaceBase64 = "data:image/jpeg;base64," + Base64.getEncoder().encodeToString(fakeFaceBytes);

        mockMvc.perform(post("/api/v1/verify/" + vId + "/face")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("image", fakeFaceBase64))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.real").value(false));

        // Complete Verification
        VerificationCompleteRequest completeReq = VerificationCompleteRequest.builder()
                .signalQuality(0.60)
                .averageBpm(70.0)
                .challengePassed(true)
                .build();

        mockMvc.perform(post("/api/v1/verify/" + vId + "/complete")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(completeReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("FAILED"));

        // Confirm NO certificate is issued
        mockMvc.perform(get("/api/v1/verify/" + vId + "/certificate")
                        .header("Authorization", authHeader))
                .andExpect(status().isBadRequest());
    }
}
