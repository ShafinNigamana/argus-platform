package com.argus.backend.controller;

import com.argus.backend.dto.ResultResponse;
import com.argus.backend.dto.StartSessionResponse;
import com.argus.backend.dto.VerifyRequest;
import com.argus.backend.dto.VerifyResponse;
import com.argus.backend.intelligence.EnhancedLivenessResponse;
import com.argus.backend.model.BehaviorResult;
import com.argus.backend.model.ChallengeResult;
import com.argus.backend.model.ProcessingResult;
import com.argus.backend.model.Session;
import com.argus.backend.service.LivenessService;
import com.argus.backend.service.SessionService;
import com.argus.backend.service.VerificationOrchestrator;
import com.argus.backend.service.VerificationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * REST controller for managing verification sessions.
 * Bridges legacy session requests into the authoritative PostgreSQL Verification lifecycle.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/session")
public class SessionController {

    private final SessionService sessionService;
    private final LivenessService livenessService;
    private final VerificationService verificationService;
    private VerificationOrchestrator verificationOrchestrator;

    public SessionController(SessionService sessionService,
                             LivenessService livenessService,
                             VerificationService verificationService) {
        this.sessionService = sessionService;
        this.livenessService = livenessService;
        this.verificationService = verificationService;
    }

    @Autowired
    public void setVerificationOrchestrator(VerificationOrchestrator verificationOrchestrator) {
        this.verificationOrchestrator = verificationOrchestrator;
    }

    @PostMapping("/start")
    public StartSessionResponse startSession(org.springframework.security.core.Authentication auth) {
        String owner = (auth != null && auth.getName() != null) ? auth.getName() : "session-client";
        Session session = sessionService.createSession(owner);

        // Bridge legacy session into authoritative VerificationOrchestrator
        if (verificationOrchestrator != null) {
            try {
                VerifyResponse vResp = verificationOrchestrator.initiate(VerifyRequest.builder()
                        .userId(owner)
                        .operationType("SESSION_LIVENESS")
                        .metadata(Map.of("sessionId", session.getSessionId()))
                        .build());
                session.setVerificationId(vResp.getVerificationId().toString());
            } catch (Exception e) {
                log.warn("Could not initiate linked verification for session {}: {}",
                        session.getSessionId(), e.getMessage());
            }
        }

        StartSessionResponse response = new StartSessionResponse();
        response.setSessionId(session.getSessionId());
        response.setStatus(session.getState().name());
        response.setExpiresIn(120);

        return response;
    }

    @GetMapping("/{sessionId}/result")
    public ResultResponse getResult(
            @PathVariable String sessionId,
            org.springframework.security.core.Authentication auth) {
        Session session = sessionService.getSession(sessionId);
        sessionService.verifySessionOwnership(session, auth);

        ResultResponse response = new ResultResponse();

        // Compute progress as percentage of minimum buffer needed (300 samples)
        int bufferSize = session.getBuffer().size();
        double progress = Math.min(100.0, (bufferSize / 300.0) * 100.0);
        progress = Math.round(progress * 10.0) / 10.0;
        response.setProgress(progress);

        ProcessingResult procResult = session.getResult();
        if (procResult == null) {
            response.setStatus("PROCESSING");
        } else {
            response.setStatus("READY");
            response.setBpm(procResult.getBpm());
            response.setSignalQuality(procResult.getSignalQuality());
            response.setValid(procResult.isValid());

            BehaviorResult behaviorResult = session.getBehaviorResult();
            ChallengeResult challengeResult = session.getChallengeResult();

            EnhancedLivenessResponse liveness = livenessService.evaluateEnhanced(
                    procResult,
                    behaviorResult,
                    challengeResult,
                    session.getBehaviorInput(),
                    session.getChallengeInputs()
            );

            response.setLivenessScore(liveness.getLivenessScore());
            response.setLivenessStatus(liveness.getStatus() != null ? liveness.getStatus() : "UNCERTAIN");
            response.setBehaviorScore(liveness.getBehaviorScore());
            response.setChallengeScore(liveness.getChallengeScore());
            response.setFailReason(liveness.getFailReason());
            response.setConfidence(liveness.getConfidence() != null ? liveness.getConfidence() : "LOW");

            // Bridge to authoritative Verification entity & PostgreSQL
            if (verificationOrchestrator != null && session.getVerificationId() != null) {
                try {
                    UUID vId = UUID.fromString(session.getVerificationId());
                    Map<String, Object> componentScores = new HashMap<>();
                    componentScores.put("liveness", liveness.getLivenessScore());
                    componentScores.put("signalQuality", procResult.getSignalQuality());
                    componentScores.put("bpm", procResult.getBpm());
                    if (liveness.getBehaviorScore() != null) {
                        componentScores.put("behavior", liveness.getBehaviorScore());
                    }
                    if (liveness.getChallengeScore() != null) {
                        componentScores.put("challenge", liveness.getChallengeScore());
                    }
                    if (session.getAntiSpoofScore() != null) {
                        componentScores.put("antiSpoof", session.getAntiSpoofScore());
                        componentScores.put("antiSpoofReal", session.getAntiSpoofReal());
                        componentScores.put("antiSpoofReasoning", session.getAntiSpoofReasoning());
                    }

                    if ("PASS".equals(liveness.getStatus())) {
                        verificationOrchestrator.complete(vId, liveness.getLivenessScore(), componentScores);
                    } else if ("FAIL".equals(liveness.getStatus())) {
                        verificationOrchestrator.fail(vId);
                    }
                } catch (Exception e) {
                    log.warn("Could not sync session result to VerificationOrchestrator: {}", e.getMessage());
                }
            }

            // Trust Layer: Create verifiable record on legacy ledger if configured
            if ("PASS".equals(liveness.getStatus())) {
                verificationService.createRecord(sessionId, liveness);
            }
        }

        return response;
    }
}
