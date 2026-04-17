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
 */
@Component
public class SignalProcessingEngine {

    public ProcessingResult process(List<Double> signal, double samplingRate) {
        // Step 1: Validate Input
        if (signal == null || signal.size() < 30) {
            return new ProcessingResult(0, 0, false);
        }

        // Step 2: Normalize Signal (Subtract Mean)
        double sum = 0;
        for (double val : signal) {
            sum += val;
        }
        double mean = sum / signal.size();

        double[] normalizedSignal = new double[signal.size()];
        for (int i = 0; i < signal.size(); i++) {
            normalizedSignal[i] = signal.get(i) - mean;
        }

        // Step 3: Prepare FFT Input (Pad to nearest power of 2)
        int N = 1;
        while (N < normalizedSignal.length) {
            N *= 2;
        }
        double[] paddedSignal = new double[N];
        System.arraycopy(normalizedSignal, 0, paddedSignal, 0, normalizedSignal.length);

        // Step 4: Perform FFT
        FastFourierTransformer transformer = new FastFourierTransformer(DftNormalization.STANDARD);
        Complex[] complexResult = transformer.transform(paddedSignal, TransformType.FORWARD);

        // Steps 5-8: Magnitude Spectrum, Frequency Mapping, Search Limit, and Peak Detection
        double maxMagnitude = 0;
        double peakFrequency = 0;
        double totalMagnitude = 0;
        int validBinCount = 0;

        // Skip DC component (index 0) and iterate only real symmetric half
        for (int i = 1; i < complexResult.length / 2; i++) {
            double real = complexResult[i].getReal();
            double imag = complexResult[i].getImaginary();
            double magnitude = Math.sqrt(real * real + imag * imag);
            
            totalMagnitude += magnitude;
            validBinCount++;

            double frequency = (i * samplingRate) / N;

            // Target search limit: 0.7 Hz to 3.0 Hz
            if (frequency >= 0.7 && frequency <= 3.0) {
                if (magnitude > maxMagnitude) {
                    maxMagnitude = magnitude;
                    peakFrequency = frequency;
                }
            }
        }

        // Step 9: Convert to BPM
        double bpm = peakFrequency * 60;

        // Step 10: Signal Quality (peak / average) -> Scaled to roughly [0.0, 1.0]
        double avgMagnitude = validBinCount > 0 ? (totalMagnitude / validBinCount) : 1;
        double quality = avgMagnitude > 0 ? (maxMagnitude / avgMagnitude) : 0;
        double signalQuality = Math.min(1.0, quality / 10.0);

        // Step 11: Validate BPM limits
        boolean valid = bpm >= 45 && bpm <= 180;

        return new ProcessingResult(bpm, signalQuality, valid);
    }
}
