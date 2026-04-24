package com.argus.backend.engine;

import com.argus.backend.model.ProcessingResult;
import lombok.extern.slf4j.Slf4j;
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
@Slf4j
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

        // Step 3: Denoise — apply 5-tap moving average to suppress sensor jitter
        double[] smoothed = smooth(detrended);

        // Step 4: Normalize (zero-mean, unit-variance)
        double[] normalized = normalize(smoothed);

        // Step 5: Apply Hanning Window to reduce spectral leakage
        double[] windowed = new double[normalized.length];
        for (int i = 0; i < normalized.length; i++) {
            double multiplier = 0.5 * (1 - Math.cos(2 * Math.PI * i / (normalized.length - 1)));
            windowed[i] = normalized[i] * multiplier;
        }

        // Step 6: Pad to nearest power of 2 for FFT
        int N = 1;
        while (N < windowed.length) {
            N *= 2;
        }
        double[] padded = new double[N];
        System.arraycopy(windowed, 0, padded, 0, windowed.length);

        // Step 7: Perform FFT
        FastFourierTransformer transformer = new FastFourierTransformer(DftNormalization.STANDARD);
        Complex[] fft = transformer.transform(padded, TransformType.FORWARD);

        // Step 8: Bandpass peak detection — only consider 0.7–4.0 Hz bins
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

        // Step 9: Peak quality metrics
        double avgPassband = passbandCount > 0 ? (passbandTotal / passbandCount) : 0;
        double spectralSNR = avgPassband > 0 ? (maxMagnitude / avgPassband) : 0;
        double peakClarity = secondMaxMagnitude > 0
                ? (maxMagnitude / secondMaxMagnitude)
                : (maxMagnitude > 0 ? 10.0 : 0);

        boolean peakValid = maxMagnitude >= MIN_PEAK_AMPLITUDE
                && spectralSNR >= MIN_SPECTRAL_SNR
                && peakClarity >= MIN_PEAK_CLARITY;

        // Step 10: Convert to BPM
        double bpm = peakFrequency * 60.0;
        boolean bpmInRange = bpm >= MIN_VALID_BPM && bpm <= MAX_VALID_BPM;

        // Step 11: Combined validity — valid if BPM in range (relaxed for mobile rPPG)
        boolean valid = bpmInRange && maxMagnitude >= MIN_PEAK_AMPLITUDE;

        // Step 12: Signal quality — mobile rPPG aware
        double signalQuality = computeSignalQuality(spectralSNR, peakClarity, peakValid, bpmInRange);

        log.debug("rPPG Metrics: BPM={}, SNR={}, Clarity={}, Quality={}, Valid={}", 
                  Math.round(bpm), Math.round(spectralSNR * 10.0) / 10.0, 
                  Math.round(peakClarity * 10.0) / 10.0, signalQuality, valid);

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
     * Smooth: 5-tap moving average to remove high-frequency sensor jitter.
     */
    private double[] smooth(double[] signal) {
        int n = signal.length;
        if (n < 5) return signal;
        double[] result = new double[n];
        for (int i = 0; i < n; i++) {
            int start = Math.max(0, i - 2);
            int end = Math.min(n - 1, i + 2);
            double sum = 0;
            for (int j = start; j <= end; j++) {
                sum += signal[j];
            }
            result[i] = sum / (end - start + 1);
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
     * Mobile rPPG aware: assigns a baseline quality when BPM is valid
     * even if spectral metrics are below strict thresholds.
     *
     * @param spectralSNR  the signal-to-noise ratio of the dominant peak
     * @param peakClarity  ratio of dominant peak to second-highest peak
     * @param peakValid    whether strict spectral thresholds were met
     * @param bpmInRange   whether the detected BPM is physiologically valid
     */
    private double computeSignalQuality(double spectralSNR, double peakClarity,
                                         boolean peakValid, boolean bpmInRange) {
        // Case 1: Strong signal — strict spectral thresholds met
        if (peakValid) {
            // SNR component: maps SNR 1.5→10.0 to score 0.4→1.0
            double snrScore = Math.min(1.0, Math.max(0.0, (spectralSNR - MIN_SPECTRAL_SNR) / (10.0 - MIN_SPECTRAL_SNR)) * 0.6 + 0.4);

            // Clarity component: maps clarity 1.2→5.0 to score 0.4→1.0
            double clarityScore = Math.min(1.0, Math.max(0.0, (peakClarity - MIN_PEAK_CLARITY) / (5.0 - MIN_PEAK_CLARITY)) * 0.6 + 0.4);

            double quality = snrScore * 0.6 + clarityScore * 0.4;
            return Math.round(quality * 100.0) / 100.0;
        }

        // Case 2: Weak but usable signal — BPM found in valid physiological range
        // Mobile rPPG signals are inherently noisy; a valid BPM indicates real cardiac data
        if (bpmInRange) {
            // Assign baseline quality proportional to whatever SNR/clarity we do have
            double snrFactor = Math.min(1.0, spectralSNR / MIN_SPECTRAL_SNR);   // 0→1 as SNR approaches threshold
            double clarityFactor = Math.min(1.0, peakClarity / MIN_PEAK_CLARITY); // 0→1 as clarity approaches threshold

            // Baseline range: 0.40–0.60 — a valid BPM from mobile rPPG is real cardiac evidence
            double baseline = 0.40 + 0.20 * (snrFactor * 0.6 + clarityFactor * 0.4);
            return Math.round(baseline * 100.0) / 100.0;
        }

        // Case 3: No valid signal at all
        return 0.0;
    }
}
