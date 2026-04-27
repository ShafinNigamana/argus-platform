import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

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

  factory VerificationResult.fromJson(Map<String, dynamic> json,
      {String? sessionId}) {
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

class _ResultScreenState extends State<ResultScreen>
    with TickerProviderStateMixin {
  Map<String, dynamic>? _trustRecord;
  bool _loadingTrust = true;
  bool _showDetails = false;

  late AnimationController _scoreCtrl;
  late AnimationController _entryCtrl;
  late Animation<double> _scoreCurve;
  bool _historySaved = false;
  VerificationResult? _result;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_result == null) {
      final args = ModalRoute.of(context)?.settings.arguments;
      if (args is Map<String, dynamic>) {
        _result = VerificationResult.fromJson(args,
            sessionId: args['sessionId']?.toString());
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
    }
  }

  @override
  void initState() {
    super.initState();
    _scoreCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );
    _scoreCurve = CurvedAnimation(
      parent: _scoreCtrl,
      curve: Curves.easeOutCubic,
    );
    _entryCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _fetchTrustData();
      _scoreCtrl.forward();
      _entryCtrl.forward();
      HapticFeedback.heavyImpact();
    });
  }

  @override
  void dispose() {
    _scoreCtrl.dispose();
    _entryCtrl.dispose();
    super.dispose();
  }

  Future<void> _fetchTrustData() async {
    final args = ModalRoute.of(context)?.settings.arguments;
    String? sid;
    if (args is Map<String, dynamic>) {
      sid = args['sessionId']?.toString();
    } else if (args is VerificationResult) {
      sid = args.sessionId;
    }
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
    final confidence = confStr == 'HIGH' ? Confidence.high : (confStr == 'MEDIUM' ? Confidence.medium : Confidence.low);
    final confColor = getConfidenceColor(confidence);
    final confLabel = getConfidenceLabel(confidence);

    final Color statusColor;
    final String statusLabel;
    final IconData statusIcon;
    if (passed) {
      statusColor = AppTheme.success;
      statusLabel = 'VERIFIED HUMAN';
      statusIcon = Icons.check_circle_rounded;
    } else if (isUncertain) {
      statusColor = AppTheme.warning;
      statusLabel = 'NOT VERIFIED';
      statusIcon = Icons.warning_amber_rounded;
    } else {
      statusColor = AppTheme.error;
      statusLabel = 'NOT VERIFIED';
      statusIcon = Icons.cancel_rounded;
    }

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: Stack(
        children: [
          // Subtle radial glow
          Positioned(
            top: -60,
            left: 0,
            right: 0,
            child: Container(
              height: 360,
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: Alignment.topCenter,
                  radius: 0.8,
                  colors: [
                    statusColor.withValues(alpha: 0.06),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),
          SafeArea(
            child: SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              padding: const EdgeInsets.symmetric(horizontal: AppTheme.s24),
              child: Column(
                children: [
                  const SizedBox(height: AppTheme.s40),

                  // ─── Score Arc ───
                  AnimatedBuilder(
                    animation: _scoreCurve,
                    builder: (context, _) {
                      final animScore =
                          (_scoreCurve.value * score).round();
                      return SizedBox(
                        width: 180,
                        height: 180,
                        child: Stack(
                          alignment: Alignment.center,
                          children: [
                            CustomPaint(
                              size: const Size(180, 180),
                              painter: ScoreArcPainter(
                                progress:
                                    _scoreCurve.value * score / 100,
                                color: statusColor,
                                strokeWidth: 10,
                              ),
                            ),
                            Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(statusIcon,
                                    color: statusColor, size: 26),
                                const SizedBox(height: 2),
                                Text(
                                  '$animScore',
                                  style: GoogleFonts.outfit(
                                    color: statusColor,
                                    fontSize: 50,
                                    fontWeight: FontWeight.w800,
                                    height: 1.0,
                                  ),
                                ),
                                Text('LIVENESS SCORE',
                                    style: AppTheme.mono.copyWith(
                                        fontSize: 10,
                                        color: AppTheme.textMuted)),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: AppTheme.s20),

                  // ─── Status Badge ───
                  _entryWidget(0.1,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: AppTheme.s24, vertical: AppTheme.s12),
                      decoration: BoxDecoration(
                        color: statusColor.withValues(alpha: 0.1),
                        borderRadius:
                            BorderRadius.circular(AppTheme.r24),
                        border: Border.all(
                            color:
                                statusColor.withValues(alpha: 0.3)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(statusIcon,
                              color: statusColor, size: 20),
                          const SizedBox(width: 10),
                          Text(statusLabel,
                              style: AppTheme.label.copyWith(
                                  color: statusColor, fontSize: 15, letterSpacing: 1.5)),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: AppTheme.s16),

                  // ─── Confidence Visual ───
                  _entryWidget(0.15,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.shield_outlined,
                            color: confColor, size: 16),
                        const SizedBox(width: 6),
                        Text('Confidence ',
                            style: AppTheme.bodySmall),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 3),
                          decoration: BoxDecoration(
                            color: confColor.withValues(alpha: 0.12),
                            borderRadius:
                                BorderRadius.circular(AppTheme.r8),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 7, height: 7,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: confColor,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Text(confLabel,
                                  style: AppTheme.label.copyWith(
                                      color: confColor, fontSize: 12)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppTheme.s24),

                  // ─── Fail Reason (if any) ───
                  if (!passed && result.failReason != null)
                    _entryWidget(0.2,
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(AppTheme.s16),
                        decoration: BoxDecoration(
                          color: AppTheme.error.withValues(alpha: 0.06),
                          borderRadius:
                              BorderRadius.circular(AppTheme.r12),
                          border: Border.all(
                              color: AppTheme.error
                                  .withValues(alpha: 0.15)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.info_outline,
                                color: AppTheme.error, size: 20),
                            const SizedBox(width: AppTheme.s12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment:
                                    CrossAxisAlignment.start,
                                children: [
                                  Text('Reason',
                                      style: AppTheme.bodySmall
                                          .copyWith(
                                              color: AppTheme
                                                  .textMuted,
                                              fontSize: 11)),
                                  Text(result.failReason!,
                                      style: AppTheme.bodySmall
                                          .copyWith(
                                              color: AppTheme.error,
                                              fontWeight:
                                                  FontWeight.w600)),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                  if (!passed && result.failReason != null)
                    const SizedBox(height: AppTheme.s16),

                  // ─── Trust Layer ───
                  _entryWidget(0.25,
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(AppTheme.s16),
                      decoration: BoxDecoration(
                        color: AppTheme.surface.withValues(alpha: 0.4),
                        borderRadius:
                            BorderRadius.circular(AppTheme.r12),
                        border: Border.all(
                            color:
                                Colors.white.withValues(alpha: 0.04)),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.lock_outline,
                              color: passed
                                  ? AppTheme.accent
                                  : AppTheme.textMuted,
                              size: 22),
                          const SizedBox(width: AppTheme.s12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment:
                                  CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Verification secured and tamper-proof',
                                  style: AppTheme.bodySmall.copyWith(
                                      color: AppTheme.textPrimary,
                                      fontWeight: FontWeight.w500),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  'Stored in cryptographic ledger',
                                  style: AppTheme.mono.copyWith(
                                      fontSize: 11,
                                      color: AppTheme.textMuted),
                                ),
                                if (!_loadingTrust &&
                                    _trustRecord != null)
                                  Text(
                                      'Secured by Google Ledger  #${_trustRecord!['ledgerIndex']}',
                                      style: AppTheme.mono
                                          .copyWith(fontSize: 11, color: AppTheme.accent)),
                                if (_loadingTrust)
                                  Text('Verifying record...',
                                      style: AppTheme.mono
                                          .copyWith(fontSize: 11)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: AppTheme.s16),

                  // ─── Intelligence description ───
                  _entryWidget(0.28,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: AppTheme.s8),
                      child: Text(
                        'Analysis based on physiological signals, behavioral patterns, and interaction validation.',
                        style: AppTheme.bodySmall.copyWith(
                          color: AppTheme.textMuted,
                          fontStyle: FontStyle.italic,
                          fontSize: 12,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
                  const SizedBox(height: AppTheme.s20),

                  // ─── Collapsible Technical Details ───
                  _entryWidget(0.32,
                    child: GestureDetector(
                      onTap: () =>
                          setState(() => _showDetails = !_showDetails),
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(
                            horizontal: AppTheme.s16,
                            vertical: AppTheme.s12),
                        decoration: BoxDecoration(
                          color: AppTheme.surface.withValues(alpha: 0.3),
                          borderRadius: BorderRadius.circular(AppTheme.r12),
                          border: Border.all(
                              color: Colors.white.withValues(alpha: 0.04)),
                        ),
                        child: Column(
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.analytics_outlined,
                                    color: AppTheme.textMuted, size: 18),
                                const SizedBox(width: AppTheme.s8),
                                Text('Technical Details',
                                    style: AppTheme.bodySmall),
                                const Spacer(),
                                Icon(
                                  _showDetails
                                      ? Icons.keyboard_arrow_up
                                      : Icons.keyboard_arrow_down,
                                  color: AppTheme.textMuted,
                                  size: 20,
                                ),
                              ],
                            ),
                            if (_showDetails) ...[
                              const SizedBox(height: AppTheme.s12),
                              _detailRow('Heart Rate',
                                  result.bpm != null
                                      ? '${result.bpm!.round()} BPM'
                                      : 'N/A'),
                              _detailRow('Signal Quality',
                                  result.signalQuality != null
                                      ? '${(result.signalQuality! * 100).round()}%'
                                      : 'N/A'),
                              _detailRow('Behavior Score',
                                  result.behaviorScore != null
                                      ? '${(result.behaviorScore! * 100).round()}%'
                                      : 'N/A'),
                              _detailRow('Challenge Score',
                                  result.challengeScore != null
                                      ? '${(result.challengeScore! * 100).round()}%'
                                      : 'N/A'),
                            ],
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: AppTheme.s32),

                  // ─── Logo ───
                  _entryWidget(0.4,
                    child: const Hero(
                      tag: 'argus_logo',
                      child: ArgusLogo(size: 60),
                    ),
                  ),
                  const SizedBox(height: AppTheme.s24),

                  // ─── Action Buttons ───
                  _entryWidget(0.45,
                    child: SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: GestureDetector(
                        onTap: () {
                          HapticFeedback.mediumImpact();
                          Navigator.pushNamedAndRemoveUntil(
                              context, '/', (r) => false);
                        },
                        child: Container(
                          decoration: BoxDecoration(
                            borderRadius:
                                BorderRadius.circular(AppTheme.r32),
                            gradient: LinearGradient(colors: [
                              passed
                                  ? AppTheme.success
                                  : AppTheme.primary,
                              passed
                                  ? const Color(0xFF00C853)
                                  : const Color(0xFF4A3AFF),
                            ]),
                            boxShadow: [
                              BoxShadow(
                                color: (passed
                                        ? AppTheme.success
                                        : AppTheme.primary)
                                    .withValues(alpha: 0.25),
                                blurRadius: 16,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          alignment: Alignment.center,
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                  passed
                                      ? Icons.done
                                      : Icons.refresh,
                                  color: Colors.white,
                                  size: 20),
                              const SizedBox(width: 8),
                              Text(passed ? 'VERIFICATION COMPLETE' : 'TRY AGAIN',
                                  style: AppTheme.button),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: AppTheme.s32),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }


  Widget _detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: AppTheme.bodySmall),
          Text(value,
              style: AppTheme.mono.copyWith(
                  color: AppTheme.textPrimary, fontSize: 13)),
        ],
      ),
    );
  }


  Widget _entryWidget(double delay, {required Widget child}) {
    final interval = Interval(delay, (delay + 0.3).clamp(0.0, 1.0),
        curve: Curves.easeOutCubic);
    final anim =
        CurvedAnimation(parent: _entryCtrl, curve: interval);
    return AnimatedBuilder(
      animation: anim,
      builder: (context, ch) {
        return Opacity(
          opacity: anim.value,
          child: Transform.translate(
            offset: Offset(0, 14 * (1 - anim.value)),
            child: ch,
          ),
        );
      },
      child: child,
    );
  }
}
