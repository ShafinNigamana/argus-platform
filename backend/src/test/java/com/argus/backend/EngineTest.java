package com.argus.backend;

import com.argus.backend.engine.SignalProcessingEngine;
import com.argus.backend.model.ProcessingResult;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

import static org.junit.jupiter.api.Assertions.assertNotNull;

public class EngineTest {

    @Test
    public void testEngine() {
        SignalProcessingEngine engine = new SignalProcessingEngine();
        List<Double> signal = new ArrayList<>();
        
        // Generate a synthetic sine wave at 1.5 Hz 
        // sampling rate = 5.0 Hz
        // time t = i / 5.0
        // value = sin(2 * PI * 1.5 * t) + 1.0 (some brightness base)
        for (int i = 0; i < 60; i++) {
            double t = i / 5.0;
            double val = Math.sin(2 * Math.PI * 1.5 * t) + 1.0;
            signal.add(val);
        }
        
        ProcessingResult result = engine.process(signal, 5.0);
        System.out.println("TEST_BPM: " + result.getBpm());
        System.out.println("TEST_QUALITY: " + result.getSignalQuality());
        System.out.println("TEST_VALID: " + result.isValid());
        
        // Noise test
        List<Double> noise = new ArrayList<>();
        Random rand = new Random(42);
        for (int i = 0; i < 60; i++) {
            noise.add(rand.nextDouble());
        }
        ProcessingResult noiseResult = engine.process(noise, 5.0);
        System.out.println("NOISE_BPM: " + noiseResult.getBpm());
        System.out.println("NOISE_QUALITY: " + noiseResult.getSignalQuality());
        System.out.println("NOISE_VALID: " + noiseResult.isValid());
    }
}
