package com.argus.backend.repository;

import com.argus.backend.model.Session;
import org.springframework.stereotype.Repository;

import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory, thread-safe storage for verification sessions.
 * Uses ConcurrentHashMap for concurrent read/write safety.
 */
@Repository
public class SessionStore {

    private final ConcurrentHashMap<String, Session> sessions = new ConcurrentHashMap<>();

    /**
     * Persists a session. Overwrites any existing session with the same ID.
     *
     * @param session the session to save
     */
    public void save(Session session) {
        sessions.put(session.getSessionId(), session);
    }

    /**
     * Retrieves a session by its ID.
     *
     * @param sessionId the unique session identifier
     * @return the Session, or null if not found
     */
    public Session get(String sessionId) {
        return sessions.get(sessionId);
    }

    /**
     * Checks whether a session with the given ID exists.
     *
     * @param sessionId the unique session identifier
     * @return true if the session exists, false otherwise
     */
    public boolean exists(String sessionId) {
        return sessions.containsKey(sessionId);
    }

    /**
     * Removes a session from the store.
     *
     * @param sessionId the unique session identifier
     */
    public void remove(String sessionId) {
        sessions.remove(sessionId);
    }
}
