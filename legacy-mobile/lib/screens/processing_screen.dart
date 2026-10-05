import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../services/api_service.dart';
import '../theme/app_theme.dart';

class ProcessingScreen extends StatefulWidget {
  const ProcessingScreen({super.key});

  @override
  State<ProcessingScreen> createState() => _ProcessingScreenState();
}

class _ProcessingScreenState extends State<ProcessingScreen>
    with TickerProviderStateMixin {
  // Animations
  late AnimationController _orbCtrl;
  late AnimationController _entryCtrl;

  final _steps = [
    ('Processing heartbeat signal', Icons.favorite),
    ('Evaluating behavior patterns', Icons.psychology),
    ('Verifying interaction authenticity', Icons.verified_user_outlined),
    ('Applying AI confidence model', Icons.auto_awesome),
    ('Securing verification record', Icons.lock_outline),
  ];
  int _currentStep = 0;

  // Polling
  final ApiService _apiService = ApiService();
  Timer? _pollTimer;
  int _pollCount = 0;
  static const int _maxPollCount = 10;
  String? _errorMessage;
  bool _navigated = false;
  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    _orbCtrl = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    )..repeat();
    _entryCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    )..forward();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initialized) {
      _initialized = true;
      _startPolling();
    }
  }

  void _startPolling() {
    final sessionId = ModalRoute.of(context)?.settings.arguments as String?;
    if (sessionId == null) {
      setState(() => _errorMessage = 'No session ID — cannot fetch result');
      return;
    }

    _apiService.setSessionId(sessionId);
    _animateSteps();

    _pollTimer = Timer.periodic(const Duration(milliseconds: 1500), (_) {
      _pollResult();
    });
    _pollResult();
  }

  Future<void> _animateSteps() async {
    for (var i = 0; i < _steps.length; i++) {
      await Future.delayed(const Duration(milliseconds: 1200));
      if (!mounted) return;
      HapticFeedback.selectionClick();
      setState(() => _currentStep = i);
    }
  }

  Future<void> _pollResult() async {
    if (_navigated) return;
    _pollCount++;
    final result = await _apiService.getResult();
    if (!mounted || _navigated) return;

    if (result == null) {
      if (_pollCount >= _maxPollCount) {
        setState(() => _errorMessage = 'Connection lost. Please try again.');
      }
      return;
    }

    if (result.containsKey('error')) {
      final error = result['error'] as String;
      if (error == 'SESSION_EXPIRED') {
        setState(() => _errorMessage = 'Session expired. Please restart.');
      } else if (error == 'NETWORK_ERROR' && _pollCount >= _maxPollCount) {
        setState(() => _errorMessage = 'Connection lost. Check your network.');
      }
      return;
    }

    final status = result['status']?.toString();
    if (status == 'READY') {
      _navigated = true;
      _pollTimer?.cancel();
      HapticFeedback.heavyImpact();

      final sessionId = ModalRoute.of(context)?.settings.arguments as String?;
      result['sessionId'] = sessionId;
      Navigator.pushReplacementNamed(context, '/result', arguments: result);
    } else if (status == 'PROCESSING' && _pollCount >= _maxPollCount) {
      setState(() => _errorMessage = 'Processing taking too long. Try again.');
    }
  }

  void _retry() {
    setState(() { _errorMessage = null; _pollCount = 0; });
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(milliseconds: 1500), (_) {
      _pollResult();
    });
    _pollResult();
  }

  @override
  void dispose() {
    _orbCtrl.dispose();
    _entryCtrl.dispose();
    _pollTimer?.cancel();
    _apiService.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: Stack(
        children: [
          // Background orb
          AnimatedBuilder(
            animation: _orbCtrl,
            builder: (context, _) {
              return CustomPaint(
                size: MediaQuery.of(context).size,
                painter: _OrbPainter(_orbCtrl.value),
              );
            },
          ),
          SafeArea(
            child: Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppTheme.s32),
                child: _errorMessage != null
                    ? _buildError()
                    : _buildProcessing(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProcessing() {
    return FadeTransition(
      opacity: _entryCtrl,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Animated fingerprint ring
          SizedBox(
            width: 100,
            height: 100,
            child: AnimatedBuilder(
              animation: _orbCtrl,
              builder: (context, _) {
                return CustomPaint(
                  painter: _ScanRingPainter(_orbCtrl.value),
                  child: const Center(
                    child: Icon(Icons.fingerprint,
                        size: 40, color: AppTheme.primary),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: AppTheme.s40),
          Text('Verifying authenticity...',
              style: AppTheme.heading2, textAlign: TextAlign.center),
          const SizedBox(height: AppTheme.s8),
          Text('Analyzing physiological and behavioral signals',
              style: AppTheme.bodySmall.copyWith(color: AppTheme.textMuted),
              textAlign: TextAlign.center),
          const SizedBox(height: AppTheme.s32),

          // Steps
          ...List.generate(_steps.length, (i) {
            final done = i < _currentStep;
            final active = i == _currentStep;
            return AnimatedContainer(
              duration: const Duration(milliseconds: 400),
              curve: Curves.easeOut,
              margin: const EdgeInsets.symmetric(vertical: 4),
              padding: const EdgeInsets.symmetric(
                  horizontal: AppTheme.s16, vertical: AppTheme.s12),
              decoration: BoxDecoration(
                color: active
                    ? AppTheme.primary.withValues(alpha: 0.08)
                    : Colors.transparent,
                borderRadius: BorderRadius.circular(AppTheme.r12),
                border: Border.all(
                  color: active
                      ? AppTheme.primary.withValues(alpha: 0.2)
                      : Colors.transparent,
                ),
              ),
              child: Row(
                children: [
                  AnimatedSwitcher(
                    duration: const Duration(milliseconds: 300),
                    child: Icon(
                      done ? Icons.check_circle_rounded : _steps[i].$2,
                      key: ValueKey(done),
                      color: done
                          ? AppTheme.success
                          : active
                              ? AppTheme.primary
                              : AppTheme.textMuted,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: AppTheme.s12),
                  Text(
                    _steps[i].$1,
                    style: AppTheme.bodySmall.copyWith(
                      color: active
                          ? AppTheme.textPrimary
                          : done
                              ? AppTheme.textSecondary
                              : AppTheme.textMuted,
                      fontWeight: active ? FontWeight.w600 : FontWeight.w400,
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildError() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 80, height: 80,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: AppTheme.error.withValues(alpha: 0.1),
          ),
          child: const Icon(Icons.wifi_off_rounded, size: 36, color: AppTheme.error),
        ),
        const SizedBox(height: AppTheme.s24),
        Text('Something went wrong', style: AppTheme.heading2),
        const SizedBox(height: AppTheme.s12),
        Text(_errorMessage!, style: AppTheme.body, textAlign: TextAlign.center),
        const SizedBox(height: AppTheme.s32),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _ActionButton(label: 'RETRY', onTap: _retry, filled: true),
            const SizedBox(width: AppTheme.s16),
            _ActionButton(
              label: 'GO HOME',
              onTap: () => Navigator.pushNamedAndRemoveUntil(
                  context, '/', (r) => false),
              filled: false,
            ),
          ],
        ),
      ],
    );
  }
}

class _ActionButton extends StatelessWidget {
  final String label;
  final VoidCallback onTap;
  final bool filled;
  const _ActionButton({required this.label, required this.onTap, required this.filled});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () { HapticFeedback.lightImpact(); onTap(); },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        decoration: BoxDecoration(
          color: filled ? AppTheme.primary : Colors.transparent,
          borderRadius: BorderRadius.circular(AppTheme.r24),
          border: filled ? null : Border.all(color: AppTheme.textMuted),
        ),
        child: Text(label, style: AppTheme.label.copyWith(
          color: filled ? Colors.white : AppTheme.textSecondary,
          fontSize: 13,
        )),
      ),
    );
  }
}

// Scanning ring
class _ScanRingPainter extends CustomPainter {
  final double t;
  _ScanRingPainter(this.t);

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final r = size.shortestSide / 2 - 4;

    // Track
    canvas.drawCircle(center, r, Paint()
      ..color = AppTheme.primary.withValues(alpha: 0.1)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3);

    // Sweep arc
    final sweep = pi * 0.8;
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: r),
      t * 2 * pi,
      sweep,
      false,
      Paint()
        ..color = AppTheme.primary
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3
        ..strokeCap = StrokeCap.round,
    );
  }

  @override
  bool shouldRepaint(_ScanRingPainter old) => true;
}

class _OrbPainter extends CustomPainter {
  final double t;
  _OrbPainter(this.t);

  @override
  void paint(Canvas canvas, Size size) {
    final p = Offset(
      size.width * 0.5 + size.width * 0.2 * cos(t * 2 * pi),
      size.height * 0.4 + size.height * 0.1 * sin(t * 2 * pi),
    );
    canvas.drawCircle(p, size.width * 0.4, Paint()
      ..color = AppTheme.primary.withValues(alpha: 0.03)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 80));
  }

  @override
  bool shouldRepaint(_OrbPainter old) => true;
}
