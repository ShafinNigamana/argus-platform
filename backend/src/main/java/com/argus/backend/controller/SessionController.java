package com.argus.backend.controller;

import com.argus.backend.dto.ResultResponse;
import com.argus.backend.dto.StartSessionResponse;
import com.argus.backend.model.Session;
import com.argus.backend.model.ProcessingResult;
import com.argus.backend.model.LivenessResult;
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
        response.setExpiresIn(30);

        return response;
    }

    @GetMapping("/{sessionId}/result")
    public ResultResponse getResult(@PathVariable String sessionId) {
        Session session = sessionService.getSession(sessionId);

        ResultResponse response = new ResultResponse();
        response.setProgress(0.0);
        
        ProcessingResult procResult = session.getResult();
        if (procResult == null) {
            response.setStatus("PROCESSING");
        } else {
            response.setStatus("READY");
            response.setBpm(procResult.getBpm());
            response.setSignalQuality(procResult.getSignalQuality());
            response.setValid(procResult.isValid());

            LivenessResult liveness = livenessService.evaluate(procResult);
            response.setLivenessScore(liveness.getLivenessScore());
            response.setLivenessStatus(liveness.getStatus());
        }

        return response;
    }
}
