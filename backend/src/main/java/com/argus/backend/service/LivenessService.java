package com.argus.backend.service;

import com.argus.backend.engine.LivenessDecisionEngine;
import com.argus.backend.model.LivenessInput;
import com.argus.backend.model.LivenessResult;
import com.argus.backend.model.ProcessingResult;
import org.springframework.stereotype.Service;

/**
 * Service layer for liveness evaluation.
 * Delegates core scoring logic to {@link LivenessDecisionEngine}.
 */
@Service
public class LivenessService {

    private final LivenessDecisionEngine decisionEngine;

    public LivenessService(LivenessDecisionEngine decisionEngine) {
        this.decisionEngine = decisionEngine;
    }

    /**
     * Evaluates liveness using only signal processing data.
     * Backward-compatible signature — behaviorScore and challengeScore
     * are left null and their weights are redistributed to signalQuality.
     *
     * @param result the signal processing result
     * @return the liveness verdict
     */
    public LivenessResult evaluate(ProcessingResult result) {
        LivenessInput input = LivenessInput.fromProcessingResult(result);
        return decisionEngine.evaluate(input);
    }

    /**
     * Full evaluation with all available signals.
     * Use this overload when behavioral and challenge scores are available.
     *
     * @param result         the signal processing result
     * @param behaviorScore  behavioral analysis score (0.0–1.0), or null if unavailable
     * @param challengeScore challenge execution score (0.0–1.0), or null if unavailable
     * @return the liveness verdict
     */
    public LivenessResult evaluate(ProcessingResult result,
                                    Double behaviorScore,
                                    Double challengeScore) {
        LivenessInput input = LivenessInput.fromProcessingResult(result);
        input.setBehaviorScore(behaviorScore);
        input.setChallengeScore(challengeScore);
        return decisionEngine.evaluate(input);
    }
}
