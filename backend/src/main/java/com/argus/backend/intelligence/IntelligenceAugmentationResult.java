package com.argus.backend.intelligence;

/**
 * Internal transfer model carrying calibrated scores and explainability metadata.
 */
public class IntelligenceAugmentationResult {

    private final double adjustedBehaviorScore;
    private final double adjustedChallengeScore;
    private final double calibratedScore;
    private final String status;
    private final String confidence;
    private final String failReason;
    private final String calibrationNote;
    private final AnalysisDetails analysisDetails;
    private final String recommendation;
    private final boolean majorBotPattern;

    public IntelligenceAugmentationResult(double adjustedBehaviorScore,
                                          double adjustedChallengeScore,
                                          double calibratedScore,
                                          String status,
                                          String confidence,
                                          String failReason,
                                          String calibrationNote,
                                          AnalysisDetails analysisDetails,
                                          String recommendation,
                                          boolean majorBotPattern) {
        this.adjustedBehaviorScore = adjustedBehaviorScore;
        this.adjustedChallengeScore = adjustedChallengeScore;
        this.calibratedScore = calibratedScore;
        this.status = status;
        this.confidence = confidence;
        this.failReason = failReason;
        this.calibrationNote = calibrationNote;
        this.analysisDetails = analysisDetails;
        this.recommendation = recommendation;
        this.majorBotPattern = majorBotPattern;
    }

    public double getAdjustedBehaviorScore() {
        return adjustedBehaviorScore;
    }

    public double getAdjustedChallengeScore() {
        return adjustedChallengeScore;
    }

    public double getCalibratedScore() {
        return calibratedScore;
    }

    public String getStatus() {
        return status;
    }

    public String getConfidence() {
        return confidence;
    }

    public String getFailReason() {
        return failReason;
    }

    public String getCalibrationNote() {
        return calibrationNote;
    }

    public AnalysisDetails getAnalysisDetails() {
        return analysisDetails;
    }

    public String getRecommendation() {
        return recommendation;
    }

    public boolean isMajorBotPattern() {
        return majorBotPattern;
    }
}
