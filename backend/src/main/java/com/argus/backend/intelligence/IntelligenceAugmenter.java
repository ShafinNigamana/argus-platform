package com.argus.backend.intelligence;

import com.argus.backend.model.BehaviorInput;
import com.argus.backend.model.BehaviorResult;
import com.argus.backend.model.BlinkEvent;
import com.argus.backend.model.ChallengeInput;
import com.argus.backend.model.ChallengeResult;
import com.argus.backend.model.HeadMovement;
import com.argus.backend.dto.AiReasoningResponse;
import com.argus.backend.service.GeminiForensicService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Module 16: deterministic intelligence penalties and explainability layer.
 */
@Service
public class IntelligenceAugmenter {

    private static final Logger log = LoggerFactory.getLogger(IntelligenceAugmenter.class);

    private final ConfidenceCalibrator confidenceCalibrator;
    private final GeminiForensicService geminiForensicService;

    public IntelligenceAugmenter(ConfidenceCalibrator confidenceCalibrator, GeminiForensicService geminiForensicService) {
        this.confidenceCalibrator = confidenceCalibrator;
        this.geminiForensicService = geminiForensicService;
    }

    public EnhancedLivenessResponse enhance(Double bpm,
                                            double signalQuality,
                                            BehaviorResult behaviorResult,
                                            ChallengeResult challengeResult,
                                            BehaviorInput behaviorInput,
                                            List<ChallengeInput> challengeInputs) {
        double originalBehavior = behaviorResult == null
                ? 0.0
                : StatisticsHelper.clamp(behaviorResult.getBehaviorScore(), 0.0, 1.0);
        double originalChallenge = challengeResult == null
                ? 0.0
                : StatisticsHelper.clamp(challengeResult.getChallengeScore(), 0.0, 1.0);

        AdjustmentResult blinkAdjustment = analyzeBlink(extractBlinkTimestamps(behaviorInput));
        AdjustmentResult movementAdjustment = analyzeMovement(extractHeadDisplacements(behaviorInput));
        AdjustmentResult reactionAdjustment = analyzeReaction(challengeInputs,
                challengeResult != null && challengeResult.isValid());

        double adjustedBehaviorScore = combineBehavior(originalBehavior, blinkAdjustment, movementAdjustment);
        double adjustedChallengeScore = combineChallenge(originalChallenge, reactionAdjustment);

        // --- AI Augmentation Step (Controlled 20% influence) ---
        Map<String, Object> telemetry = new HashMap<>();
        telemetry.put("bpm", bpm);
        telemetry.put("signalQuality", signalQuality);
        telemetry.put("behaviorScore", adjustedBehaviorScore);
        telemetry.put("challengeScore", adjustedChallengeScore);
        telemetry.put("blinkCount", behaviorInput != null ? behaviorInput.getBlinkEvents().size() : 0);
        
        AiReasoningResponse aiResult = geminiForensicService.analyzeLiveness(telemetry);

        List<AdjustmentResult> adjustments = List.of(blinkAdjustment, movementAdjustment, reactionAdjustment);

        AnalysisDetails details = new AnalysisDetails();
        details.setBlinkNaturalness(blinkAdjustment.getPenaltyMultiplier());
        details.setMovementNaturalness(movementAdjustment.getPenaltyMultiplier());
        details.setReactionNaturalness(reactionAdjustment.getPenaltyMultiplier());

        List<String> penaltiesApplied = adjustments.stream()
                .map(AdjustmentResult::getDetail)
                .filter(detail -> detail != null && !detail.isBlank())
                .collect(Collectors.toList());
        details.setPenaltiesApplied(penaltiesApplied);

        ConfidenceCalibrator.WeightProfile profile = confidenceCalibrator.calculateWeights(signalQuality);
        double normalizedSignal = profile.normalizedSignalQuality();

        // 1. Calculate our system's base score (80% weight)
        double systemScore = confidenceCalibrator.calibrateFinalScore(
                normalizedSignal,
                adjustedBehaviorScore,
                adjustedChallengeScore,
                profile
        );

        // 2. Blend with AI Score (20% weight)
        double finalScore = (systemScore * 0.8) + (aiResult.getAiLivenessScore() * 0.2);
        finalScore = StatisticsHelper.clamp(finalScore, 0.0, 1.0);

        String status = confidenceCalibrator.getStatus(finalScore);

        boolean majorBotPattern = adjustments.stream().anyMatch(AdjustmentResult::isMajorBotPattern);
        boolean noMajorPenalties = adjustments.stream()
                .noneMatch(adjustment -> adjustment.getPenaltyMultiplier() < 1.0 && adjustment.getConfidence() >= 0.85);
        String confidence = confidenceCalibrator.determineConfidence(
                finalScore,
                normalizedSignal,
                majorBotPattern,
                noMajorPenalties
        );

        String failReason = status.equals("FAIL") || status.equals("UNCERTAIN")
                ? aggregateFailReason(adjustments)
                : null;

        return EnhancedLivenessResponse.builder()
                .bpm(bpm)
                .signalQuality(normalizedSignal)
                .behaviorScore(round2(adjustedBehaviorScore))
                .challengeScore(round2(adjustedChallengeScore))
                .livenessScore(round1(finalScore * 100.0))
                .status(status)
                .failReason(failReason)
                .confidence(confidence)
                .calibrationNote(profile.note())
                .analysisDetails(details)
                .recommendation(aiResult.getForensicReasoning()) // Use AI reasoning for recommendation
                .build();
    }

    AdjustmentResult analyzeBlink(List<Double> blinkTimestamps) {
        if (blinkTimestamps == null || blinkTimestamps.size() < 3) {
            log.debug("[IntelligenceLayer] Blink: SKIPPED - insufficient blinks (<3)");
            return AdjustmentResult.noPenalty();
        }

        double min = Double.POSITIVE_INFINITY;
        double max = Double.NEGATIVE_INFINITY;
        for (Double ts : blinkTimestamps) {
            if (ts == null || ts < 0.0) {
                log.debug("[IntelligenceLayer] Blink: SKIPPED - negative/invalid timestamp");
                return AdjustmentResult.noPenalty();
            }
            min = Math.min(min, ts);
            max = Math.max(max, ts);
        }

        if (max - min <= 1.0) {
            AdjustmentResult result = AdjustmentResult.of(
                    0.40,
                    "Highly unnatural blinking burst",
                    0.95,
                    "Blink timestamps clustered within one second",
                    true
            );
            log.debug("[IntelligenceLayer] Blink: PENALTY_APPLIED - burstWindow={}, multiplier={}", max - min, result.getPenaltyMultiplier());
            return result;
        }

        double[] intervals = new double[blinkTimestamps.size() - 1];
        for (int i = 1; i < blinkTimestamps.size(); i++) {
            intervals[i - 1] = blinkTimestamps.get(i) - blinkTimestamps.get(i - 1);
        }

        double cv = StatisticsHelper.coefficientOfVariation(intervals);
        AdjustmentResult result;
        if (cv < 0.10) {
            result = AdjustmentResult.of(0.40,
                    "Highly unnatural blinking pattern (metronomic timing)",
                    0.95,
                    String.format(Locale.US, "Blink CV too low (%.2f) - metronomic", cv), true);
        } else if (cv < 0.15) {
            result = AdjustmentResult.of(0.55,
                    "Unnatural blinking rhythm (too consistent)",
                    0.85,
                    String.format(Locale.US, "Blink CV too low (%.2f)", cv), true);
        } else if (cv < 0.20) {
            result = AdjustmentResult.of(0.75,
                    "Slightly rigid blinking pattern",
                    0.70,
                    String.format(Locale.US, "Blink CV borderline low (%.2f)", cv));
        } else if (cv < 0.25) {
            result = AdjustmentResult.of(0.90,
                    "Mildly consistent blinking",
                    0.50,
                    String.format(Locale.US, "Blink CV mildly low (%.2f)", cv));
        } else {
            result = AdjustmentResult.noPenalty();
        }

        if (result.getPenaltyMultiplier() < 1.0) {
            log.debug("[IntelligenceLayer] Blink: PENALTY_APPLIED - CV={}, multiplier={}", round3(cv), result.getPenaltyMultiplier());
        }
        return result;
    }

    AdjustmentResult analyzeMovement(List<Double> headDisplacements) {
        if (headDisplacements == null || headDisplacements.size() < 10) {
            log.debug("[IntelligenceLayer] Movement: SKIPPED - insufficient frames (<10)");
            return AdjustmentResult.noPenalty();
        }

        double min = Double.POSITIVE_INFINITY;
        double max = Double.NEGATIVE_INFINITY;
        boolean allIdentical = true;
        boolean allNearZero = true;
        Double prev = null;

        for (Double value : headDisplacements) {
            double v = value == null ? 0.0 : value;
            min = Math.min(min, v);
            max = Math.max(max, v);
            if (Math.abs(v) >= 0.001) {
                allNearZero = false;
            }
            if (prev != null && Double.compare(prev, v) != 0) {
                allIdentical = false;
            }
            prev = v;
        }

        if (allIdentical || allNearZero) {
            return AdjustmentResult.of(
                    0.35,
                    "No head movement detected (possible static image)",
                    0.95,
                    "Movement values static/near-zero",
                    true
            );
        }

        double range = max - min;
        if (range < 0.01) {
            return AdjustmentResult.of(
                    0.70,
                    "Minimal head movement",
                    0.70,
                    String.format(Locale.US, "Movement range too low (%.4f)", range)
            );
        }

        double[] raw = StatisticsHelper.toPrimitive(headDisplacements);
        double[] acceleration = StatisticsHelper.secondDerivative(raw);
        double jerkVariance = StatisticsHelper.variance(acceleration);
        double autocorrPeak = StatisticsHelper.autocorrelationPeakRatio(raw);

        AdjustmentResult result;
        if (jerkVariance < 0.003 && autocorrPeak > 0.98) {
            result = AdjustmentResult.of(
                    0.35,
                    "Replay attack detected (perfectly smooth + repetitive)",
                    0.95,
                    String.format(Locale.US, "Movement jerk variance too low (%.3f) and autocorr high (%.2f)", jerkVariance, autocorrPeak),
                    true
            );
        } else if (jerkVariance < 0.003) {
            result = AdjustmentResult.of(
                    0.50,
                    "Movement too smooth (possible virtual camera or replay)",
                    0.85,
                    String.format(Locale.US, "Movement jerk variance too low (%.3f) - replay suspected", jerkVariance),
                    true
            );
        } else if (autocorrPeak > 0.98) {
            result = AdjustmentResult.of(
                    0.80,
                    "Repetitive head movement pattern",
                    0.60,
                    String.format(Locale.US, "Movement autocorrelation very high (%.2f)", autocorrPeak),
                    false
            );
        } else if (jerkVariance < 0.008) {
            result = AdjustmentResult.of(
                    0.80,
                    "Suspiciously smooth movement",
                    0.60,
                    String.format(Locale.US, "Movement jerk variance low (%.3f)", jerkVariance)
            );
        } else {
            result = AdjustmentResult.noPenalty();
        }

        if (result.getPenaltyMultiplier() < 1.0) {
            log.debug("[IntelligenceLayer] Movement: PENALTY_APPLIED - jerkVar={}, autocorrPeak={}, multiplier={}",
                    round3(jerkVariance), round3(autocorrPeak), result.getPenaltyMultiplier());
        }
        return result;
    }

    AdjustmentResult analyzeReaction(List<ChallengeInput> challengeInputs, boolean challengeValid) {
        if (challengeInputs == null || challengeInputs.isEmpty()) {
            log.debug("[IntelligenceLayer] Reaction: SKIPPED - no challenge inputs");
            return AdjustmentResult.noPenalty();
        }

        double minMultiplier = 1.0;
        double bestConfidence = 1.0;
        String bestReason = null;
        String bestDetail = null;
        boolean majorPattern = false;

        Map<Long, Integer> reactionFrequency = new HashMap<>();

        for (ChallengeInput input : challengeInputs) {
            long reactionMs = input.getCompletedAt() - input.getIssuedAt();
            if (reactionMs < 0) {
                bestDetail = appendDetail(bestDetail, "invalidReactionTime");
                continue;
            }

            long boundedReaction = Math.min(reactionMs, 10000);
            reactionFrequency.put(boundedReaction, reactionFrequency.getOrDefault(boundedReaction, 0) + 1);

            AdjustmentResult perChallenge = reactionPenaltyForSingle(
                    boundedReaction,
                    input.getChallengeType(),
                    challengeValid
            );

            if (perChallenge.getPenaltyMultiplier() < minMultiplier
                    || (perChallenge.getPenaltyMultiplier() == minMultiplier
                    && perChallenge.getConfidence() > bestConfidence)) {
                minMultiplier = perChallenge.getPenaltyMultiplier();
                bestConfidence = perChallenge.getConfidence();
                bestReason = perChallenge.getReason();
                bestDetail = appendDetail(bestDetail, perChallenge.getDetail());
                majorPattern = majorPattern || perChallenge.isMajorBotPattern();
            }

            if (boundedReaction == 1000 || boundedReaction == 1500 || boundedReaction == 2000) {
                minMultiplier = minMultiplier * 0.90;
                bestDetail = appendDetail(bestDetail,
                        "Round-time reaction pattern detected (" + boundedReaction + "ms)");
            }
        }

        boolean repeatedExactReaction = reactionFrequency.values().stream().anyMatch(count -> count > 1);
        if (repeatedExactReaction) {
            minMultiplier = minMultiplier * 0.80;
            bestDetail = appendDetail(bestDetail, "Identical reaction times repeated across challenges");
            majorPattern = true;
        }

        minMultiplier = StatisticsHelper.clamp(minMultiplier, 0.0, 1.0);

        if (!challengeValid) {
            if (minMultiplier > 0.50) {
                minMultiplier = 0.50;
            }
            bestReason = mergeReason(bestReason, "Challenge failed - user did not follow instruction");
            bestDetail = appendDetail(bestDetail, "Challenge marked invalid by validation engine");
            bestConfidence = Math.max(bestConfidence, 0.90);
        }

        if (bestReason == null && minMultiplier >= 1.0 && bestDetail == null) {
            return AdjustmentResult.noPenalty();
        }

        if (bestReason == null && minMultiplier < 1.0) {
            bestReason = "Reaction timing pattern is suspicious";
            bestConfidence = Math.max(bestConfidence, 0.60);
        }

        log.debug("[IntelligenceLayer] Reaction: PENALTY_APPLIED - multiplier={}, detail={}",
                round3(minMultiplier), bestDetail);

        return AdjustmentResult.of(minMultiplier, bestReason, bestConfidence,
                bestDetail, majorPattern || minMultiplier <= 0.60);
    }

    private AdjustmentResult reactionPenaltyForSingle(long reactionMs, String challengeType, boolean challengeValid) {
        String normalizedType = challengeType == null ? "DEFAULT" : challengeType.trim().toUpperCase(Locale.ROOT);
        long expectedMin;
        long expectedMax;

        switch (normalizedType) {
            case "BLINK" -> {
                expectedMin = 300;
                expectedMax = 2000;
            }
            case "TURN_HEAD_LEFT", "TURN_HEAD_RIGHT", "HEAD_TURN" -> {
                expectedMin = 400;
                expectedMax = 3000;
            }
            case "SMILE" -> {
                expectedMin = 350;
                expectedMax = 2500;
            }
            case "NOD" -> {
                expectedMin = 400;
                expectedMax = 2500;
            }
            case "MOUTH_OPEN" -> {
                expectedMin = 350;
                expectedMax = 2000;
            }
            default -> {
                expectedMin = 250;
                expectedMax = 3000;
            }
        }

        if (reactionMs < 50) {
            // Relaxed from 150ms to 50ms to account for frame processing delays and pre-completed actions
            return AdjustmentResult.of(0.40,
                    "Impossible reaction time (sub-50ms) - extremely fast",
                    0.80,
                    "Reaction time " + reactionMs + "ms",
                    true);
        }
        if (reactionMs < 100) {
            return AdjustmentResult.of(0.70,
                    "Superhuman reaction time - likely automated",
                    0.70,
                    "Reaction time " + reactionMs + "ms",
                    true);
        }
        if (reactionMs < 150) {
            return AdjustmentResult.of(0.90,
                    "Suspiciously fast reaction - borderline human",
                    0.50,
                    "Reaction time " + reactionMs + "ms",
                    false);
        }
        if (reactionMs > 6000) {
            // Relaxed from 4000ms to 6000ms to allow more time for humans to react
            return AdjustmentResult.of(0.70,
                    "Extremely delayed response - possible lookup/cheating",
                    0.70,
                    "Reaction time " + reactionMs + "ms",
                    false);
        }
        if (reactionMs > 4500) {
            return AdjustmentResult.of(0.85,
                    "Unusually slow response",
                    0.50,
                    "Reaction time " + reactionMs + "ms",
                    false);
        }

        if (!challengeValid) {
            return AdjustmentResult.of(0.50,
                    "Challenge failed - user did not follow instruction",
                    0.90,
                    "Challenge was invalid");
        }

        // Remove the harsh out-of-bounds penalty for hackathon demo
        if (reactionMs < expectedMin || reactionMs > expectedMax) {
             log.debug("Reaction timing outside expected range for {}, but penalty disabled for demo: {}ms", normalizedType, reactionMs);
        }

        return AdjustmentResult.noPenalty();
    }

    double combineBehavior(double originalBehaviorScore,
                           AdjustmentResult blink,
                           AdjustmentResult movement) {
        double score = originalBehaviorScore * blink.getPenaltyMultiplier() * movement.getPenaltyMultiplier();
        return StatisticsHelper.clamp(score, 0.10, 1.0);
    }

    double combineChallenge(double originalChallengeScore, AdjustmentResult reaction) {
        return StatisticsHelper.clamp(originalChallengeScore * reaction.getPenaltyMultiplier(), 0.0, 1.0);
    }

    String aggregateFailReason(List<AdjustmentResult> adjustments) {
        List<AdjustmentResult> penalized = adjustments.stream()
                .filter(adjustment -> adjustment.getReason() != null)
                .sorted(Comparator.comparingDouble(AdjustmentResult::getConfidence).reversed())
                .limit(3)
                .toList();

        if (penalized.isEmpty()) {
            return null;
        }

        return penalized.stream().map(AdjustmentResult::getReason).collect(Collectors.joining("; "));
    }

    String buildRecommendation(List<AdjustmentResult> adjustments, String status) {
        if ("PASS".equals(status)) {
            return null;
        }

        List<String> reasons = adjustments.stream()
                .map(AdjustmentResult::getReason)
                .filter(reason -> reason != null && !reason.isBlank())
                .toList();

        if (reasons.size() > 1) {
            return "Please retry in natural lighting with normal head movement";
        }

        if (reasons.isEmpty()) {
            return "Please retry the verification flow";
        }

        String reason = reasons.get(0).toLowerCase(Locale.ROOT);
        if (reason.contains("blink")) {
            return "Please blink naturally without forcing a pattern";
        }
        if (reason.contains("smooth") || reason.contains("movement") || reason.contains("static")) {
            return "Please move your head slightly - don't stay perfectly still";
        }
        if (reason.contains("superhuman") || reason.contains("sub-150") || reason.contains("fast")) {
            return "Please respond naturally, not instantly";
        }
        if (reason.contains("slow") || reason.contains("delayed")) {
            return "Please focus on the challenge and respond promptly";
        }

        return "Please retry in natural lighting with normal head movement";
    }

    private List<Double> extractBlinkTimestamps(BehaviorInput input) {
        if (input == null || input.getBlinkEvents() == null) {
            return null;
        }
        List<Double> values = new ArrayList<>(input.getBlinkEvents().size());
        for (BlinkEvent event : input.getBlinkEvents()) {
            if (event == null) {
                continue;
            }
            values.add(event.getTimestamp() / 1000.0);
        }
        return values;
    }

    private List<Double> extractHeadDisplacements(BehaviorInput input) {
        if (input == null || input.getHeadMovements() == null) {
            return null;
        }
        List<Double> values = new ArrayList<>(input.getHeadMovements().size());
        for (HeadMovement movement : input.getHeadMovements()) {
            if (movement == null) {
                continue;
            }
            values.add(movement.getAngle());
        }
        return values;
    }

    private String appendDetail(String existing, String next) {
        if (next == null || next.isBlank()) {
            return existing;
        }
        if (existing == null || existing.isBlank()) {
            return next;
        }
        return existing + "; " + next;
    }

    private String mergeReason(String reason, String toAdd) {
        if (reason == null || reason.isBlank()) {
            return toAdd;
        }
        if (reason.contains(toAdd)) {
            return reason;
        }
        return reason + "; " + toAdd;
    }

    private double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private double round3(double value) {
        return Math.round(value * 1000.0) / 1000.0;
    }
}
