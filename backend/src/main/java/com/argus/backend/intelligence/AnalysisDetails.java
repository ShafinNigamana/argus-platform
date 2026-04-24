package com.argus.backend.intelligence;

import java.util.ArrayList;
import java.util.List;

/**
 * Explainability details for intelligence penalties and naturalness signals.
 */
public class AnalysisDetails {

    private double blinkNaturalness;
    private double movementNaturalness;
    private double reactionNaturalness;
    private List<String> penaltiesApplied = new ArrayList<>();

    public double getBlinkNaturalness() {
        return blinkNaturalness;
    }

    public void setBlinkNaturalness(double blinkNaturalness) {
        this.blinkNaturalness = blinkNaturalness;
    }

    public double getMovementNaturalness() {
        return movementNaturalness;
    }

    public void setMovementNaturalness(double movementNaturalness) {
        this.movementNaturalness = movementNaturalness;
    }

    public double getReactionNaturalness() {
        return reactionNaturalness;
    }

    public void setReactionNaturalness(double reactionNaturalness) {
        this.reactionNaturalness = reactionNaturalness;
    }

    public List<String> getPenaltiesApplied() {
        return penaltiesApplied;
    }

    public void setPenaltiesApplied(List<String> penaltiesApplied) {
        this.penaltiesApplied = penaltiesApplied;
    }
}
