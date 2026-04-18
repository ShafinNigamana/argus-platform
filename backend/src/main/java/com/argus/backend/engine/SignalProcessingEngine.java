package com.argus.backend.engine;

import com.argus.backend.model.ProcessingResult;
import org.apache.commons.math3.complex.Complex;
import org.apache.commons.math3.transform.DftNormalization;
import org.apache.commons.math3.transform.FastFourierTransformer;
import org.apache.commons.math3.transform.TransformType;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Executes a deterministic signal processing pipeline to translate optical variances into BPM.
 *
 * <p>Module 6 upgrade: rPPG signal reliability improvements.
 * <ol>
 *   <li>Detrending — moving average subtraction to remove baseline drift</li>
 *   <li>Z-score normalization — zero-mean, unit-variance</li>
 *   <li>Frequency-domain bandpass — only 0.7–4.0 Hz bins considered</li>
 *   <li>Peak quality — SNR, spectral clarity, minimum amplitude</li>
 * </ol>
 */
@Component
public class SignalProcessingEngine {

    // ── Bandpass frequency range (Hz) ──
    private static final double BANDPASS_LOW = 0.7;    // 42 BPM
    private static final double BANDPASS_HIGH = 4.0;   // 240 BPM

    // ── BPM validity range ──
    private static final double MIN_VALID_BPM = 45.0;
    private static final double MAX_VALID_BPM = 180.0;

    // ── Peak quality thresholds ──
    private static final double MIN_SPECTRAL_SNR = 1.5;    // relaxed from 2.0
    private static final double MIN_PEAK_CLARITY = 1.2;    // relaxed from 1.5
    private static final double MIN_PEAK_AMPLITUDE = 0.01; // reject flat/no-signal

    public ProcessingResult process(List<Double> signal, double samplingRate) {
        // Step 1: Validate Input
        if (signal == null || signal.size() < 30) {
            return new ProcessingResult(0, 0, false);
        }

        // Step 2: Detrend — subtract moving average to remove slow baseline drift
        double[] detrended = detrend(signal, samplingRate);

        // Step 3: Normalize (zero-mean, unit-variance)
        double[] normalized = normalize(detrended);

        // Step 4: Pad to nearest power of 2 for FFT
        int N = 1;
        while (N < normalized.length) {
            N *= 2;
        }
        double[] padded = new double[N];
        System.arraycopy(normalized, 0, padded, 0, normalized.length);

        // Step 5: Perform FFT
        FastFourierTransformer transformer = new FastFourierTransformer(DftNormalization.STANDARD);
        Complex[] fft = transformer.transform(padded, TransformType.FORWARD);

        // Step 6: Bandpass peak detection — only consider 0.7–4.0 Hz bins
        double maxMagnitude = 0;
        double secondMaxMagnitude = 0;
        double peakFrequency = 0;
        double passbandTotal = 0;
        int passbandCount = 0;

        for (int i = 1; i < fft.length / 2; i++) {
            double frequency = (i * samplingRate) / N;

            if (frequency < BANDPASS_LOW || frequency > BANDPASS_HIGH) {
                continue;
            }

            double magnitude = fft[i].abs();
            passbandTotal += magnitude;
            passbandCount++;

            if (magnitude > maxMagnitude) {
                secondMaxMagnitude = maxMagnitude;
                maxMagnitude = magnitude;
                peakFrequency = frequency;
            } else if (magnitude > secondMaxMagnitude) {
                secondMaxMagnitude = magnitude;
            }
        }

        // Step 7: Peak quality validation
        double avgPassband = passbandCount > 0 ? (passbandTotal / passbandCount) : 0;
        double spectralSNR = avgPassband > 0 ? (maxMagnitude / avgPassband) : 0;
        double peakClarity = secondMaxMagnitude > 0
                ? (maxMagnitude / secondMaxMagnitude)
                : (maxMagnitude > 0 ? 10.0 : 0);

        boolean peakValid = maxMagnitude >= MIN_PEAK_AMPLITUDE
                && spectralSNR >= MIN_SPECTRAL_SNR
                && peakClarity >= MIN_PEAK_CLARITY;

        // Step 8: Convert to BPM
        double bpm = peakFrequency * 60.0;

        // Step 9: Combined validity
        boolean valid = peakValid && bpm >= MIN_VALID_BPM && bpm <= MAX_VALID_BPM;

        // Step 10: Signal quality (composite of SNR + clarity)
        double signalQuality = computeSignalQuality(spectralSNR, peakClarity, peakValid);

        return new ProcessingResult(bpm, signalQuality, valid);
    }

    /**
     * Detrend: subtract moving average to remove slow baseline drift.
     * Window size ≈ 1 second of samples. Uses cumulative sum for O(n) efficiency.
     */
    private double[] detrend(List<Double> signal, double samplingRate) {
        int windowSize = Math.max(1, (int) Math.round(samplingRate));
        int n = signal.size();
        double[] result = new double[n];

        double[] cumSum = new double[n + 1];
        cumSum[0] = 0;
        for (int i = 0; i < n; i++) {
            cumSum[i + 1] = cumSum[i] + signal.get(i);
        }

        int halfWin = windowSize / 2;
        for (int i = 0; i < n; i++) {
            int start = Math.max(0, i - halfWin);
            int end = Math.min(n, i + halfWin + 1);
            double localMean = (cumSum[end] - cumSum[start]) / (end - start);
            result[i] = signal.get(i) - localMean;
        }

        return result;
    }

    /**
     * Z-score normalization: (signal - mean) / stdDev.
     * Returns zeros for flat signals (stdDev ≈ 0).
     */
    private double[] normalize(double[] signal) {
        double sum = 0;
        for (double v : signal) {
            sum += v;
        }
        double mean = sum / signal.length;

        double varSum = 0;
        for (double v : signal) {
            double diff = v - mean;
            varSum += diff * diff;
        }
        double stdDev = Math.sqrt(varSum / signal.length);

        double[] result = new double[signal.length];
        if (stdDev < 1e-10) {
            return result; // Flat signal → all zeros
        }

        for (int i = 0; i < signal.length; i++) {
            result[i] = (signal[i] - mean) / stdDev;
        }
        return result;
    }

    /**
     * Composite signal quality from spectral metrics (0.0–1.0).
     * SNR contributes 60%, peak clarity contributes 40%.
     */
    private double computeSignalQuality(double spectralSNR, double peakClarity, boolean peakValid) {
        if (!peakValid) {
            return 0.0;
        }

        // SNR component: maps SNR 2.0→10.0 to score 0.3→1.0
        double snrScore = Math.min(1.0, Math.max(0.0, (spectralSNR - 2.0) / 8.0) * 0.7 + 0.3);

        // Clarity component: maps clarity 1.5→5.0 to score 0.3→1.0
        double clarityScore = Math.min(1.0, Math.max(0.0, (peakClarity - 1.5) / 3.5) * 0.7 + 0.3);

        double quality = snrScore * 0.6 + clarityScore * 0.4;

        return Math.round(quality * 100.0) / 100.0;
    }
}
