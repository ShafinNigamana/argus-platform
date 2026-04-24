package com.argus.backend.repository;

import com.argus.backend.model.VerificationRecord;
import org.springframework.stereotype.Repository;

import java.util.concurrent.ConcurrentHashMap;

@Repository
public class VerificationStore {
    private final ConcurrentHashMap<String, VerificationRecord> records = new ConcurrentHashMap<>();

    public void save(VerificationRecord record) {
        records.put(record.getSessionId(), record);
    }

    public VerificationRecord get(String sessionId) {
        return records.get(sessionId);
    }

    public boolean exists(String sessionId) {
        return records.containsKey(sessionId);
    }
}
