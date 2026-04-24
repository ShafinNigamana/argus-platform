package com.argus.backend.intelligence;

/**
 * Enhanced liveness response with explainability and calibration metadata.
 */
public class EnhancedLivenessResponse {

    private double livenessScore;
    private String status;
    private Double bpm;
    private Double signalQuality;
    private Double behaviorScore;
    private Double challengeScore;
    private String failReason;

    private String confidence;
    private String calibrationNote;
    private AnalysisDetails analysisDetails;
    private String recommendation;

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private final EnhancedLivenessResponse response = new EnhancedLivenessResponse();

        public Builder livenessScore(double value) { response.setLivenessScore(value); return this; }
        public Builder status(String value) { response.setStatus(value); return this; }
        public Builder bpm(Double value) { response.setBpm(value); return this; }
        public Builder signalQuality(Double value) { response.setSignalQuality(value); return this; }
        public Builder behaviorScore(Double value) { response.setBehaviorScore(value); return this; }
        public Builder challengeScore(Double value) { response.setChallengeScore(value); return this; }
        public Builder failReason(String value) { response.setFailReason(value); return this; }
        public Builder confidence(String value) { response.setConfidence(value); return this; }
        public Builder calibrationNote(String value) { response.setCalibrationNote(value); return this; }
        public Builder analysisDetails(AnalysisDetails value) { response.setAnalysisDetails(value); return this; }
        public Builder recommendation(String value) { response.setRecommendation(value); return this; }

        public EnhancedLivenessResponse build() { return response; }
    }

    public double getLivenessScore() {
        return livenessScore;
    }

    public void setLivenessScore(double livenessScore) {
        this.livenessScore = livenessScore;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Double getBpm() {
        return bpm;
    }

    public void setBpm(Double bpm) {
        this.bpm = bpm;
    }

    public Double getSignalQuality() {
        return signalQuality;
    }

    public void setSignalQuality(Double signalQuality) {
        this.signalQuality = signalQuality;
    }

    public Double getBehaviorScore() {
        return behaviorScore;
    }

    public void setBehaviorScore(Double behaviorScore) {
        this.behaviorScore = behaviorScore;
    }

    public Double getChallengeScore() {
        return challengeScore;
    }

    public void setChallengeScore(Double challengeScore) {
        this.challengeScore = challengeScore;
    }

    public String getFailReason() {
        return failReason;
    }

    public void setFailReason(String failReason) {
        this.failReason = failReason;
    }

    public String getConfidence() {
        return confidence;
    }

    public void setConfidence(String confidence) {
        this.confidence = confidence;
    }

    public String getCalibrationNote() {
        return calibrationNote;
    }

    public void setCalibrationNote(String calibrationNote) {
        this.calibrationNote = calibrationNote;
    }

    public AnalysisDetails getAnalysisDetails() {
        return analysisDetails;
    }

    public void setAnalysisDetails(AnalysisDetails analysisDetails) {
        this.analysisDetails = analysisDetails;
    }

    public String getRecommendation() {
        return recommendation;
    }

    public void setRecommendation(String recommendation) {
        this.recommendation = recommendation;
    }
}
