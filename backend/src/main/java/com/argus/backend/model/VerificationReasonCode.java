package com.argus.backend.model;

/**
 * Controlled, machine-readable failure/decision reason codes based on actual backend verification paths:
 * <ul>
 *   <li>SPOOF_DETECTED: Presentation attack detected by ONNX PAD (photo, screen, mask replay).</li>
 *   <li>MULTIPLE_FACES: Multiple distinct faces detected in frame (policy requires single person).</li>
 *   <li>CHALLENGE_FAILED: Active interactive liveness challenge failed or timed out.</li>
 *   <li>LOW_CONFIDENCE: Evidence did not satisfy the authoritative confidence threshold (&lt; 80%).</li>
 *   <li>INCOMPLETE: Workflow is initiated or in progress and awaiting completion.</li>
 *   <li>TECHNICAL_ERROR: Processing or internal system error during verification.</li>
 * </ul>
 */
public enum VerificationReasonCode {
    SPOOF_DETECTED,
    MULTIPLE_FACES,
    CHALLENGE_FAILED,
    LOW_CONFIDENCE,
    INCOMPLETE,
    TECHNICAL_ERROR
}
