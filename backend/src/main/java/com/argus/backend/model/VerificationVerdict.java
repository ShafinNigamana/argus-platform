package com.argus.backend.model;

/**
 * Authoritative semantic decision/verdict representation per Stage 3:
 * <ul>
 *   <li>PRESENCE_CONFIRMED: Completed after passing all verification requirements (>= 80% confidence, no fatal violation).</li>
 *   <li>PRESENCE_NOT_CONFIRMED: Failed due to a fatal security condition (spoof, multiple faces, challenge failure).</li>
 *   <li>INCONCLUSIVE: Failed without a fatal violation, but evidence did not reach confidence threshold.</li>
 *   <li>INCOMPLETE: Workflow is initiated or in progress and has not reached a final decision.</li>
 * </ul>
 */
public enum VerificationVerdict {
    PRESENCE_CONFIRMED,
    PRESENCE_NOT_CONFIRMED,
    INCONCLUSIVE,
    INCOMPLETE
}
