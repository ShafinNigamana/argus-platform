package com.argus.backend.controller;

import com.argus.backend.dto.ChallengeSubmissionRequest;
import com.argus.backend.entity.Verification;
import com.argus.backend.repository.VerificationRepository;
import com.argus.backend.service.AuditLogService;
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
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class VerificationChallengeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private VerificationRepository verificationRepository;

    @MockBean
    private AuditLogService auditLogService;

    @Test
    @WithMockUser(username = "testuser", roles = {"USER"})
    void submitChallenge_ValidSubmission_Returns200WithResult() throws Exception {
        UUID vId = UUID.randomUUID();
        Verification verification = Verification.builder()
                .id(vId)
                .userId("testuser")
                .operationType("TRANSACTION")
                .status(Verification.VerificationStatus.IN_PROGRESS)
                .createdAt(Instant.now())
                .build();

        when(verificationRepository.findById(vId)).thenReturn(Optional.of(verification));
        when(verificationRepository.save(any(Verification.class))).thenReturn(verification);

        ChallengeSubmissionRequest request = ChallengeSubmissionRequest.builder()
                .challengeId("chl_turn_left")
                .response(Map.of("angle", -30))
                .timestamp(System.currentTimeMillis())
                .build();

        mockMvc.perform(post("/api/v1/challenges/" + vId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.verificationId").value(vId.toString()))
                .andExpect(jsonPath("$.challengeId").value("chl_turn_left"))
                .andExpect(jsonPath("$.valid").value(true))
                .andExpect(jsonPath("$.status").value("PROCESSED"));
    }

    @Test
    @WithMockUser(username = "testuser", roles = {"USER"})
    void submitChallenge_VerificationNotFound_Returns404() throws Exception {
        UUID vId = UUID.randomUUID();
        when(verificationRepository.findById(vId)).thenReturn(Optional.empty());

        ChallengeSubmissionRequest request = ChallengeSubmissionRequest.builder()
                .challengeId("chl_turn_left")
                .response(Map.of("angle", -30))
                .timestamp(System.currentTimeMillis())
                .build();

        mockMvc.perform(post("/api/v1/challenges/" + vId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("RESOURCE_NOT_FOUND"));
    }
}
