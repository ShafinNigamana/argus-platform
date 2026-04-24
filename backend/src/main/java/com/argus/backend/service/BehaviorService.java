package com.argus.backend.service;

import com.argus.backend.dto.BehaviorRequest;
import com.argus.backend.engine.BehaviorValidationEngine;
import com.argus.backend.model.BehaviorInput;
import com.argus.backend.model.BehaviorResult;
import com.argus.backend.model.Session;
import org.springframework.stereotype.Service;

/**
 * Service layer for behavioral validation.
 * Receives raw behavioral events, delegates scoring to {@link BehaviorValidationEngine},
 * and persists the result on the session for downstream consumption by Module 9.
 */
@Service
public class BehaviorService {

    private final SessionService sessionService;
    private final BehaviorValidationEngine behaviorEngine;

    public BehaviorService(SessionService sessionService, BehaviorValidationEngine behaviorEngine) {
        this.sessionService = sessionService;
        this.behaviorEngine = behaviorEngine;
    }

    /**
     * Processes behavioral data for a session, computes the behavior score,
     * and stores the result on the session object.
     *
     * @param sessionId the active session ID
     * @param request   behavioral data from the frontend
     * @return the computed BehaviorResult
     */
    public BehaviorResult handleBehavior(String sessionId, BehaviorRequest request) {
        Session session = sessionService.getSession(sessionId);

        BehaviorInput input = new BehaviorInput();
        input.setBlinkEvents(request.getBlinkEvents());
        input.setHeadMovements(request.getHeadMovements());
        input.setSessionDuration(request.getSessionDuration());

        BehaviorResult result = behaviorEngine.evaluate(input);

        // Persist on session so Module 9 can read it during /result
        session.setBehaviorResult(result);
        session.setBehaviorInput(input);

        return result;
    }
}
