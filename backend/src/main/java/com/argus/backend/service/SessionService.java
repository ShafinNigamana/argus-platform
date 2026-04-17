package com.argus.backend.service;

import com.argus.backend.exception.SessionException;
import com.argus.backend.model.Session;
import com.argus.backend.model.SessionState;
import com.argus.backend.repository.SessionStore;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Core business logic for session lifecycle management.
 * Handles creation, retrieval, state validation, activity tracking, and expiration.
 */
@Service
public class SessionService {

    private static final long INACTIVITY_TIMEOUT_MS = 10_000; // 10 seconds
    private static final long SESSION_MAX_LIFETIME_MS = 30_000; // 30 seconds

    private final SessionStore sessionStore;

    public SessionService(SessionStore sessionStore) {
        this.sessionStore = sessionStore;
    }

    /**
     * Creates a new verification session with a unique ID and INIT state.
     *
     * @return the newly created Session
     */
    public Session createSession() {
        Session session = new Session();
        session.setSessionId(UUID.randomUUID().toString());
        session.setState(SessionState.INIT);
        
        long now = System.currentTimeMillis();
        session.setCreatedAt(now);
        session.setLastUpdatedAt(now);
        session.setLastProcessedAt(0);
        
        session.setProcessing(false);

        sessionStore.save(session);
        System.out.println("Session created: " + session.getSessionId());
        
        return session;
    }

    /**
     * Retrieves an existing session by ID.
     *
     * @param sessionId the unique session identifier
     * @return the Session
     * @throws RuntimeException if no session is found with the given ID
     */
    public Session getSession(String sessionId) {
        Session session = sessionStore.get(sessionId);
        if (session == null) {
            throw new SessionException("SESSION_NOT_FOUND");
        }
        
        checkAndExpire(session);
        
        if (session.getState() == SessionState.EXPIRED) {
            throw new SessionException("SESSION_EXPIRED");
        }
        
        updateActivity(session);
        
        return session;
    }

    /**
     * Validates that a session is in the expected state.
     *
     * @param session  the session to validate
     * @param expected the expected SessionState
     * @throws SessionException if the session state does not match
     */
    public void validateState(Session session, SessionState expected) {
        if (session.getState() != expected) {
            throw new SessionException("INVALID_SESSION_STATE");
        }
    }

    /**
     * Updates the session's last activity timestamp to the current time.
     *
     * @param session the session to update
     */
    public void updateActivity(Session session) {
        session.setLastUpdatedAt(System.currentTimeMillis());
    }

    /**
     * Checks whether the session has exceeded inactivity or lifetime limits,
     * and marks it as EXPIRED if so.
     *
     * @param session the session to check
     */
    public void checkAndExpire(Session session) {
        if (session.getState() == SessionState.EXPIRED) {
            return;
        }

        long currentTime = System.currentTimeMillis();

        if (currentTime - session.getLastUpdatedAt() > INACTIVITY_TIMEOUT_MS) {
            session.setState(SessionState.EXPIRED);
        }

        if (currentTime - session.getCreatedAt() > SESSION_MAX_LIFETIME_MS) {
            session.setState(SessionState.EXPIRED);
        }
    }
}
