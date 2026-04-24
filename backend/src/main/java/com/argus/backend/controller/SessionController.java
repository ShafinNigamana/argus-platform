package com.argus.backend.controller;

import com.argus.backend.dto.ResultResponse;
import com.argus.backend.dto.StartSessionResponse;
import com.argus.backend.intelligence.EnhancedLivenessResponse;
import com.argus.backend.model.Session;
import com.argus.backend.model.ProcessingResult;
import com.argus.backend.model.BehaviorResult;
import com.argus.backend.model.ChallengeResult;
import com.argus.backend.service.SessionService;
import com.argus.backend.service.LivenessService;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for managing verification sessions.
 */
@RestController
@RequestMapping("/api/v1/session")
public class SessionController {

    private final SessionService sessionService;
    private final LivenessService livenessService;

    public SessionController(SessionService sessionService, LivenessService livenessService) {
        this.sessionService = sessionService;
        this.livenessService = livenessService;
    }

    @PostMapping("/start")
    public StartSessionResponse startSession() {
        Session session = sessionService.createSession();

        StartSessionResponse response = new StartSessionResponse();
        response.setSessionId(session.getSessionId());
        response.setStatus(session.getState().name());
        response.setExpiresIn(120);

        return response;
    }

    @GetMapping("/{sessionId}/result")
    public ResultResponse getResult(@PathVariable String sessionId) {
        Session session = sessionService.getSession(sessionId);

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
            response.setLivenessStatus(liveness.getStatus());
            response.setBehaviorScore(liveness.getBehaviorScore());
            response.setChallengeScore(liveness.getChallengeScore());
            response.setFailReason(liveness.getFailReason());
            response.setConfidence(liveness.getConfidence());
            response.setCalibrationNote(liveness.getCalibrationNote());
            response.setAnalysisDetails(liveness.getAnalysisDetails());
            response.setRecommendation(liveness.getRecommendation());
        }

        return response;
    }
}
