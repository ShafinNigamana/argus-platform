package com.argus.backend.model;

import lombok.Data;

/**
 * Result structure generated post-signal extraction via FFT processing.
 */
@Data
public class ProcessingResult {
    private double bpm;
    private double signalQuality;
    private boolean valid;

    public ProcessingResult() {
    }

    public ProcessingResult(double bpm, double signalQuality, boolean valid) {
        this.bpm = bpm;
        this.signalQuality = signalQuality;
        this.valid = valid;
    }
}
