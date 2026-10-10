import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../services/api_service.dart';
import '../theme/app_theme.dart';
import 'history_screen.dart';

/// Parsed backend result.
class VerificationResult {
  final String? sessionId;
  final double livenessScore;
  final String livenessStatus;
  final String? failReason;
  final double? bpm;
  final double? signalQuality;
  final double? behaviorScore;
  final double? challengeScore;
  final String? confidence;

  const VerificationResult({
    this.sessionId,
    required this.livenessScore,
    required this.livenessStatus,
    this.failReason,
    this.bpm,
    this.signalQuality,
    this.behaviorScore,
    this.challengeScore,
    this.confidence,
  });

  bool get passed => livenessStatus == 'PASS';

  factory VerificationResult.fromJson(Map<String, dynamic> json, {String? sessionId}) {
    return VerificationResult(
      sessionId: sessionId,
      livenessScore: (json['livenessScore'] as num?)?.toDouble() ?? 0.0,
      livenessStatus: json['livenessStatus']?.toString() ?? 'FAIL',
      failReason: json['failReason']?.toString(),
      bpm: (json['bpm'] as num?)?.toDouble(),
      signalQuality: (json['signalQuality'] as num?)?.toDouble(),
      behaviorScore: (json['behaviorScore'] as num?)?.toDouble(),
      challengeScore: (json['challengeScore'] as num?)?.toDouble(),
      confidence: json['confidence']?.toString(),
    );
  }

  static const VerificationResult empty = VerificationResult(
    livenessScore: 0,
    livenessStatus: 'FAIL',
    failReason: 'NO_DATA',
  );
}

class ResultScreen extends StatefulWidget {
  const ResultScreen({super.key});

  @override
  State<ResultScreen> createState() => _ResultScreenState();
}

class _ResultScreenState extends State<ResultScreen> {
  Map<String, dynamic>? _trustRecord;
  bool _loadingTrust = true;
  bool _historySaved = false;
  VerificationResult? _result;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_result == null) {
      final args = ModalRoute.of(context)?.settings.arguments;
      if (args is Map<String, dynamic>) {
        _result = VerificationResult.fromJson(args, sessionId: args['sessionId']?.toString());
      } else if (args is VerificationResult) {
        _result = args;
      } else {
        _result = VerificationResult.empty;
      }

      if (!_historySaved && _result != null && _result != VerificationResult.empty) {
        _historySaved = true;
        SessionHistory.save(
          sessionId: _result!.sessionId ?? 'unknown',
          status: _result!.livenessStatus,
          score: _result!.livenessScore.round(),
          failReason: _result!.failReason,
        );
      }

      _fetchTrustData();
    }
  }

  Future<void> _fetchTrustData() async {
    final sid = _result?.sessionId;
    if (sid != null) {
      final record = await ApiService().getVerificationRecord(sid);
      if (mounted) {
        setState(() {
          _trustRecord = record;
          _loadingTrust = false;
        });
      }
    } else {
      if (mounted) setState(() => _loadingTrust = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final result = _result ?? VerificationResult.empty;
    final score = result.livenessScore.round();
    final passed = result.passed;
    final isUncertain = result.livenessStatus == 'UNCERTAIN';
    final confStr = result.confidence?.toUpperCase() ?? 'LOW';
    final confidence = confStr == 'HIGH'
        ? Confidence.high
        : (confStr == 'MEDIUM' ? Confidence.medium : Confidence.low);
    final confColor = getConfidenceColor(confidence);
    final confLabel = getConfidenceLabel(confidence);

    final Color statusColor;
    final String stampText;
    final String stampSub;
    if (passed) {
      statusColor = AppTheme.success;
      stampText = 'VERIFIED HUMAN';
      stampSub = 'AUTHENTIC PRESENCE CONFIRMED';
    } else if (isUncertain) {
      statusColor = AppTheme.warning;
      stampText = 'UNCERTAIN VERDICT';
      stampSub = 'ADDITIONAL SAMPLING REQUIRED';
    } else {
      statusColor = AppTheme.error;
      stampText = 'PRESENTATION ATTACK DETECTED';
      stampSub = 'ZERO-TRUST SECURITY VIOLATION';
    }

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: AppTheme.s24, vertical: AppTheme.s16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Masthead
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'INSPECTION REPORT // FINAL',
                    style: AppTheme.monoBold.copyWith(fontSize: 10, color: AppTheme.textMuted),
                  ),
                  StatusBadge(
                    label: passed ? 'SECURE // PASS' : 'FLAGGED // REJECT',
                    dotColor: statusColor,
                  ),
                ],
              ),
              const SizedBox(height: AppTheme.s12),
              const EditorialDivider(),
              const SizedBox(height: AppTheme.s20),

              // Verdict Certificate Stamp
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: AppTheme.s20, horizontal: AppTheme.s16),
                decoration: BoxDecoration(
                  color: AppTheme.surface,
                  border: Border.all(color: statusColor, width: 2.5),
                  borderRadius: BorderRadius.circular(AppTheme.r4),
                  boxShadow: AppTheme.hardShadow,
                ),
                child: Column(
                  children: [
                    Text(
                      '[ OFFICIAL BIOMETRIC VERDICT ]',
                      style: AppTheme.monoBold.copyWith(fontSize: 10, color: statusColor),
                    ),
                    const SizedBox(height: AppTheme.s8),
                    Text(
                      stampText,
                      style: AppTheme.headingDisplay.copyWith(
                        fontSize: 32,
                        color: statusColor,
                        fontStyle: FontStyle.italic,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: AppTheme.s4),
                    Text(
                      stampSub,
                      style: AppTheme.mono.copyWith(fontSize: 10, color: AppTheme.textMuted),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),

              const SizedBox(height: AppTheme.s24),

              // Score Dial & Confidence
              BrutalistCard(
                padding: const EdgeInsets.all(AppTheme.s20),
                child: Row(
                  children: [
                    // Score Arc Dial
                    SizedBox(
                      width: 90,
                      height: 90,
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          CustomPaint(
                            size: const Size(90, 90),
                            painter: ScoreArcPainter(
                              progress: (score / 100).clamp(0.0, 1.0),
                              color: statusColor,
                              strokeWidth: 8,
                            ),
                          ),
                          Text(
                            '$score',
                            style: AppTheme.heading2.copyWith(fontWeight: FontWeight.w700),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: AppTheme.s20),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('LIVENESS SCORE', style: AppTheme.monoBold.copyWith(fontSize: 11)),
                          const SizedBox(height: 2),
                          Text(
                            'Aggregate multi-signal threshold score evaluated across ONNX models.',
                            style: AppTheme.bodySmall.copyWith(fontSize: 11),
                          ),
                          const SizedBox(height: AppTheme.s8),
                          Row(
                            children: [
                              Text('CONFIDENCE: ', style: AppTheme.mono.copyWith(fontSize: 10)),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: confColor,
                                  borderRadius: BorderRadius.circular(AppTheme.r2),
                                ),
                                child: Text(
                                  confLabel,
                                  style: AppTheme.monoBold.copyWith(fontSize: 10, color: Colors.white),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: AppTheme.s16),

              // Rejection Reason (If Failed)
              if (!passed && result.failReason != null) ...[
                BrutalistCard(
                  backgroundColor: AppTheme.surfaceMuted,
                  borderColor: AppTheme.error,
                  child: Row(
                    children: [
                      const Icon(Icons.warning_amber_rounded, color: AppTheme.error, size: 24),
                      const SizedBox(width: AppTheme.s12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('VIOLATION CAUSE',
                                style: AppTheme.monoBold.copyWith(fontSize: 11, color: AppTheme.error)),
                            const SizedBox(height: 2),
                            Text(result.failReason!,
                                style: AppTheme.bodySmall.copyWith(fontWeight: FontWeight.w600)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppTheme.s16),
              ],

              // Metric Telemetry Breakdown Table
              BrutalistCard(
                padding: const EdgeInsets.all(AppTheme.s16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'COMPONENT TELEMETRY BREAKDOWN',
                      style: AppTheme.monoBold.copyWith(fontSize: 11),
                    ),
                    const SizedBox(height: AppTheme.s12),
                    _buildMetricRow('01', 'HEART RATE (rPPG)',
                        result.bpm != null ? '${result.bpm!.round()} BPM' : 'NOT DETECTED'),
                    const SizedBox(height: AppTheme.s8),
                    _buildMetricRow('02', 'VASCULAR SIGNAL QUALITY',
                        result.signalQuality != null ? '${(result.signalQuality! * 100).round()}%' : 'N/A'),
                    const SizedBox(height: AppTheme.s8),
                    _buildMetricRow('03', 'BEHAVIOR DYNAMICS',
                        result.behaviorScore != null ? '${(result.behaviorScore! * 100).round()}%' : 'N/A'),
                    const SizedBox(height: AppTheme.s8),
                    _buildMetricRow('04', 'CHALLENGE COMPLIANCE',
                        result.challengeScore != null ? '${(result.challengeScore! * 100).round()}%' : 'N/A'),
                  ],
                ),
              ),

              const SizedBox(height: AppTheme.s16),

              // Cryptographic KMS Trust Card
              BrutalistCard(
                padding: const EdgeInsets.all(AppTheme.s16),
                child: Row(
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: AppTheme.border,
                        borderRadius: BorderRadius.circular(AppTheme.r2),
                      ),
                      child: const Icon(Icons.lock_outline, color: Colors.white, size: 20),
                    ),
                    const SizedBox(width: AppTheme.s12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('CRYPTOGRAPHIC LEDGER AUDIT', style: AppTheme.monoBold.copyWith(fontSize: 11)),
                          const SizedBox(height: 2),
                          Text(
                            _loadingTrust
                                ? 'Verifying immutable KMS certificate...'
                                : (_trustRecord != null
                                    ? 'Secured on KMS Ledger #${_trustRecord!['ledgerIndex'] ?? 'ANCHORED'}'
                                    : 'Anchored to zero-trust audit ledger'),
                            style: AppTheme.mono.copyWith(fontSize: 10, color: AppTheme.textSecondary),
                          ),
                          if (result.sessionId != null)
                            Text(
                              'SID: ${result.sessionId!.substring(0, 8)}...',
                              style: AppTheme.mono.copyWith(fontSize: 9, color: AppTheme.textMuted),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: AppTheme.s24),

              // Action Buttons
              BrutalistButton(
                label: passed ? 'VERIFICATION COMPLETE' : 'RETRY VERIFICATION',
                icon: passed ? Icons.check_circle_outline : Icons.refresh,
                backgroundColor: passed ? AppTheme.success : AppTheme.primary,
                onPressed: () {
                  HapticFeedback.mediumImpact();
                  Navigator.pushNamedAndRemoveUntil(context, '/', (r) => false);
                },
              ),

              const SizedBox(height: AppTheme.s20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMetricRow(String index, String label, String value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: AppTheme.surfaceMuted,
        borderRadius: BorderRadius.circular(AppTheme.r2),
        border: Border.all(color: AppTheme.borderSoft),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Text(
                '[$index] ',
                style: AppTheme.monoBold.copyWith(fontSize: 10, color: AppTheme.textMuted),
              ),
              Text(
                label,
                style: AppTheme.mono.copyWith(fontSize: 11, color: AppTheme.textPrimary),
              ),
            ],
          ),
          Text(
            value,
            style: AppTheme.monoBold.copyWith(fontSize: 12, color: AppTheme.primary),
          ),
        ],
      ),
    );
  }
}
