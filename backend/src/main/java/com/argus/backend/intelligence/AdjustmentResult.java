package com.argus.backend.intelligence;

/**
 * Penalty output from one intelligence analyzer.
 */
public class AdjustmentResult {

    private final double penaltyMultiplier;
    private final String reason;
    private final double confidence;
    private final String detail;
    private final boolean majorBotPattern;

    public AdjustmentResult(double penaltyMultiplier, String reason, double confidence, String detail, boolean majorBotPattern) {
        this.penaltyMultiplier = penaltyMultiplier;
        this.reason = reason;
        this.confidence = confidence;
        this.detail = detail;
        this.majorBotPattern = majorBotPattern;
    }

    public static AdjustmentResult noPenalty() {
        return new AdjustmentResult(1.0, null, 1.0, null, false);
    }

    public static AdjustmentResult of(double penaltyMultiplier, String reason, double confidence, String detail) {
        return new AdjustmentResult(penaltyMultiplier, reason, confidence, detail, false);
    }

    public static AdjustmentResult of(double penaltyMultiplier, String reason, double confidence, String detail, boolean majorBotPattern) {
        return new AdjustmentResult(penaltyMultiplier, reason, confidence, detail, majorBotPattern);
    }

    public double getPenaltyMultiplier() {
        return penaltyMultiplier;
    }

    public String getReason() {
        return reason;
    }

    public double getConfidence() {
        return confidence;
    }

    public String getDetail() {
        return detail;
    }

    public boolean isMajorBotPattern() {
        return majorBotPattern;
    }
}
