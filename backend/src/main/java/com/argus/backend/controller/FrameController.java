package com.argus.backend.controller;

import com.argus.backend.dto.FrameRequest;
import com.argus.backend.dto.FrameResponse;
import com.argus.backend.service.FrameService;
import org.springframework.web.bind.annotation.*;

/**
 * Controller endpoint designated exclusively for handling rapid frame stream bursts.
 */
@RestController
@RequestMapping("/api/v1/session")
public class FrameController {

    private final FrameService frameService;

    public FrameController(FrameService frameService) {
        this.frameService = frameService;
    }

    @PostMapping("/{sessionId}/frame")
    public FrameResponse receiveFrame(@PathVariable String sessionId, @RequestBody FrameRequest frameRequest) {
        return frameService.handleFrame(sessionId, frameRequest);
    }
}
