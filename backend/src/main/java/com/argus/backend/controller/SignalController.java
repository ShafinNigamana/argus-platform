package com.argus.backend.controller;

import com.argus.backend.dto.SignalRequest;
import com.argus.backend.service.SignalService;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.Map;

/**
 * Controller strictly designated to manage frontend array batches securely.
 */
@RestController
@RequestMapping("/api/v1/session")
public class SignalController {

    private final SignalService signalService;

    public SignalController(SignalService signalService) {
        this.signalService = signalService;
    }

    @PostMapping("/{sessionId}/signal")
    public Map<String, Boolean> handleSignal(@PathVariable String sessionId, @RequestBody SignalRequest request) {
        boolean accepted = signalService.handleSignal(sessionId, request);
        return Collections.singletonMap("accepted", accepted);
    }
}
