package com.argus.backend.service;

import com.argus.backend.model.LivenessResult;
import com.argus.backend.model.ProcessingResult;
import org.springframework.stereotype.Service;

/**
 * Validates algorithmic health scores mapped securely out of strict Processing pipelines.
 */
@Service
public class LivenessService {

    public LivenessResult evaluate(ProcessingResult result) {
        LivenessResult liveness = new LivenessResult();

        if (result == null || !result.isValid() || result.getSignalQuality() < 0.5) {
            liveness.setLivenessScore(0.0);
            liveness.setStatus("FAIL");
            return liveness;
        }

        double score = result.getSignalQuality() * 100;
        liveness.setLivenessScore(score);

        if (score >= 80) {
            liveness.setStatus("PASS");
        } else if (score >= 50) {
            liveness.setStatus("UNCERTAIN");
        } else {
            liveness.setStatus("FAIL");
        }

        return liveness;
    }
}
