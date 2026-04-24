package com.argus.backend.intelligence;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ConfidenceCalibratorTest {

    private final ConfidenceCalibrator calibrator = new ConfidenceCalibrator();

    @Test
    void veryPoorSignalShiftsToChallenge() {
        ConfidenceCalibrator.WeightProfile profile = calibrator.calculateWeights(0.2);
        assertEquals(0.15, profile.signalWeight());
        assertEquals(0.15, profile.behaviorWeight());
        assertEquals(0.70, profile.challengeWeight());
    }

    @Test
    void excellentSignalShiftsToBehavior() {
        ConfidenceCalibrator.WeightProfile profile = calibrator.calculateWeights(0.9);
        assertEquals(0.45, profile.signalWeight());
        assertEquals(0.35, profile.behaviorWeight());
        assertEquals(0.20, profile.challengeWeight());
    }

    @Test
    void statusBoundariesAreCorrect() {
        assertEquals("PASS", calibrator.getStatus(0.75));
        assertEquals("UNCERTAIN", calibrator.getStatus(0.60));
        assertEquals("FAIL", calibrator.getStatus(0.59));
    }

    @Test
    void confidenceRulesAreApplied() {
        assertEquals("HIGH", calibrator.determineConfidence(0.90, 0.8, false, true));
        assertEquals("MEDIUM", calibrator.determineConfidence(0.78, 0.55, false, false));
        assertEquals("LOW", calibrator.determineConfidence(0.78, 0.8, true, true));
    }
}
