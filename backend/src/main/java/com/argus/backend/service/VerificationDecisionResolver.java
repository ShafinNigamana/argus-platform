package com.argus.backend.service;

import com.argus.backend.entity.Verification;
import com.argus.backend.entity.Verification.VerificationStatus;
import com.argus.backend.model.VerificationReasonCode;
import com.argus.backend.model.VerificationVerdict;
import lombok.Builder;
import lombok.Data;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Authoritative resolver for Stage 3 Explainable Verification Decisions.
 * <p>
 * Evaluates a {@link Verification} and derives its structured semantic outcome:
 * <ul>
 *   <li>{@link VerificationVerdict}: PRESENCE_CONFIRMED, PRESENCE_NOT_CONFIRMED, INCONCLUSIVE, or INCOMPLETE</li>
 *   <li>{@link VerificationReasonCode}: machine-readable code (e.g. SPOOF_DETECTED, MULTIPLE_FACES, CHALLENGE_FAILED, LOW_CONFIDENCE, INCOMPLETE)</li>
 *   <li>Human-readable explanation message</li>
 * </ul>
 */
@Component
public class VerificationDecisionResolver {

    @Data
    @Builder
    public static class Decision {
        private final VerificationVerdict verdict;
        private final String reasonCode;
        private final String reason;
    }

    /**
     * Resolves the authoritative decision for a given verification.
     *
     * @param v verification entity
     * @return structured Decision
     */
    public Decision resolve(Verification v) {
        if (v == null || v.getStatus() == null) {
            return Decision.builder()
                    .verdict(VerificationVerdict.INCOMPLETE)
                    .reasonCode(VerificationReasonCode.INCOMPLETE.name())
                    .reason("Verification workflow has not reached a final decision.")
                    .build();
        }

        VerificationStatus status = v.getStatus();
        Map<String, Object> scores = v.getComponentScores();

        // 1. INITIATED or IN_PROGRESS -> INCOMPLETE
        if (status == VerificationStatus.INITIATED || status == VerificationStatus.IN_PROGRESS) {
            return Decision.builder()
                    .verdict(VerificationVerdict.INCOMPLETE)
                    .reasonCode(VerificationReasonCode.INCOMPLETE.name())
                    .reason("Verification workflow has not reached a final decision.")
                    .build();
        }

        // 2. COMPLETED -> PRESENCE_CONFIRMED
        if (status == VerificationStatus.COMPLETED) {
            String reasoning = (scores != null && scores.containsKey("reasoning"))
                    ? String.valueOf(scores.get("reasoning"))
                    : "Live human presence verified successfully.";
            return Decision.builder()
                    .verdict(VerificationVerdict.PRESENCE_CONFIRMED)
                    .reasonCode(null)
                    .reason(reasoning)
                    .build();
        }

        // 3. FAILED: determine if PRESENCE_NOT_CONFIRMED (fatal security violation) or INCONCLUSIVE (low confidence)
        if (scores != null) {
            // Check if explicitly persisted in componentScores
            if (scores.containsKey("verdict") && scores.containsKey("reasonCode")) {
                try {
                    VerificationVerdict verdict = VerificationVerdict.valueOf(String.valueOf(scores.get("verdict")));
                    String reasonCode = String.valueOf(scores.get("reasonCode"));
                    String reason = scores.containsKey("reason") ? String.valueOf(scores.get("reason")) : null;
                    return Decision.builder()
                            .verdict(verdict)
                            .reasonCode(reasonCode)
                            .reason(reason)
                            .build();
                } catch (Exception ignored) {
                    // fall back to derivation below
                }
            }

            String classification = scores.containsKey("antiSpoofClassification")
                    ? String.valueOf(scores.get("antiSpoofClassification"))
                    : null;
            Boolean isReal = scores.containsKey("antiSpoofReal")
                    ? (Boolean) scores.get("antiSpoofReal")
                    : null;

            // Fatal Gate A: Multiple Faces
            if ("MULTIPLE_FACES".equals(classification)) {
                return Decision.builder()
                        .verdict(VerificationVerdict.PRESENCE_NOT_CONFIRMED)
                        .reasonCode(VerificationReasonCode.MULTIPLE_FACES.name())
                        .reason("Multiple faces detected. Policy requires exactly one person.")
                        .build();
            }

            // Fatal Gate B: Presentation Attack / Spoof
            if (Boolean.FALSE.equals(isReal)) {
                String desc = classification != null ? classification : "SPOOF";
                return Decision.builder()
                        .verdict(VerificationVerdict.PRESENCE_NOT_CONFIRMED)
                        .reasonCode(VerificationReasonCode.SPOOF_DETECTED.name())
                        .reason("Presentation attack detected (" + desc + ").")
                        .build();
            }

            // Fatal Gate C: Challenge Failure
            if (scores.containsKey("challenge")) {
                double chScore = ((Number) scores.get("challenge")).doubleValue();
                if (chScore < 0.8) {
                    return Decision.builder()
                            .verdict(VerificationVerdict.PRESENCE_NOT_CONFIRMED)
                            .reasonCode(VerificationReasonCode.CHALLENGE_FAILED.name())
                            .reason("Active challenge response failed or timed out.")
                            .build();
                }
            }

            String reasoning = scores.containsKey("reasoning") ? String.valueOf(scores.get("reasoning")) : "";
            if (reasoning.contains("challenge") && reasoning.toLowerCase().contains("failed")) {
                return Decision.builder()
                        .verdict(VerificationVerdict.PRESENCE_NOT_CONFIRMED)
                        .reasonCode(VerificationReasonCode.CHALLENGE_FAILED.name())
                        .reason("Active challenge response failed or timed out.")
                        .build();
            }
        }

        // Non-fatal confidence threshold failure (< 80%) -> INCONCLUSIVE
        return Decision.builder()
                .verdict(VerificationVerdict.INCONCLUSIVE)
                .reasonCode(VerificationReasonCode.LOW_CONFIDENCE.name())
                .reason("Verification evidence did not reach the required confidence threshold.")
                .build();
    }
}
