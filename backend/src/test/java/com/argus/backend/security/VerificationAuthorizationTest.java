package com.argus.backend.security;

import com.argus.backend.dto.ChallengeSubmissionRequest;
import com.argus.backend.dto.VerificationCompleteRequest;
import com.argus.backend.dto.VerifyRequest;
import com.argus.backend.dto.VerifyResponse;
import com.argus.backend.entity.AuditLog;
import com.argus.backend.entity.Verification;
import com.argus.backend.entity.VerificationCertificate;
import com.argus.backend.repository.AuditLogRepository;
import com.argus.backend.repository.VerificationCertificateRepository;
import com.argus.backend.repository.VerificationRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests verifying Stage 1 Security & Data Ownership Hardening:
 * <ul>
 *   <li>D1: Verification creation binds owner strictly to authenticated principal.</li>
 *   <li>D2: Read endpoints allow owner, ROLE_ADMIN, and ROLE_SUPERADMIN.</li>
 *   <li>D3: Mutating endpoints are strictly OWNER ONLY (even for admins).</li>
 *   <li>D4: Authorization executes before any side effect (inference, state change, cert issuance).</li>
 *   <li>D5: Unknown id returns 404, unauthorized access returns 403.</li>
 * </ul>
 */
@SpringBootTest
@AutoConfigureMockMvc
class VerificationAuthorizationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private VerificationRepository verificationRepository;

    @Autowired
    private VerificationCertificateRepository certificateRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    // Helper to create a persisted verification entity
    private Verification createVerification(String ownerUserId, Verification.VerificationStatus status) {
        Verification v = Verification.builder()
                .userId(ownerUserId)
                .operationType("TRANSACTION")
                .status(status)
                .confidenceScore(status == Verification.VerificationStatus.COMPLETED ? 92.0 : null)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        return verificationRepository.save(v);
    }

    private String getTestFaceImageBase64() throws Exception {
        byte[] faceBytes = new ClassPathResource("image_T1.jpg").getInputStream().readAllBytes();
        return "data:image/jpeg;base64," + Base64.getEncoder().encodeToString(faceBytes);
    }

    @Nested
    @DisplayName("Creation Authorization (D1)")
    class CreationTests {

        @Test
        @WithMockUser(username = "alice", roles = {"USER"})
        void userCreatesWithForeignUserId_StoredUserIdEqualsPrincipal() throws Exception {
            VerifyRequest req = VerifyRequest.builder()
                    .userId("bob_attempted_spoof_user_id")
                    .operationType("TRANSACTION")
                    .metadata(Map.of("ip", "10.0.0.1"))
                    .build();

            MvcResult result = mockMvc.perform(post("/api/v1/verify")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.verificationId").isNotEmpty())
                    .andExpect(jsonPath("$.status").value("INITIATED"))
                    .andReturn();

            VerifyResponse response = objectMapper.readValue(result.getResponse().getContentAsString(), VerifyResponse.class);
            Verification saved = verificationRepository.findById(response.getVerificationId()).orElseThrow();

            // Must match authenticated principal "alice", NOT "bob_attempted_spoof_user_id"
            assertEquals("alice", saved.getUserId());
        }

        @Test
        @WithMockUser(username = "admin_user", roles = {"ADMIN"})
        void adminCreatesWithForeignUserId_StoredUserIdEqualsAdminPrincipal() throws Exception {
            VerifyRequest req = VerifyRequest.builder()
                    .userId("someone_else_id")
                    .operationType("ADMIN_ACTION")
                    .build();

            MvcResult result = mockMvc.perform(post("/api/v1/verify")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.verificationId").isNotEmpty())
                    .andReturn();

            VerifyResponse response = objectMapper.readValue(result.getResponse().getContentAsString(), VerifyResponse.class);
            Verification saved = verificationRepository.findById(response.getVerificationId()).orElseThrow();

            // Must match admin principal
            assertEquals("admin_user", saved.getUserId());
        }
    }

    @Nested
    @DisplayName("Read Authorization (D2, D5)")
    class ReadTests {

        @Test
        @WithMockUser(username = "owner_alice", roles = {"USER"})
        void read_OwnerCanReadVerificationAndCertificate() throws Exception {
            Verification v = createVerification("owner_alice", Verification.VerificationStatus.COMPLETED);

            // Read verification status
            mockMvc.perform(get("/api/v1/verify/" + v.getId()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.verificationId").value(v.getId().toString()));

            // Read certificate
            mockMvc.perform(get("/api/v1/verify/" + v.getId() + "/certificate"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.verificationId").value(v.getId().toString()));
        }

        @Test
        @WithMockUser(username = "different_user", roles = {"USER"})
        void read_DifferentUserDeniedWith403() throws Exception {
            Verification v = createVerification("owner_alice", Verification.VerificationStatus.COMPLETED);

            // Read status denied
            mockMvc.perform(get("/api/v1/verify/" + v.getId()))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403))
                    .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));

            // Read certificate denied
            mockMvc.perform(get("/api/v1/verify/" + v.getId() + "/certificate"))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403))
                    .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));
        }

        @Test
        @WithMockUser(username = "admin_caller", roles = {"ADMIN"})
        void read_AdminCanReadNonOwnedVerificationAndCertificate() throws Exception {
            Verification v = createVerification("owner_alice", Verification.VerificationStatus.COMPLETED);

            mockMvc.perform(get("/api/v1/verify/" + v.getId()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.verificationId").value(v.getId().toString()));

            mockMvc.perform(get("/api/v1/verify/" + v.getId() + "/certificate"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.verificationId").value(v.getId().toString()));
        }

        @Test
        @WithMockUser(username = "superadmin_caller", roles = {"SUPERADMIN"})
        void read_SuperAdminCanReadNonOwnedVerificationAndCertificate() throws Exception {
            Verification v = createVerification("owner_alice", Verification.VerificationStatus.COMPLETED);

            mockMvc.perform(get("/api/v1/verify/" + v.getId()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.verificationId").value(v.getId().toString()));

            mockMvc.perform(get("/api/v1/verify/" + v.getId() + "/certificate"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.verificationId").value(v.getId().toString()));
        }

        @Test
        @WithMockUser(username = "auditor", roles = {"AUDIT"})
        void read_AuditRolePermittedToRead_DeniedToMutate() throws Exception {
            Verification v = createVerification("owner_alice", Verification.VerificationStatus.COMPLETED);

            // SecurityConfig & VerificationAccessGuard permits AUDIT to read verification and certificate
            mockMvc.perform(get("/api/v1/verify/" + v.getId()))
                    .andExpect(status().isOk());

            mockMvc.perform(get("/api/v1/verify/" + v.getId() + "/certificate"))
                    .andExpect(status().isOk());

            // But AUDIT role is strictly denied from mutating verification
            mockMvc.perform(post("/api/v1/verify/" + v.getId() + "/face")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"image\":\"data:image/jpeg;base64,dGVzdA==\"}"))
                    .andExpect(status().isForbidden());
        }

        @Test
        void read_UnauthenticatedReturns401() throws Exception {
            Verification v = createVerification("owner_alice", Verification.VerificationStatus.COMPLETED);

            mockMvc.perform(get("/api/v1/verify/" + v.getId()))
                    .andExpect(status().isUnauthorized());

            mockMvc.perform(get("/api/v1/verify/" + v.getId() + "/certificate"))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @WithMockUser(username = "owner_alice", roles = {"USER"})
        void read_UnknownIdReturns404() throws Exception {
            UUID unknownId = UUID.randomUUID();

            mockMvc.perform(get("/api/v1/verify/" + unknownId))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.status").value(404));

            mockMvc.perform(get("/api/v1/verify/" + unknownId + "/certificate"))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.status").value(404));
        }
    }

    @Nested
    @DisplayName("Mutating Authorization (D3, D4, D5)")
    class MutatingTests {

        @Test
        @WithMockUser(username = "owner_alice", roles = {"USER"})
        void mutate_OwnerCanSubmitFaceAndChallengeAndComplete() throws Exception {
            Verification v = createVerification("owner_alice", Verification.VerificationStatus.INITIATED);

            // 1. Face
            String faceJson = objectMapper.writeValueAsString(Map.of("image", getTestFaceImageBase64()));
            mockMvc.perform(post("/api/v1/verify/" + v.getId() + "/face")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(faceJson))
                    .andExpect(status().isOk());

            // 2. Challenge
            ChallengeSubmissionRequest challengeReq = ChallengeSubmissionRequest.builder()
                    .challengeId("chl_blink_1")
                    .response(Map.of("completed", true))
                    .timestamp(System.currentTimeMillis())
                    .build();
            mockMvc.perform(post("/api/v1/challenges/" + v.getId())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(challengeReq)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.valid").value(true));

            // 3. Complete
            VerificationCompleteRequest completeReq = VerificationCompleteRequest.builder()
                    .signalQuality(0.9)
                    .averageBpm(72.0)
                    .challengePassed(true)
                    .build();
            mockMvc.perform(post("/api/v1/verify/" + v.getId() + "/complete")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(completeReq)))
                    .andExpect(status().isOk());
        }

        @Test
        @WithMockUser(username = "different_user", roles = {"USER"})
        void mutate_DifferentUserDeniedWith403() throws Exception {
            Verification v = createVerification("owner_alice", Verification.VerificationStatus.INITIATED);

            // Face
            String faceJson = objectMapper.writeValueAsString(Map.of("image", getTestFaceImageBase64()));
            mockMvc.perform(post("/api/v1/verify/" + v.getId() + "/face")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(faceJson))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403));

            // Challenge
            ChallengeSubmissionRequest challengeReq = ChallengeSubmissionRequest.builder()
                    .challengeId("chl_blink_1")
                    .response(Map.of("completed", true))
                    .build();
            mockMvc.perform(post("/api/v1/challenges/" + v.getId())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(challengeReq)))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403));

            // Complete
            VerificationCompleteRequest completeReq = VerificationCompleteRequest.builder()
                    .signalQuality(0.9)
                    .averageBpm(72.0)
                    .challengePassed(true)
                    .build();
            mockMvc.perform(post("/api/v1/verify/" + v.getId() + "/complete")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(completeReq)))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403));
        }

        @Test
        @WithMockUser(username = "admin_user", roles = {"ADMIN"})
        void mutate_AdminDeniedOnOtherUsersVerificationWith403() throws Exception {
            Verification v = createVerification("owner_alice", Verification.VerificationStatus.INITIATED);

            // D3: Admin must NOT be allowed to mutate someone else's verification session
            String faceJson = objectMapper.writeValueAsString(Map.of("image", getTestFaceImageBase64()));
            mockMvc.perform(post("/api/v1/verify/" + v.getId() + "/face")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(faceJson))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403));

            ChallengeSubmissionRequest challengeReq = ChallengeSubmissionRequest.builder()
                    .challengeId("chl_blink_1")
                    .response(Map.of("completed", true))
                    .build();
            mockMvc.perform(post("/api/v1/challenges/" + v.getId())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(challengeReq)))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403));

            VerificationCompleteRequest completeReq = VerificationCompleteRequest.builder()
                    .signalQuality(0.9)
                    .averageBpm(72.0)
                    .challengePassed(true)
                    .build();
            mockMvc.perform(post("/api/v1/verify/" + v.getId() + "/complete")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(completeReq)))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403));
        }

        @Test
        @WithMockUser(username = "superadmin_user", roles = {"SUPERADMIN"})
        void mutate_SuperAdminDeniedOnOtherUsersVerificationWith403() throws Exception {
            Verification v = createVerification("owner_alice", Verification.VerificationStatus.INITIATED);

            // Complete
            VerificationCompleteRequest completeReq = VerificationCompleteRequest.builder()
                    .signalQuality(0.9)
                    .averageBpm(72.0)
                    .challengePassed(true)
                    .build();
            mockMvc.perform(post("/api/v1/verify/" + v.getId() + "/complete")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(completeReq)))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403));
        }

        @Test
        void mutate_UnauthenticatedReturns401() throws Exception {
            Verification v = createVerification("owner_alice", Verification.VerificationStatus.INITIATED);

            mockMvc.perform(post("/api/v1/verify/" + v.getId() + "/face")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of("image", "any"))))
                    .andExpect(status().isUnauthorized());

            mockMvc.perform(post("/api/v1/challenges/" + v.getId())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isUnauthorized());

            mockMvc.perform(post("/api/v1/verify/" + v.getId() + "/complete")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Nested
    @DisplayName("No Side Effects on Denial (D4)")
    class NoSideEffectsTests {

        @Test
        @WithMockUser(username = "attacker_bob", roles = {"USER"})
        void afterDeniedComplete_StatusUnchanged_NoCert_NoAuditOutcome() throws Exception {
            Verification v = createVerification("owner_alice", Verification.VerificationStatus.INITIATED);

            VerificationCompleteRequest completeReq = VerificationCompleteRequest.builder()
                    .signalQuality(0.98)
                    .averageBpm(72.0)
                    .challengePassed(true)
                    .blinkDynamicsScore(0.95)
                    .behaviorScore(0.95)
                    .build();

            // Attempt complete by unauthorized caller
            mockMvc.perform(post("/api/v1/verify/" + v.getId() + "/complete")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(completeReq)))
                    .andExpect(status().isForbidden());

            // 1. Status must remain INITIATED
            Verification refreshed = verificationRepository.findById(v.getId()).orElseThrow();
            assertEquals(Verification.VerificationStatus.INITIATED, refreshed.getStatus());
            assertNull(refreshed.getConfidenceScore());

            // 2. No certificate row created
            assertTrue(certificateRepository.findByVerificationId(v.getId()).isEmpty());

            // 3. No VERIFICATION_SUCCESS or VERIFICATION_FAILED audit log recorded
            List<AuditLog> auditLogs = auditLogRepository.findByResourceId(v.getId().toString());
            boolean hasOutcomeAudit = auditLogs.stream().anyMatch(log ->
                    "VERIFICATION_SUCCESS".equals(log.getEventType()) ||
                    "VERIFICATION_FAILED".equals(log.getEventType()));
            assertFalse(hasOutcomeAudit, "No outcome audit log should be emitted when complete is denied");
        }

        @Test
        @WithMockUser(username = "attacker_bob", roles = {"USER"})
        void afterDeniedGetCertificate_NoCertIssued() throws Exception {
            // Seed a COMPLETED verification that does NOT have a certificate row yet
            Verification v = createVerification("owner_alice", Verification.VerificationStatus.COMPLETED);

            // Confirm no certificate exists initially
            assertTrue(certificateRepository.findByVerificationId(v.getId()).isEmpty());

            // Unauthorized caller attempts to read/lazy-issue certificate
            mockMvc.perform(get("/api/v1/verify/" + v.getId() + "/certificate"))
                    .andExpect(status().isForbidden());

            // Confirm certificate was NOT lazy-issued on denial
            assertTrue(certificateRepository.findByVerificationId(v.getId()).isEmpty(),
                    "Certificate must not be lazily issued when read request is denied");
        }
    }
}
