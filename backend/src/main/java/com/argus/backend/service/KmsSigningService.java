package com.argus.backend.service;

import com.google.cloud.kms.v1.AsymmetricSignRequest;
import com.google.cloud.kms.v1.AsymmetricSignResponse;
import com.google.cloud.kms.v1.KeyManagementServiceClient;
import com.google.cloud.kms.v1.PublicKey;
import com.google.protobuf.ByteString;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

/**
 * Service for signing cryptographic artifacts such as Verification Certificates.
 *
 * <p>Supports Google Cloud KMS asymmetric signing when {@code gcp.kms.key-name} is provided.
 * When running locally, in test suites, or without GCP credentials, it gracefully falls back
 * to deterministic SHA-256 cryptographic digests. TDD §3.1.3, §5.3.
 */
@Slf4j
@Service
public class KmsSigningService {

    @Value("${gcp.kms.key-name:}")
    private String keyName;

    private KeyManagementServiceClient kmsClient;
    private boolean kmsAvailable = false;

    @PostConstruct
    public void init() {
        if (keyName != null && !keyName.isBlank()) {
            try {
                this.kmsClient = KeyManagementServiceClient.create();
                this.kmsAvailable = true;
                log.info("Cloud KMS signing initialized with key: {}", keyName);
            } catch (Exception e) {
                log.warn("Cloud KMS client initialization failed (fallback to SHA-256): {}", e.getMessage());
                this.kmsAvailable = false;
            }
        } else {
            log.info("Cloud KMS key not configured; using local SHA-256 signing fallback.");
        }
    }

    @PreDestroy
    public void close() {
        if (kmsClient != null) {
            try {
                kmsClient.close();
            } catch (Exception ignored) {
            }
        }
    }

    /**
     * Signs the input string payload.
     *
     * @param payload the string payload to sign
     * @return hex-encoded signature string
     */
    public String sign(String payload) {
        if (kmsAvailable && kmsClient != null) {
            try {
                String actualKeyName = keyName;
                if (!actualKeyName.contains("/cryptoKeyVersions/")) {
                    actualKeyName = actualKeyName + "/cryptoKeyVersions/1";
                }

                AsymmetricSignRequest request = AsymmetricSignRequest.newBuilder()
                        .setName(actualKeyName)
                        .setData(ByteString.copyFrom(payload, StandardCharsets.UTF_8))
                        .build();

                AsymmetricSignResponse response = kmsClient.asymmetricSign(request);
                return HexFormat.of().formatHex(response.getSignature().toByteArray());
            } catch (Exception e) {
                log.error("Cloud KMS signing failed, falling back to SHA-256: {}", e.getMessage());
            }
        }

        // Local SHA-256 fallback
        return signLocally(payload);
    }

    /**
     * Retrieves the PEM-formatted public key for verification.
     *
     * @return PEM string or fallback identifier
     */
    public String getPublicKeyPem() {
        if (kmsAvailable && kmsClient != null) {
            try {
                String actualKeyName = keyName;
                if (!actualKeyName.contains("/cryptoKeyVersions/")) {
                    actualKeyName = actualKeyName + "/cryptoKeyVersions/1";
                }
                PublicKey pubKey = kmsClient.getPublicKey(actualKeyName);
                return pubKey.getPem();
            } catch (Exception e) {
                log.warn("Failed to retrieve KMS public key: {}", e.getMessage());
            }
        }
        return "ARGUS-PLATFORM-LOCAL-SHA256";
    }

    /**
     * Deterministic SHA-256 digest fallback for local dev and test environments.
     */
    public String signLocally(String data) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(data.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to calculate SHA-256 hash", e);
        }
    }

    public boolean isKmsAvailable() {
        return kmsAvailable;
    }
}
