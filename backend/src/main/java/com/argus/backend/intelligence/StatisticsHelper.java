package com.argus.backend.intelligence;

import java.util.List;

/**
 * Deterministic statistical helper methods used by intelligence analysis.
 */
public final class StatisticsHelper {

    private StatisticsHelper() {
    }

    public static double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }

    public static double[] toPrimitive(List<Double> values) {
        if (values == null || values.isEmpty()) {
            return new double[0];
        }
        double[] out = new double[values.size()];
        for (int i = 0; i < values.size(); i++) {
            Double value = values.get(i);
            out[i] = value == null ? 0.0 : value;
        }
        return out;
    }

    public static double mean(double[] values) {
        if (values == null || values.length == 0) {
            return 0.0;
        }
        double sum = 0.0;
        for (double value : values) {
            sum += value;
        }
        return sum / values.length;
    }

    public static double variance(double[] values) {
        if (values == null || values.length == 0) {
            return 0.0;
        }
        double mean = mean(values);
        double sumSq = 0.0;
        for (double value : values) {
            double diff = value - mean;
            sumSq += diff * diff;
        }
        return sumSq / values.length;
    }

    public static double stdDev(double[] values) {
        return Math.sqrt(variance(values));
    }

    public static double coefficientOfVariation(double[] values) {
        double mean = mean(values);
        if (mean == 0.0) {
            return 0.0;
        }
        return stdDev(values) / mean;
    }

    public static double[] differences(double[] values) {
        if (values == null || values.length < 2) {
            return new double[0];
        }
        double[] out = new double[values.length - 1];
        for (int i = 1; i < values.length; i++) {
            out[i - 1] = values[i] - values[i - 1];
        }
        return out;
    }

    public static double[] secondDerivative(double[] values) {
        return differences(differences(values));
    }

    /**
     * Returns max absolute normalized autocorrelation peak for non-zero lags.
     */
    public static double autocorrelationPeakRatio(double[] values) {
        if (values == null || values.length < 3) {
            return 0.0;
        }

        double mean = mean(values);
        double energy = 0.0;
        double[] centered = new double[values.length];
        for (int i = 0; i < values.length; i++) {
            centered[i] = values[i] - mean;
            energy += centered[i] * centered[i];
        }

        if (energy == 0.0) {
            return 0.0;
        }

        double peak = 0.0;
        for (int lag = 1; lag < centered.length; lag++) {
            double numerator = 0.0;
            for (int i = lag; i < centered.length; i++) {
                numerator += centered[i] * centered[i - lag];
            }
            double ratio = Math.abs(numerator / energy);
            if (ratio > peak) {
                peak = ratio;
            }
        }
        return clamp(peak, 0.0, 1.0);
    }
}
