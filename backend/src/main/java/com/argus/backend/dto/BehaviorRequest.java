package com.argus.backend.dto;

import com.argus.backend.model.BlinkEvent;
import com.argus.backend.model.HeadMovement;
import lombok.Data;

import java.util.List;

/**
 * Data Transfer Object for receiving behavioral data from the frontend.
 */
@Data
public class BehaviorRequest {
    private List<BlinkEvent> blinkEvents;
    private List<HeadMovement> headMovements;
    private long sessionDuration;
}
