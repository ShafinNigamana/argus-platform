package com.argus.backend.service;

import com.argus.backend.dto.FrameRequest;
import org.springframework.stereotype.Service;

/**
 * Validates the contents and quality metrics of an incoming FrameRequest.
 */
@Service
public class FrameValidator {

    /**
     * @return true if a face was actively detected in the frame.
     */
    public boolean isFaceDetected(FrameRequest frame) {
        return frame.isFaceDetected();
    }

    /**
     * Inspects frame quality and returns a status string.
     * @return "GOOD" or "LOW_QUALITY"
     */
    public String isQualityValid(FrameRequest frame) {
        FrameRequest.FrameQuality quality = frame.getFrameQuality();
        if (quality == null) {
            return "LOW_QUALITY";
        }
        
        if (quality.getBrightness() < 0.3) {
            return "LOW_QUALITY";
        }
        if (quality.getBlurScore() > 0.6) {
            return "LOW_QUALITY";
        }
        if (quality.getFaceStability() < 0.5) {
            return "LOW_QUALITY";
        }
        
        return "GOOD";
    }
}
