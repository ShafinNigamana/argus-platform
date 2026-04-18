package com.argus.backend.service;

import com.argus.backend.dto.ChallengeRequest;
import com.argus.backend.engine.ChallengeValidationEngine;
import com.argus.backend.model.ChallengeInput;
import com.argus.backend.model.ChallengeResult;
import com.argus.backend.model.Session;
import org.springframework.stereotype.Service;

/**
 * Service layer for challenge–response validation.
 * Receives challenge execution data, delegates scoring to {@link ChallengeValidationEngine},
 * and persists the result on the session for downstream consumption by Module 9.
 */
@Service
public class ChallengeService {

    private final SessionService sessionService;
    private final ChallengeValidationEngine challengeEngine;

    public ChallengeService(SessionService sessionService, ChallengeValidationEngine challengeEngine) {
        this.sessionService = sessionService;
        this.challengeEngine = challengeEngine;
    }

    /**
     * Processes challenge execution data for a session, computes the challenge score,
     * and stores the result on the session object.
     *
     * @param sessionId the active session ID
     * @param request   challenge execution data from the frontend
     * @return the computed ChallengeResult
     */
    public ChallengeResult handleChallenge(String sessionId, ChallengeRequest request) {
        Session session = sessionService.getSession(sessionId);

        ChallengeInput input = new ChallengeInput();
        input.setChallengeType(request.getChallengeType());
        input.setIssuedAt(request.getIssuedAt());
        input.setCompletedAt(request.getCompletedAt());
        input.setEvents(request.getEvents());

        ChallengeResult result = challengeEngine.evaluate(input);

        // Persist on session so Module 9 can read it during /result
        session.setChallengeResult(result);

        return result;
    }
}
