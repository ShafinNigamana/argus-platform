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

    private static final long INACTIVITY_TIMEOUT_MS = 30_000; // 30 seconds
    private static final long SESSION_MAX_LIFETIME_MS = 120_000; // 120 seconds

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
        return createSession(null);
    }

    /**
     * Creates a new verification session bound to an authenticated user ID.
     *
     * @param userId owner of the session
     * @return the newly created Session
     */
    public Session createSession(String userId) {
        Session session = new Session();
        session.setSessionId(UUID.randomUUID().toString());
        session.setUserId(userId);
        session.setState(SessionState.INIT);
        
        long now = System.currentTimeMillis();
        session.setCreatedAt(now);
        session.setLastUpdatedAt(now);
        session.setLastProcessedAt(0);
        session.setProcessing(false);

        sessionStore.save(session);
        return session;
    }

    /**
     * Verifies that the authenticated caller is the session owner or an administrator.
     *
     * @param session target session
     * @param auth authenticated principal
     */
    public void verifySessionOwnership(Session session, org.springframework.security.core.Authentication auth) {
        if (session.getUserId() == null || auth == null || auth.getName() == null) {
            return;
        }
        boolean isOwner = session.getUserId().equals(auth.getName());
        boolean isAdmin = auth.getAuthorities().stream().anyMatch(a ->
                a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_SUPERADMIN"));
        if (!isOwner && !isAdmin) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Access denied: caller '" + auth.getName() + "' is not owner of session " + session.getSessionId());
        }
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
