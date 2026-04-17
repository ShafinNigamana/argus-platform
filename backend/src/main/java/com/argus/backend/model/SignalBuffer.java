package com.argus.backend.model;

import java.util.ArrayList;
import java.util.List;

public class SignalBuffer {
    
    private final List<Double> values;
    private final int maxSize;

    public SignalBuffer(int maxSize) {
        this.maxSize = maxSize;
        this.values = new ArrayList<>();
    }

    public synchronized void add(double value) {
        if (values.size() >= maxSize) {
            values.remove(0); // Remove oldest value to maintain sliding window
        }
        values.add(value);
    }

    public synchronized List<Double> getValues() {
        return new ArrayList<>(values); // Return a copy for thread-safety 
    }

    public synchronized int size() {
        return values.size();
    }
}
