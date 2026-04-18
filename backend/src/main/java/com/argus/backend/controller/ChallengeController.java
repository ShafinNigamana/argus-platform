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

    public ChallengeController(ChallengeService challengeService) {
        this.challengeService = challengeService;
    }

    /**
     * Receives challenge execution events and returns the computed challenge score.
     *
     * @param sessionId the active session ID
     * @param request   challenge type, timestamps, and captured events
     * @return the computed ChallengeResult (challengeScore, valid, failReason)
     */
    @PostMapping("/{sessionId}/challenge")
    public ChallengeResult handleChallenge(@PathVariable String sessionId,
                                            @RequestBody ChallengeRequest request) {
        return challengeService.handleChallenge(sessionId, request);
    }
}
