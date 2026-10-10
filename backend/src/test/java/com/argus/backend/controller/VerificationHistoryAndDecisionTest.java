package com.argus.backend.controller;

import com.argus.backend.dto.ChallengeSubmissionRequest;
import com.argus.backend.dto.VerificationCompleteRequest;
import com.argus.backend.dto.VerifyResponse;
import com.argus.backend.entity.Verification;
import com.argus.backend.entity.Verification.VerificationStatus;
import com.argus.backend.model.VerificationReasonCode;
import com.argus.backend.model.VerificationVerdict;
import com.argus.backend.repository.VerificationRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.Instant;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class VerificationHistoryAndDecisionTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private VerificationRepository verificationRepository;

    private String getTestRealFaceImageBase64() throws Exception {
        byte[] faceBytes = new ClassPathResource("image_T1.jpg").getInputStream().readAllBytes();
        return "data:image/jpeg;base64," + Base64.getEncoder().encodeToString(faceBytes);
    }

    private String getTestSpoofFaceImageBase64() throws Exception {
        byte[] faceBytes = new ClassPathResource("image_F1.jpg").getInputStream().readAllBytes();
        return "data:image/jpeg;base64," + Base64.getEncoder().encodeToString(faceBytes);
    }

    private Verification seedVerification(String userId, VerificationStatus status, Double score, Instant createdAt) {
        Map<String, Object> compScores = new HashMap<>();
        if (status == VerificationStatus.COMPLETED) {
            compScores.put("liveness", 0.95);
            compScores.put("antiSpoof", 0.98);
            compScores.put("verdict", VerificationVerdict.PRESENCE_CONFIRMED.name());
        } else if (status == VerificationStatus.FAILED) {
            compScores.put("verdict", VerificationVerdict.INCONCLUSIVE.name());
            compScores.put("reasonCode", VerificationReasonCode.LOW_CONFIDENCE.name());
        }

        Verification v = Verification.builder()
                .userId(userId)
                .operationType("TRANSACTION")
                .status(status)
                .confidenceScore(score)
                .componentScores(compScores)
                .createdAt(createdAt != null ? createdAt : Instant.now())
                .updatedAt(Instant.now())
                .build();
        return verificationRepository.save(v);
    }

    @Nested
    @DisplayName("Stage 2 — Real Verification History (GET /api/v1/verify)")
    class Stage2HistoryTests {

        @Test
        void unauthenticated_Returns401() throws Exception {
            mockMvc.perform(get("/api/v1/verify"))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @WithMockUser(username = "alice_user", roles = {"USER"})
        void userReceivesOnlyOwnSessions() throws Exception {
            // Seed records for alice and bob
            seedVerification("alice_user", VerificationStatus.COMPLETED, 92.0, Instant.now().minusSeconds(100));
            seedVerification("alice_user", VerificationStatus.FAILED, 55.0, Instant.now().minusSeconds(50));
            seedVerification("bob_other", VerificationStatus.COMPLETED, 89.0, Instant.now().minusSeconds(10));

            mockMvc.perform(get("/api/v1/verify"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(greaterThanOrEqualTo(2))))
                    .andExpect(jsonPath("$.content[*].userId", everyItem(is("alice_user"))));
        }

        @Test
        @WithMockUser(username = "alice_user", roles = {"USER"})
        void userCannotRetrieveAnotherUserViaUserIdParameter() throws Exception {
            seedVerification("alice_user", VerificationStatus.COMPLETED, 92.0, Instant.now());
            seedVerification("bob_other", VerificationStatus.COMPLETED, 89.0, Instant.now());

            // Alice maliciously passes ?userId=bob_other
            mockMvc.perform(get("/api/v1/verify?userId=bob_other"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[*].userId", everyItem(is("alice_user"))));
        }

        @Test
        @WithMockUser(username = "admin_caller", roles = {"ADMIN"})
        void adminCanRetrieveBroaderSessionsAndFilterByUserId() throws Exception {
            seedVerification("alice_user", VerificationStatus.COMPLETED, 92.0, Instant.now());
            seedVerification("bob_other", VerificationStatus.COMPLETED, 89.0, Instant.now());

            // Admin without filter -> sees both
            mockMvc.perform(get("/api/v1/verify"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(greaterThanOrEqualTo(2))));

            // Admin with userId filter -> sees only bob
            mockMvc.perform(get("/api/v1/verify?userId=bob_other"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[*].userId", everyItem(is("bob_other"))));
        }

        @Test
        @WithMockUser(username = "superadmin_caller", roles = {"SUPERADMIN"})
        void superAdminCanRetrieveBroaderSessions() throws Exception {
            mockMvc.perform(get("/api/v1/verify"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content").isArray());
        }

        @Test
        @WithMockUser(username = "paged_user", roles = {"USER"})
        void paginationAndNewestFirstOrdering() throws Exception {
            Instant t0 = Instant.parse("2026-10-01T10:00:00Z");
            seedVerification("paged_user", VerificationStatus.COMPLETED, 81.0, t0.plusSeconds(10));
            seedVerification("paged_user", VerificationStatus.COMPLETED, 82.0, t0.plusSeconds(20));
            seedVerification("paged_user", VerificationStatus.COMPLETED, 83.0, t0.plusSeconds(30));

            // Page 0, size 2: newest records first (83.0, 82.0)
            mockMvc.perform(get("/api/v1/verify?page=0&size=2"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(2)))
                    .andExpect(jsonPath("$.page").value(0))
                    .andExpect(jsonPath("$.size").value(2))
                    .andExpect(jsonPath("$.content[0].confidenceScore").value(83.0))
                    .andExpect(jsonPath("$.content[1].confidenceScore").value(82.0));

            // Page 1, size 2: next record (81.0)
            mockMvc.perform(get("/api/v1/verify?page=1&size=2"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)))
                    .andExpect(jsonPath("$.content[0].confidenceScore").value(81.0));
        }

        @Test
        @WithMockUser(username = "filter_user", roles = {"USER"})
        void statusFilteringWorks() throws Exception {
            seedVerification("filter_user", VerificationStatus.COMPLETED, 91.0, Instant.now());
            seedVerification("filter_user", VerificationStatus.FAILED, 42.0, Instant.now());

            mockMvc.perform(get("/api/v1/verify?status=COMPLETED"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[*].status", everyItem(is("COMPLETED"))));

            mockMvc.perform(get("/api/v1/verify?status=FAILED"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[*].status", everyItem(is("FAILED"))));
        }

        @Test
        @WithMockUser(username = "empty_user", roles = {"USER"})
        void emptyResultsReturnCleanly() throws Exception {
            mockMvc.perform(get("/api/v1/verify"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(0)))
                    .andExpect(jsonPath("$.totalElements").value(0))
                    .andExpect(jsonPath("$.totalPages").value(0));
        }
    }

    @Nested
    @DisplayName("Stage 3 — Explainable Verification Decisions")
    class Stage3DecisionTests {

        @Test
        @WithMockUser(username = "dec_user1", roles = {"USER"})
        void initiatedAndInProgressYieldIncompleteVerdict() throws Exception {
            Verification v1 = seedVerification("dec_user1", VerificationStatus.INITIATED, null, Instant.now());
            Verification v2 = seedVerification("dec_user1", VerificationStatus.IN_PROGRESS, null, Instant.now());

            mockMvc.perform(get("/api/v1/verify/" + v1.getId()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("INITIATED"))
                    .andExpect(jsonPath("$.verdict").value("INCOMPLETE"))
                    .andExpect(jsonPath("$.reasonCode").value("INCOMPLETE"))
                    .andExpect(jsonPath("$.reason").isNotEmpty());

            mockMvc.perform(get("/api/v1/verify/" + v2.getId()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("IN_PROGRESS"))
                    .andExpect(jsonPath("$.verdict").value("INCOMPLETE"));
        }

        @Test
        @WithMockUser(username = "dec_user2", roles = {"USER"})
        void successfulVerificationYieldsPresenceConfirmed() throws Exception {
            Verification v = seedVerification("dec_user2", VerificationStatus.INITIATED, null, Instant.now());

            // Provide real face
            mockMvc.perform(post("/api/v1/verify/" + v.getId() + "/face")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of("image", getTestRealFaceImageBase64()))))
                    .andExpect(status().isOk());

            // Complete with passing scores (>= 80%)
            VerificationCompleteRequest completeReq = VerificationCompleteRequest.builder()
                    .signalQuality(0.95)
                    .averageBpm(72.0)
                    .challengePassed(true)
                    .blinkDynamicsScore(0.92)
                    .behaviorScore(0.91)
                    .build();

            mockMvc.perform(post("/api/v1/verify/" + v.getId() + "/complete")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(completeReq)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("COMPLETED"))
                    .andExpect(jsonPath("$.verdict").value("PRESENCE_CONFIRMED"))
                    .andExpect(jsonPath("$.reasonCode").doesNotExist())
                    .andExpect(jsonPath("$.reason").isNotEmpty());
        }

        @Test
        @WithMockUser(username = "dec_user3", roles = {"USER"})
        void spoofAttackYieldsPresenceNotConfirmedWithSpoofReasonCode() throws Exception {
            Verification v = seedVerification("dec_user3", VerificationStatus.INITIATED, null, Instant.now());

            // Face with spoof (image_F1 printed attack)
            mockMvc.perform(post("/api/v1/verify/" + v.getId() + "/face")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of("image", getTestSpoofFaceImageBase64()))))
                    .andExpect(status().isOk());

            VerificationCompleteRequest completeReq = VerificationCompleteRequest.builder()
                    .signalQuality(0.90)
                    .averageBpm(72.0)
                    .challengePassed(true)
                    .build();

            mockMvc.perform(post("/api/v1/verify/" + v.getId() + "/complete")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(completeReq)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("FAILED"))
                    .andExpect(jsonPath("$.verdict").value("PRESENCE_NOT_CONFIRMED"))
                    .andExpect(jsonPath("$.reasonCode").value("SPOOF_DETECTED"))
                    .andExpect(jsonPath("$.reason", containsString("Presentation attack detected")));
        }

        @Test
        @WithMockUser(username = "dec_user4", roles = {"USER"})
        void challengeFailureYieldsPresenceNotConfirmedWithChallengeFailedReasonCode() throws Exception {
            Verification v = seedVerification("dec_user4", VerificationStatus.INITIATED, null, Instant.now());

            // Real face
            mockMvc.perform(post("/api/v1/verify/" + v.getId() + "/face")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of("image", getTestRealFaceImageBase64()))))
                    .andExpect(status().isOk());

            // Challenge failed
            VerificationCompleteRequest completeReq = VerificationCompleteRequest.builder()
                    .signalQuality(0.95)
                    .averageBpm(72.0)
                    .challengePassed(false)
                    .build();

            mockMvc.perform(post("/api/v1/verify/" + v.getId() + "/complete")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(completeReq)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("FAILED"))
                    .andExpect(jsonPath("$.verdict").value("PRESENCE_NOT_CONFIRMED"))
                    .andExpect(jsonPath("$.reasonCode").value("CHALLENGE_FAILED"))
                    .andExpect(jsonPath("$.reason", containsString("challenge")));
        }

        @Test
        @WithMockUser(username = "dec_user5", roles = {"USER"})
        void multipleFacesYieldsPresenceNotConfirmedWithMultipleFacesReasonCode() throws Exception {
            Verification v = seedVerification("dec_user5", VerificationStatus.INITIATED, null, Instant.now());

            // Directly inject multiple faces in componentScores
            Map<String, Object> compScores = new HashMap<>();
            compScores.put("antiSpoofClassification", "MULTIPLE_FACES");
            compScores.put("antiSpoofReal", false);
            compScores.put("antiSpoof", 0.0);
            v.setComponentScores(compScores);
            verificationRepository.save(v);

            VerificationCompleteRequest completeReq = VerificationCompleteRequest.builder()
                    .signalQuality(0.90)
                    .averageBpm(72.0)
                    .challengePassed(true)
                    .build();

            mockMvc.perform(post("/api/v1/verify/" + v.getId() + "/complete")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(completeReq)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("FAILED"))
                    .andExpect(jsonPath("$.verdict").value("PRESENCE_NOT_CONFIRMED"))
                    .andExpect(jsonPath("$.reasonCode").value("MULTIPLE_FACES"))
                    .andExpect(jsonPath("$.reason", containsString("Multiple faces detected")));
        }

        @Test
        @WithMockUser(username = "dec_user6", roles = {"USER"})
        void nonFatalLowConfidenceYieldsInconclusive() throws Exception {
            Verification v = seedVerification("dec_user6", VerificationStatus.INITIATED, null, Instant.now());

            // Pass face image that is REAL
            mockMvc.perform(post("/api/v1/verify/" + v.getId() + "/face")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of("image", getTestRealFaceImageBase64()))))
                    .andExpect(status().isOk());

            // Complete with marginal/low physiological & behavioral quality (e.g. 0.40) so total score < 80%
            // and no fatal violations
            VerificationCompleteRequest completeReq = VerificationCompleteRequest.builder()
                    .signalQuality(0.35)
                    .averageBpm(60.0)
                    .challengePassed(true)
                    .blinkDynamicsScore(0.30)
                    .behaviorScore(0.30)
                    .build();

            mockMvc.perform(post("/api/v1/verify/" + v.getId() + "/complete")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(completeReq)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("FAILED"))
                    .andExpect(jsonPath("$.verdict").value("INCONCLUSIVE"))
                    .andExpect(jsonPath("$.reasonCode").value("LOW_CONFIDENCE"))
                    .andExpect(jsonPath("$.reason", containsString("confidence threshold")));
        }
    }
}
