package com.argus.backend.service;

import com.argus.backend.dto.FrameRequest;
import com.argus.backend.dto.FrameResponse;
import org.springframework.stereotype.Service;

/**
 * Primary processor for handling frame ingestion per the API contract.
 */
/**
 * @deprecated Frame ingestion replaced by decoupled frontend Signal logic workflows natively. Avoid modifying.
 */
@Deprecated
@Service
public class FrameService {

    private final SessionService sessionService;
    private final FrameValidator frameValidator;

    @Deprecated
    public FrameService(SessionService sessionService, FrameValidator frameValidator) {
        this.sessionService = sessionService;
        this.frameValidator = frameValidator;
    }

    /**
     * Executes frame ingestion logic ensuring valid session connectivity and frame quality.
     */
    @Deprecated
    public FrameResponse handleFrame(String sessionId, FrameRequest frame) {
        // 1 & 2. Get session and ensure non-expired state
        // (SessionService.getSession inherently handles not-found and expiry checks, throwing exceptions if invalid.)
        sessionService.getSession(sessionId);

        FrameResponse response = new FrameResponse();

        // 3. Reject if no face detected or frame quality missing
        if (frame.getFrameQuality() == null) {
            response.setAccepted(false);
            response.setQualityStatus("REJECTED");
            return response;
        }

        if (!frameValidator.isFaceDetected(frame)) {
            response.setAccepted(false);
            response.setQualityStatus("REJECTED");
            return response;
        }

        // 4. Validate Quality
        String quality = frameValidator.isQualityValid(frame);
        
        response.setAccepted(true);
        response.setQualityStatus(quality);

        return response;
    }
}
