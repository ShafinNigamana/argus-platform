package com.argus.backend.service;

import com.argus.backend.model.VerificationRecord;
import com.google.cloud.firestore.*;
import com.google.cloud.kms.v1.*;
import com.google.protobuf.ByteString;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.List;
import java.util.concurrent.CompletableFuture;

@Slf4j
@Service
public class GcpLedgerService {

    @Value("${gcp.ledger.enabled:false}")
    private boolean enabled;

    @Value("${gcp.kms.key-name:}")
    private String keyName;

    private Firestore firestore;
    private KeyManagementServiceClient kmsClient;

    @PostConstruct
    public void init() {
        if (!enabled) {
            log.info("GCP Cryptographic Ledger is disabled.");
            return;
        }

        try {
            this.firestore = FirestoreOptions.getDefaultInstance().getService();
            this.kmsClient = KeyManagementServiceClient.create();
            log.info("GcpLedgerService initialized successfully.");
        } catch (Exception e) {
            log.error("Failed to initialize GCP Ledger services: {}", e.getMessage());
            this.enabled = false;
        }
    }

    /**
     * Anchors a verification record to the GCP Cryptographic Ledger.
     * 1. Fetches the signature of the previous record.
     * 2. Signs the new record + previous signature via KMS.
     * 3. Saves to Firestore.
     */
    @Async
    public CompletableFuture<VerificationRecord> recordOnLedger(VerificationRecord record) {
        if (!enabled) return CompletableFuture.completedFuture(record);

        try {
            // 1. Get the last record to link the chain
            QuerySnapshot lastRecords = firestore.collection("verification_ledger")
                    .orderBy("ledgerIndex", Query.Direction.DESCENDING)
                    .limit(1)
                    .get().get();

            String previousSignature = "0000000000000000000000000000000000000000000000000000000000000000";
            long nextIndex = 0;

            if (!lastRecords.isEmpty()) {
                QueryDocumentSnapshot lastDoc = lastRecords.getDocuments().get(0);
                previousSignature = lastDoc.getString("kmsSignature");
                nextIndex = lastDoc.getLong("ledgerIndex") + 1;
            }

            // 2. Prepare payload to sign (Current Hash + Previous Signature)
            String payload = record.getHash() + previousSignature;
            
            // 3. Sign via Cloud KMS
            String actualKeyName = keyName;
            if (!actualKeyName.contains("/cryptoKeyVersions/")) {
                actualKeyName = actualKeyName + "/cryptoKeyVersions/1";
            }

            AsymmetricSignRequest signRequest = AsymmetricSignRequest.newBuilder()
                    .setName(actualKeyName)
                    .setData(ByteString.copyFrom(payload, StandardCharsets.UTF_8))
                    .build();

            AsymmetricSignResponse signResponse = kmsClient.asymmetricSign(signRequest);
            String signature = HexFormat.of().formatHex(signResponse.getSignature().toByteArray());

            // 4. Update and Save Record
            record.setKmsSignature(signature);
            record.setPreviousSignature(previousSignature);
            record.setLedgerIndex(nextIndex);

            firestore.collection("verification_ledger")
                    .document(record.getSessionId())
                    .set(record).get();

            log.info("Ledger entry created for session {} at index {}", record.getSessionId(), nextIndex);
            return CompletableFuture.completedFuture(record);

        } catch (Exception e) {
            log.error("Failed to anchor record to GCP Ledger: {}", e.getMessage());
            return CompletableFuture.completedFuture(record);
        }
    }
}
