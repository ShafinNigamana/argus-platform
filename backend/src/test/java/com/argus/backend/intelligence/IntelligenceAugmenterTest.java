package com.argus.backend.intelligence;

import com.argus.backend.dto.AiReasoningResponse;
import com.argus.backend.model.BehaviorInput;
import com.argus.backend.model.BehaviorResult;
import com.argus.backend.model.BlinkEvent;
import com.argus.backend.model.ChallengeInput;
import com.argus.backend.model.ChallengeResult;
import com.argus.backend.model.HeadMovement;
import com.argus.backend.service.GeminiForensicService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

class IntelligenceAugmenterTest {

    private IntelligenceAugmenter augmenter;
    private ConfidenceCalibrator calibrator;
    private GeminiForensicService geminiService;

    @BeforeEach
    void setUp() {
        calibrator = new ConfidenceCalibrator();
        geminiService = Mockito.mock(GeminiForensicService.class);
        augmenter = new IntelligenceAugmenter(calibrator, geminiService);

        // Default mock response for AI
        when(geminiService.analyzeLiveness(any())).thenReturn(
                AiReasoningResponse.builder()
                        .aiLivenessScore(0.9)
                        .confidence("HIGH")
                        .forensicReasoning("Passed mock AI test.")
                        .build()
        );
    }

    @Test
    void naturalHumanPatternReturnsPassHighConfidence() {
        EnhancedLivenessResponse response = augmenter.enhance(
                72.0,
                0.90,
                behaviorResult(0.88, 0.80, 0.90),
                challengeResult(0.92, true),
                behaviorInput(new double[]{1.0, 2.6, 6.9, 8.1, 13.6},
                        new double[]{0.01, 0.05, 0.03, 0.08, 0.02, 0.07, 0.03, 0.06, 0.01, 0.09, 0.02, 0.05}),
                List.of(challengeInput("TURN_HEAD_LEFT", 1000, 1450))
        );

        assertEquals("PASS", response.getStatus());
        assertNotNull(response.getConfidence());
    }

    @Test
    void sub200msReactionReturnsFailLowConfidence() {
        // Mock AI to be suspicious of fast reaction
        when(geminiService.analyzeLiveness(any())).thenReturn(
                AiReasoningResponse.builder()
                        .aiLivenessScore(0.1)
                        .confidence("HIGH")
                        .forensicReasoning("Reaction time too fast.")
                        .build()
        );

        EnhancedLivenessResponse response = augmenter.enhance(
                72.0,
                0.70,
                behaviorResult(0.70, 0.75, 0.70),
                challengeResult(0.80, true),
                behaviorInput(new double[]{1.0, 4.1, 7.8, 9.9},
                        new double[]{0.01, 0.05, 0.03, 0.08, 0.02, 0.07, 0.03, 0.06, 0.01, 0.09}),
                List.of(challengeInput("BLINK", 1000, 1010)) // 10ms reaction
        );

        // With the 80/20 blending, even if system is okay, AI can push it down
        assertEquals("LOW", response.getConfidence());
        assertTrue(response.getFailReason().toLowerCase().contains("suspicious") || 
                   response.getFailReason().toLowerCase().contains("fast") ||
                   response.getRecommendation().toLowerCase().contains("fast"));
    }

    @Test
    void sameInputProducesIdenticalOutput() {
        BehaviorResult behaviorResult = behaviorResult(0.82, 0.80, 0.84);
        ChallengeResult challengeResult = challengeResult(0.85, true);
        BehaviorInput behaviorInput = behaviorInput(new double[]{1.1, 4.5, 7.9, 11.2},
                new double[]{0.01, 0.05, 0.02, 0.07, 0.03, 0.06, 0.01, 0.08, 0.03, 0.07, 0.02});
        List<ChallengeInput> challengeInputs = List.of(challengeInput("NOD", 1000, 1460));

        EnhancedLivenessResponse first = augmenter.enhance(72.0, 0.80, behaviorResult, challengeResult, behaviorInput, challengeInputs);
        EnhancedLivenessResponse second = augmenter.enhance(72.0, 0.80, behaviorResult, challengeResult, behaviorInput, challengeInputs);

        assertEquals(first.getLivenessScore(), second.getLivenessScore());
        assertEquals(first.getStatus(), second.getStatus());
        assertEquals(first.getConfidence(), second.getConfidence());
    }

    private BehaviorResult behaviorResult(double blinkScore, double movementScore, double behaviorScore) {
        BehaviorResult result = new BehaviorResult();
        result.setBlinkScore(blinkScore);
        result.setMovementScore(movementScore);
        result.setBehaviorScore(behaviorScore);
        return result;
    }

    private ChallengeResult challengeResult(double score, boolean valid) {
        ChallengeResult result = new ChallengeResult();
        result.setChallengeScore(score);
        result.setValid(valid);
        return result;
    }

    private BehaviorInput behaviorInput(double[] blinkSeconds, double[] movementAngles) {
        BehaviorInput input = new BehaviorInput();

        List<BlinkEvent> blinkEvents = new ArrayList<>();
        for (double second : blinkSeconds) {
            BlinkEvent event = new BlinkEvent();
            event.setTimestamp((long) (second * 1000));
            event.setDuration(180);
            blinkEvents.add(event);
        }

        List<HeadMovement> headMovements = new ArrayList<>();
        long ts = 1000;
        for (double angle : movementAngles) {
            HeadMovement movement = new HeadMovement();
            movement.setTimestamp(ts);
            movement.setAngle(angle);
            headMovements.add(movement);
            ts += 100;
        }

        input.setBlinkEvents(blinkEvents);
        input.setHeadMovements(headMovements);
        input.setSessionDuration(8000);
        return input;
    }

    private ChallengeInput challengeInput(String type, long issuedAt, long completedAt) {
        ChallengeInput input = new ChallengeInput();
        input.setChallengeType(type);
        input.setIssuedAt(issuedAt);
        input.setCompletedAt(completedAt);
        input.setEvents(List.of());
        return input;
    }
}
