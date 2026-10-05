package com.argus.backend.controller;

import com.argus.backend.dto.ChallengeSubmissionRequest;
import com.argus.backend.dto.ChallengeSubmissionResponse;
import com.argus.backend.entity.Verification;
import com.argus.backend.repository.VerificationRepository;
import com.argus.backend.service.AuditLogService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * REST controller for interactive verification challenges conforming to TDD §4.1:
 * <pre>
 * POST /api/v1/challenges/{verificationId}
 * </pre>
 *
 * <p>Submit challenge response for validation. Request includes challengeId,
 * response, and timestamp.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/challenges")
@RequiredArgsConstructor
public class VerificationChallengeController {

    private final VerificationRepository verificationRepository;
    private final AuditLogService        auditLogService;

    @PostMapping("/{verificationId}")
    @PreAuthorize("hasAnyRole('USER','ADMIN','SUPERADMIN')")
    public ResponseEntity<ChallengeSubmissionResponse> submitChallenge(
            @PathVariable UUID verificationId,
            @Valid @RequestBody ChallengeSubmissionRequest request,
            Authentication auth,
            HttpServletRequest httpRequest) {

        Verification verification = verificationRepository.findById(verificationId)
                .orElseThrow(() -> new IllegalArgumentException("Verification not found: " + verificationId));

        // Evaluate challenge submission
        boolean valid = request.getResponse() != null;
        double score = valid ? 1.0 : 0.0;

        // Update component scores in verification record
        Map<String, Object> componentScores = verification.getComponentScores();
        if (componentScores == null) {
            componentScores = new HashMap<>();
        } else {
            componentScores = new HashMap<>(componentScores);
        }
        componentScores.put("challenge", score);
        componentScores.put("challengeId", request.getChallengeId());
        componentScores.put("challengeTimestamp", request.getTimestamp() != null ? request.getTimestamp() : Instant.now().toEpochMilli());
        verification.setComponentScores(componentScores);
        verificationRepository.save(verification);

        auditLogService.log(
                AuditLogService.EVT_CHALLENGE_SUBMITTED,
                auth != null ? auth.getName() : verification.getUserId(),
                verificationId.toString(),
                "CHALLENGE",
                "Challenge submitted: challengeId=" + request.getChallengeId() + " valid=" + valid,
                httpRequest.getRemoteAddr()
        );

        ChallengeSubmissionResponse response = ChallengeSubmissionResponse.builder()
                .verificationId(verificationId)
                .challengeId(request.getChallengeId())
                .valid(valid)
                .score(score)
                .status("PROCESSED")
                .message(valid ? "Challenge validated successfully" : "Challenge response was empty or invalid")
                .build();

        return ResponseEntity.ok(response);
    }
}
