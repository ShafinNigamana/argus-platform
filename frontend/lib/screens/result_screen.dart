import 'package:flutter/material.dart';

/// Data model that wraps the backend /result response.
class VerificationResult {
  final double livenessScore;
  final String livenessStatus;
  final String? failReason;
  final double? bpm;
  final double? signalQuality;
  final double? behaviorScore;
  final double? challengeScore;
  final double progress;

  const VerificationResult({
    required this.livenessScore,
    required this.livenessStatus,
    this.failReason,
    this.bpm,
    this.signalQuality,
    this.behaviorScore,
    this.challengeScore,
    this.progress = 100.0,
  });

  bool get passed => livenessStatus == 'PASS';

  /// Parse from backend JSON response.
  factory VerificationResult.fromJson(Map<String, dynamic> json) {
    return VerificationResult(
      livenessScore: (json['livenessScore'] as num?)?.toDouble() ?? 0.0,
      livenessStatus: json['livenessStatus']?.toString() ?? 'FAIL',
      failReason: json['failReason']?.toString(),
      bpm: (json['bpm'] as num?)?.toDouble(),
      signalQuality: (json['signalQuality'] as num?)?.toDouble(),
      behaviorScore: (json['behaviorScore'] as num?)?.toDouble(),
      challengeScore: (json['challengeScore'] as num?)?.toDouble(),
      progress: (json['progress'] as num?)?.toDouble() ?? 0.0,
    );
  }

  /// Fallback when no data available.
  static const VerificationResult empty = VerificationResult(
    livenessScore: 0,
    livenessStatus: 'FAIL',
    failReason: 'NO_DATA',
  );
}

class ResultScreen extends StatelessWidget {
  const ResultScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // Accept either a Map (from backend JSON) or a VerificationResult
    final args = ModalRoute.of(context)?.settings.arguments;
    final VerificationResult result;

    if (args is Map<String, dynamic>) {
      result = VerificationResult.fromJson(args);
    } else if (args is VerificationResult) {
      result = args;
    } else {
      result = VerificationResult.empty;
    }

    final score = result.livenessScore.round();
    final passed = result.passed;
    final isUncertain = result.livenessStatus == 'UNCERTAIN';

    // Color scheme based on status
    final Color statusColor;
    final String statusText;
    if (passed) {
      statusColor = const Color(0xFF00C853);
      statusText = 'VERIFIED — REAL HUMAN';
    } else if (isUncertain) {
      statusColor = const Color(0xFFFFAB40);
      statusText = 'UNCERTAIN — RETRY RECOMMENDED';
    } else {
      statusColor = const Color(0xFFD50000);
      statusText = 'VERIFICATION FAILED';
    }

    return Scaffold(
      backgroundColor: const Color(0xFF121212),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Column(
            children: [
              const Spacer(),
              // Score circle
              Container(
                width: 160,
                height: 160,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: statusColor,
                    width: 4,
                  ),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      '$score',
                      style: TextStyle(
                        color: statusColor,
                        fontSize: 56,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      'out of 100',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.5),
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              // Status badge
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  statusText,
                  style: TextStyle(
                    color: statusColor,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1,
                  ),
                ),
              ),
              const SizedBox(height: 40),
              // Detail cards
              _DetailRow(
                  label: 'Liveness Score', value: '$score / 100'),
              const SizedBox(height: 12),
              _DetailRow(
                  label: 'Heart Rate (BPM)',
                  value: result.bpm != null
                      ? '${result.bpm!.round()} BPM'
                      : 'N/A'),
              const SizedBox(height: 12),
              _DetailRow(
                  label: 'Signal Quality',
                  value: result.signalQuality != null
                      ? '${(result.signalQuality! * 100).round()}%'
                      : 'N/A'),
              const SizedBox(height: 12),
              _DetailRow(
                  label: 'Behavior Score',
                  value: result.behaviorScore != null
                      ? '${(result.behaviorScore! * 100).round()}%'
                      : 'N/A'),
              const SizedBox(height: 12),
              _DetailRow(
                  label: 'Challenge Score',
                  value: result.challengeScore != null
                      ? '${(result.challengeScore! * 100).round()}%'
                      : 'N/A'),
              // Show fail reason only when FAIL
              if (!passed && result.failReason != null) ...[
                const SizedBox(height: 12),
                _DetailRow(
                    label: 'Fail Reason',
                    value: result.failReason!,
                    valueColor: const Color(0xFFFF5252)),
              ],
              const Spacer(),
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: () => Navigator.pushNamedAndRemoveUntil(
                    context,
                    '/',
                    (route) => false,
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF7C4DFF),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(28),
                    ),
                    textStyle: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  child: const Text('DONE'),
                ),
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;
  const _DetailRow({required this.label, required this.value, this.valueColor});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.6),
              fontSize: 15,
            ),
          ),
          Flexible(
            child: Text(
              value,
              style: TextStyle(
                color: valueColor ?? Colors.white,
                fontSize: 15,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.end,
            ),
          ),
        ],
      ),
    );
  }
}
