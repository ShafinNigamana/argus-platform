import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../services/api_service.dart';
import '../theme/app_theme.dart';

class ProcessingScreen extends StatefulWidget {
  const ProcessingScreen({super.key});

  @override
  State<ProcessingScreen> createState() => _ProcessingScreenState();
}

class _ProcessingScreenState extends State<ProcessingScreen> {
  final _steps = [
    ('Hemodynamic rPPG pulse decomposition', Icons.favorite_border),
    ('Behavioral dynamics & micro-saccade scoring', Icons.psychology_outlined),
    ('Challenge-response prompt validation', Icons.verified_user_outlined),
    ('ONNX zero-trust multi-signal inference', Icons.auto_awesome_outlined),
    ('KMS cryptographic anchor generation', Icons.lock_outline),
  ];
  int _currentStep = 0;

  // Polling
  final ApiService _apiService = ApiService();
  Timer? _pollTimer;
  int _pollCount = 0;
  static const int _maxPollCount = 12;
  String? _errorMessage;
  bool _navigated = false;
  bool _initialized = false;

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
      setState(() => _errorMessage = 'No session ID — cannot fetch verification result');
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
      await Future.delayed(const Duration(milliseconds: 1100));
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
        setState(() => _errorMessage = 'Connection lost with backend. Please retry.');
      }
      return;
    }

    if (result.containsKey('error')) {
      final error = result['error'] as String;
      if (error == 'SESSION_EXPIRED') {
        setState(() => _errorMessage = 'Verification session expired. Please restart.');
      } else if (error == 'UNAUTHORIZED') {
        setState(() => _errorMessage = 'Authentication token expired. Please re-authenticate.');
      } else if (_pollCount >= _maxPollCount) {
        setState(() => _errorMessage = 'Evaluation timed out. Please retry.');
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
      setState(() => _errorMessage = 'Verification taking longer than anticipated. Please retry.');
    }
  }

  void _retry() {
    setState(() {
      _errorMessage = null;
      _pollCount = 0;
      _currentStep = 0;
    });
    _pollTimer?.cancel();
    _startPolling();
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _apiService.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppTheme.s24, vertical: AppTheme.s20),
          child: _errorMessage != null ? _buildError() : _buildProcessing(),
        ),
      ),
    );
  }

  Widget _buildProcessing() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Editorial Masthead
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'INSPECTION PIPELINE // ACTIVE',
              style: AppTheme.monoBold.copyWith(fontSize: 10, color: AppTheme.textMuted),
            ),
            StatusBadge(
              label: 'STEP ${_currentStep + 1}/${_steps.length}',
              dotColor: AppTheme.primary,
            ),
          ],
        ),
        const SizedBox(height: AppTheme.s12),
        const EditorialDivider(),
        const SizedBox(height: AppTheme.s24),

        Text(
          'Synthesizing Telemetry',
          style: AppTheme.heading1,
        ),
        const SizedBox(height: AppTheme.s4),
        Text(
          'Evaluating physiological signals, behavioral dynamics, and challenge responses against zero-trust biometric thresholds.',
          style: AppTheme.body,
        ),
        const SizedBox(height: AppTheme.s24),

        // Stepper Card
        BrutalistCard(
          padding: const EdgeInsets.all(AppTheme.s16),
          child: Column(
            children: List.generate(_steps.length, (i) {
              final done = i < _currentStep;
              final active = i == _currentStep;

              return Container(
                margin: const EdgeInsets.symmetric(vertical: 6),
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: active ? AppTheme.surfaceMuted : Colors.transparent,
                  border: Border.all(
                    color: active ? AppTheme.border : Colors.transparent,
                    width: 1.5,
                  ),
                  borderRadius: BorderRadius.circular(AppTheme.r2),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 22,
                      height: 22,
                      decoration: BoxDecoration(
                        color: done
                            ? AppTheme.success
                            : (active ? AppTheme.primary : AppTheme.surfaceMuted),
                        border: Border.all(color: AppTheme.border, width: 1.5),
                        borderRadius: BorderRadius.circular(AppTheme.r2),
                      ),
                      child: Center(
                        child: done
                            ? const Icon(Icons.check, size: 14, color: Colors.white)
                            : (active
                                ? Text('${i + 1}',
                                    style: AppTheme.monoBold.copyWith(fontSize: 11, color: Colors.white))
                                : Text('${i + 1}',
                                    style: AppTheme.mono.copyWith(fontSize: 11, color: AppTheme.textMuted))),
                      ),
                    ),
                    const SizedBox(width: AppTheme.s12),
                    Expanded(
                      child: Text(
                        _steps[i].$1,
                        style: AppTheme.mono.copyWith(
                          fontSize: 11,
                          fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                          color: active ? AppTheme.textPrimary : (done ? AppTheme.textSecondary : AppTheme.textMuted),
                        ),
                      ),
                    ),
                  ],
                ),
              );
            }),
          ),
        ),

        const Spacer(),

        // Bottom Inspection Meter
        BrutalistCard(
          padding: const EdgeInsets.all(AppTheme.s16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'POLLING VERDICT MATRIX',
                    style: AppTheme.monoBold.copyWith(fontSize: 11),
                  ),
                  Text(
                    '[ CYCLE $_pollCount/$_maxPollCount ]',
                    style: AppTheme.mono.copyWith(fontSize: 10, color: AppTheme.textMuted),
                  ),
                ],
              ),
              const SizedBox(height: AppTheme.s10),
              ShimmerBar(
                value: ((_currentStep + 1) / _steps.length).clamp(0.1, 1.0),
                height: 8,
                color: AppTheme.primary,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildError() {
    return Center(
      child: BrutalistCard(
        padding: const EdgeInsets.all(AppTheme.s24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: AppTheme.error,
                border: Border.all(color: AppTheme.border, width: 2.0),
                borderRadius: BorderRadius.circular(AppTheme.r4),
              ),
              child: const Icon(Icons.warning_amber_rounded, color: Colors.white, size: 30),
            ),
            const SizedBox(height: AppTheme.s16),
            Text('VERIFICATION HALTED', style: AppTheme.monoBold.copyWith(fontSize: 14)),
            const SizedBox(height: AppTheme.s8),
            Text(_errorMessage!, style: AppTheme.body, textAlign: TextAlign.center),
            const SizedBox(height: AppTheme.s20),
            Row(
              children: [
                Expanded(
                  child: BrutalistButton(
                    label: 'HOME',
                    backgroundColor: AppTheme.surfaceMuted,
                    textColor: AppTheme.textPrimary,
                    onPressed: () => Navigator.pushNamedAndRemoveUntil(context, '/', (r) => false),
                  ),
                ),
                const SizedBox(width: AppTheme.s12),
                Expanded(
                  child: BrutalistButton(
                    label: 'RETRY',
                    onPressed: _retry,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
