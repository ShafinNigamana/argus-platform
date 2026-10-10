package com.argus.backend.controller;

import com.argus.backend.dto.ChallengeRequest;
import com.argus.backend.model.ChallengeResult;
import com.argus.backend.service.ChallengeService;
import org.springframework.web.bind.annotation.*;

/**
 * Controller for receiving challenge execution data.
 * Follows the existing pattern: one controller per signal type.
 */
@RestController
@RequestMapping("/api/v1/session")
public class ChallengeController {

    private final ChallengeService challengeService;
    private final com.argus.backend.service.SessionService sessionService;

    public ChallengeController(ChallengeService challengeService, com.argus.backend.service.SessionService sessionService) {
        this.challengeService = challengeService;
        this.sessionService = sessionService;
    }

    /**
     * Receives challenge execution events and returns the computed challenge score.
     *
     * @param sessionId the active session ID
     * @param requests  challenge type, timestamps, and captured events
     * @param auth      authenticated caller
     * @return the computed ChallengeResult (challengeScore, valid, failReason)
     */
    @PostMapping("/{sessionId}/challenge")
    public ChallengeResult handleChallenge(
            @PathVariable String sessionId,
            @RequestBody java.util.List<ChallengeRequest> requests,
            org.springframework.security.core.Authentication auth) {
        sessionService.verifySessionOwnership(sessionService.getSession(sessionId), auth);
        return challengeService.handleChallenges(sessionId, requests);
    }
}
