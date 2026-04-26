package com.argus.backend.intelligence;

import org.springframework.stereotype.Service;

/**
 * Adaptive calibration layer for signal/behavior/challenge weights.
 */
@Service
public class ConfidenceCalibrator {

    public WeightProfile calculateWeights(double signalQuality) {
        double normalizedSignal = signalQuality;
        String prefix = "";

        if (Double.isNaN(normalizedSignal) || normalizedSignal < 0.0) {
            normalizedSignal = 0.50;
            prefix = "Unknown signal quality; defaulted to 0.50. ";
        }

        if (normalizedSignal < 0.30) {
            return new WeightProfile(0.30, 0.30, 0.40,
                    prefix + "Very low signal: Heavily relying on challenge", normalizedSignal);
        }
        if (normalizedSignal < 0.50) {
            return new WeightProfile(0.35, 0.25, 0.40,
                    prefix + "Low signal quality: Challenge weight increased", normalizedSignal);
        }
        if (normalizedSignal < 0.70) {
            return new WeightProfile(0.35, 0.25, 0.40,
                    prefix + "Moderate signal: Adjusted weighting", normalizedSignal);
        }
        if (normalizedSignal <= 0.85) {
            return new WeightProfile(0.40, 0.30, 0.30,
                    prefix + "Good signal: Standard weighting", normalizedSignal);
        }

        return new WeightProfile(0.45, 0.35, 0.20,
                prefix + "Excellent signal: Behavior analysis prioritized", normalizedSignal);
    }

    public double calibrateFinalScore(double signalQuality,
                                      double adjustedBehaviorScore,
                                      double adjustedChallengeScore,
                                      WeightProfile profile) {
        double finalScore = (signalQuality * profile.signalWeight())
                + (adjustedBehaviorScore * profile.behaviorWeight())
                + (adjustedChallengeScore * profile.challengeWeight());

        return StatisticsHelper.clamp(finalScore, 0.0, 1.0);
    }

    public String getStatus(double finalScore) {
        if (finalScore >= 0.75) {
            return "PASS";
        }
        if (finalScore >= 0.60) {
            return "UNCERTAIN";
        }
        return "FAIL";
    }

    public String determineConfidence(double finalScore,
                                      double signalQuality,
                                      boolean majorBotPattern,
                                      boolean noMajorPenalties) {
        if (majorBotPattern || finalScore < 0.60 || (finalScore >= 0.60 && finalScore < 0.75)) {
            return "LOW";
        }

        if (finalScore >= 0.85 && signalQuality >= 0.70 && noMajorPenalties) {
            return "HIGH";
        }

        if (finalScore >= 0.75 && (signalQuality >= 0.50 || noMajorPenalties)) {
            return "MEDIUM";
        }

        return "LOW";
    }

    public record WeightProfile(double signalWeight,
                                double behaviorWeight,
                                double challengeWeight,
                                String note,
                                double normalizedSignalQuality) {
    }
}
