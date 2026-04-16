package com.argus.backend.controller;

import com.argus.backend.dto.ResultResponse;
import com.argus.backend.dto.StartSessionResponse;
import com.argus.backend.model.Session;
import com.argus.backend.service.SessionService;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for managing verification sessions.
 */
@RestController
@RequestMapping("/api/v1/session")
public class SessionController {

    private final SessionService sessionService;

    public SessionController(SessionService sessionService) {
        this.sessionService = sessionService;
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
        response.setStatus(session.getState().name());
        response.setProgress(0.0);

        return response;
    }
}
