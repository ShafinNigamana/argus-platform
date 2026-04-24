package com.argus.backend.controller;

import com.argus.backend.dto.BehaviorRequest;
import com.argus.backend.model.BehaviorResult;
import com.argus.backend.service.BehaviorService;
import org.springframework.web.bind.annotation.*;

/**
 * Controller for receiving behavioral event data (blinks, head movements).
 * Follows the existing pattern: one controller per signal type.
 */
@RestController
@RequestMapping("/api/v1/session")
public class BehaviorController {

    private final BehaviorService behaviorService;

    public BehaviorController(BehaviorService behaviorService) {
        this.behaviorService = behaviorService;
    }

    /**
     * Receives behavioral events and returns the computed behavior score.
     *
     * @param sessionId the active session ID
     * @param request   blink events, head movements, and session duration
     * @return the computed BehaviorResult (blinkScore, movementScore, behaviorScore)
     */
    @PostMapping("/{sessionId}/behavior")
    public BehaviorResult handleBehavior(@PathVariable String sessionId,
                                          @RequestBody BehaviorRequest request) {
        return behaviorService.handleBehavior(sessionId, request);
    }
}
