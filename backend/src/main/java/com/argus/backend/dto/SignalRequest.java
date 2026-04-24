package com.argus.backend.dto;

import lombok.Data;

import java.util.List;

/**
 * Data Transfer Object for batch signal ingestion from the frontend.
 */
@Data
public class SignalRequest {
    private long timestamp;
    private int fps;
    private String roi;
    private List<Double> signal;
}
