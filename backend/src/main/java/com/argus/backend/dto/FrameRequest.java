package com.argus.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Data;

import java.util.List;

/**
 * Data Transfer Object for incoming frame data.
 * Mapped to expect snake_case inputs via Jackson.
 */
@Data
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class FrameRequest {
    private int frameId;
    private long timestamp;
    private boolean faceDetected;
    @JsonProperty("face_bbox")
    private FaceBBox faceBBox;
    private List<Landmark> landmarks;
    private ROI roi;
    private FrameQuality frameQuality;

    @Data
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static class FaceBBox {
        private int x;
        private int y;
        private int width;
        private int height;
    }

    @Data
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static class Landmark {
        private double x;
        private double y;
    }

    @Data
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static class ROI {
        private int[] forehead;
        private int[] leftCheek;
        private int[] rightCheek;
    }

    @Data
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static class FrameQuality {
        private double brightness;
        private double blurScore;
        private double faceStability;
    }
}
