package com.argus.backend.dto;

import com.argus.backend.model.ChallengeEvent;
import lombok.Data;

import java.util.List;

/**
 * Data Transfer Object for receiving challenge execution data from the frontend.
 */
@Data
public class ChallengeRequest {
    private String challengeType;
    private long issuedAt;
    private long completedAt;
    private List<ChallengeEvent> events;
}
