package com.argus.backend.service;

import com.argus.backend.intelligence.EnhancedLivenessResponse;
import com.argus.backend.model.VerificationRecord;
import com.argus.backend.repository.VerificationStore;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

@Service
public class VerificationService {

    private final VerificationStore verificationStore;
    private final GcpLedgerService gcpLedgerService;

    public VerificationService(VerificationStore verificationStore, GcpLedgerService gcpLedgerService) {
        this.verificationStore = verificationStore;
        this.gcpLedgerService = gcpLedgerService;
    }

    public VerificationRecord createRecord(String sessionId, EnhancedLivenessResponse liveness) {
        if (verificationStore.exists(sessionId)) {
            return verificationStore.get(sessionId);
        }

        long timestamp = System.currentTimeMillis() / 1000;
        double score = liveness.getLivenessScore();
        String hash = generateHash(sessionId, score, timestamp);

        VerificationRecord record = VerificationRecord.builder()
                .sessionId(sessionId)
                .score(score)
                .timestamp(timestamp)
                .hash(hash)
                .aiScore(liveness.getLivenessScore()) // Storing the final blended score
                .aiReasoning(liveness.getRecommendation()) // Storing the AI's logic
                .build();

        // Anchoring to Google Cryptographic Ledger (KMS + Firestore)
        // We use .join() to ensure it finishes before the HTTP request completes,
        // otherwise Cloud Run throttles the CPU and the network request fails.
        gcpLedgerService.recordOnLedger(record).thenAccept(finalRecord -> {
            verificationStore.save(finalRecord);
        }).join();

        verificationStore.save(record);
        return record;
    }

    public VerificationRecord getRecord(String sessionId) {
        return verificationStore.get(sessionId);
    }

    private String generateHash(String sessionId, double score, long timestamp) {
        try {
            String data = sessionId + score + timestamp;
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] encodedHash = digest.digest(data.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(encodedHash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("Error generating hash", e);
        }
    }
}
