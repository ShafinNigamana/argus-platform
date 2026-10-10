package com.argus.backend.controller;

import com.argus.backend.dto.FrameRequest;
import com.argus.backend.dto.FrameResponse;
import com.argus.backend.service.FrameService;
import org.springframework.web.bind.annotation.*;

/**
 * Controller endpoint designated exclusively for handling rapid frame stream bursts.
 * @deprecated Frame ingestion replaced by Signal logic workloads.
 */
@Deprecated
@RestController
@RequestMapping("/api/v1/session")
public class FrameController {

    private final FrameService frameService;
    private final com.argus.backend.service.SessionService sessionService;

    @Deprecated
    public FrameController(FrameService frameService, com.argus.backend.service.SessionService sessionService) {
        this.frameService = frameService;
        this.sessionService = sessionService;
    }

    @Deprecated
    @PostMapping("/{sessionId}/frame")
    public FrameResponse receiveFrame(
            @PathVariable String sessionId,
            @RequestBody FrameRequest frameRequest,
            org.springframework.security.core.Authentication auth) {
        sessionService.verifySessionOwnership(sessionService.getSession(sessionId), auth);
        return frameService.handleFrame(sessionId, frameRequest);
    }
}
