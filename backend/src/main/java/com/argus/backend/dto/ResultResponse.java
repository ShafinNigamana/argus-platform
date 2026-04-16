package com.argus.backend.dto;

import lombok.Data;

/**
 * Data Transfer Object for retrieving session results.
 */
@Data
public class ResultResponse {
    private String status;
    private double progress;
}
