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
     * Processes multiple challenge execution events, computes an aggregated score,
     * and stores the result on the session object.
     *
     * @param sessionId the active session ID
     * @param requests  list of challenge attempts
     * @return the aggregated ChallengeResult
     */
    public ChallengeResult handleChallenges(String sessionId, java.util.List<ChallengeRequest> requests) {
        Session session = sessionService.getSession(sessionId);

        if (requests == null || requests.isEmpty()) {
            ChallengeResult fail = new ChallengeResult();
            fail.setChallengeScore(0.0);
            fail.setValid(false);
            fail.setFailReason("NO_CHALLENGES_PROVIDED");
            session.setChallengeResult(fail);
            return fail;
        }

        double totalScore = 0;
        int validCount = 0;
        StringBuilder failReasons = new StringBuilder();

        for (ChallengeRequest request : requests) {
            ChallengeInput input = new ChallengeInput();
            input.setChallengeType(request.getChallengeType());
            input.setIssuedAt(request.getIssuedAt());
            input.setCompletedAt(request.getCompletedAt());
            input.setEvents(request.getEvents());

            ChallengeResult res = challengeEngine.evaluate(input);
            totalScore += res.getChallengeScore();
            if (res.isValid()) {
                validCount++;
            } else if (res.getFailReason() != null) {
                if (failReasons.length() > 0) failReasons.append(", ");
                failReasons.append(res.getFailReason());
            }
        }

        ChallengeResult finalResult = new ChallengeResult();
        finalResult.setChallengeScore(Math.round((totalScore / requests.size()) * 100.0) / 100.0);
        // Valid if at least one challenge passed (or strictly all, but usually at least one is safer for UX)
        // User's report mentioned "All scores populated", suggesting we should be balanced.
        // I'll go with valid if at least one passed and average score is > 0.5
        finalResult.setValid(validCount > 0 && finalResult.getChallengeScore() >= 0.5);
        if (!finalResult.isValid()) {
            finalResult.setFailReason(failReasons.length() > 0 ? failReasons.toString() : "LOW_SCORE");
        }

        session.setChallengeResult(finalResult);
        return finalResult;
    }
}
