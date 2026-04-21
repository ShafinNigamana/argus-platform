import 'dart:async';

import 'package:flutter/material.dart';

import '../services/api_service.dart';

class ProcessingScreen extends StatefulWidget {
  const ProcessingScreen({super.key});

  @override
  State<ProcessingScreen> createState() => _ProcessingScreenState();
}

class _ProcessingScreenState extends State<ProcessingScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  final _steps = [
    'Analyzing facial signals...',
    'Processing heartbeat data...',
    'Validating behavioral patterns...',
    'Computing liveness score...',
  ];
  int _currentStep = 0;

  final ApiService _apiService = ApiService();
  Timer? _pollTimer;
  int _pollCount = 0;
  static const int _maxPollCount = 10; // 10 × 1.5s = 15s timeout
  String? _errorMessage;
  bool _navigated = false;
  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 1),
    )..repeat();
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
    // Get sessionId from route arguments
    final sessionId = ModalRoute.of(context)?.settings.arguments as String?;

    if (sessionId == null) {
      setState(() => _errorMessage = 'No session ID — cannot fetch result');
      return;
    }

    // Set the session ID on the API service for polling
    _apiService.setSessionId(sessionId);

    // Animate steps
    _animateSteps();

    // Start polling /result
    _pollTimer = Timer.periodic(const Duration(milliseconds: 1500), (_) {
      _pollResult();
    });
    // Also poll immediately
    _pollResult();
  }

  Future<void> _animateSteps() async {
    for (var i = 0; i < _steps.length; i++) {
      await Future.delayed(const Duration(milliseconds: 800));
      if (!mounted) return;
      setState(() => _currentStep = i);
    }
  }

  Future<void> _pollResult() async {
    if (_navigated) return;

    _pollCount++;
    final result = await _apiService.getResult();

    if (!mounted || _navigated) return;

    // Handle errors
    if (result == null) {
      if (_pollCount >= _maxPollCount) {
        setState(
            () => _errorMessage = 'Could not reach backend. Please try again.');
      }
      return;
    }

    if (result.containsKey('error')) {
      final error = result['error'] as String;
      if (error == 'SESSION_EXPIRED') {
        setState(() => _errorMessage = 'Session expired. Please restart.');
      } else if (error == 'NETWORK_ERROR') {
        if (_pollCount >= _maxPollCount) {
          setState(() =>
              _errorMessage = 'Network error. Check your connection.');
        }
      }
      return;
    }

    final status = result['status']?.toString();

    if (status == 'READY') {
      _navigated = true;
      _pollTimer?.cancel();

      // Navigate to result screen with backend data
      Navigator.pushReplacementNamed(context, '/result', arguments: result);
    } else if (status == 'PROCESSING' && _pollCount >= _maxPollCount) {
      setState(() => _errorMessage =
          'Processing is taking too long. Not enough signal data may have been collected.');
    }
    // else: still PROCESSING, keep polling
  }

  void _retry() {
    setState(() {
      _errorMessage = null;
      _pollCount = 0;
    });
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(milliseconds: 1500), (_) {
      _pollResult();
    });
    _pollResult();
  }

  @override
  void dispose() {
    _controller.dispose();
    _pollTimer?.cancel();
    _apiService.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF121212),
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: _errorMessage != null
                ? _buildErrorView()
                : _buildProcessingView(),
          ),
        ),
      ),
    );
  }

  Widget _buildProcessingView() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        RotationTransition(
          turns: _controller,
          child: Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(
                color: const Color(0xFF7C4DFF),
                width: 3,
              ),
            ),
            child: const Icon(
              Icons.fingerprint,
              size: 40,
              color: Color(0xFF7C4DFF),
            ),
          ),
        ),
        const SizedBox(height: 40),
        const Text(
          'Processing Verification',
          style: TextStyle(
            color: Colors.white,
            fontSize: 22,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 32),
        ...List.generate(_steps.length, (i) {
          final done = i < _currentStep;
          final active = i == _currentStep;
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Row(
              children: [
                Icon(
                  done
                      ? Icons.check_circle
                      : active
                          ? Icons.radio_button_on
                          : Icons.radio_button_off,
                  color: done
                      ? const Color(0xFF00C853)
                      : active
                          ? const Color(0xFF7C4DFF)
                          : Colors.white24,
                  size: 20,
                ),
                const SizedBox(width: 12),
                Text(
                  _steps[i],
                  style: TextStyle(
                    color: active
                        ? Colors.white
                        : done
                            ? Colors.white70
                            : Colors.white30,
                    fontSize: 15,
                  ),
                ),
              ],
            ),
          );
        }),
        const SizedBox(height: 24),
        Text(
          'Fetching result from server...',
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.4),
            fontSize: 13,
          ),
        ),
      ],
    );
  }

  Widget _buildErrorView() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(
              color: const Color(0xFFD50000),
              width: 3,
            ),
          ),
          child: const Icon(
            Icons.error_outline,
            size: 40,
            color: Color(0xFFD50000),
          ),
        ),
        const SizedBox(height: 24),
        const Text(
          'Something went wrong',
          style: TextStyle(
            color: Colors.white,
            fontSize: 22,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        Text(
          _errorMessage!,
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.6),
            fontSize: 15,
            height: 1.4,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 32),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            ElevatedButton(
              onPressed: _retry,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF7C4DFF),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                ),
              ),
              child: const Text('RETRY'),
            ),
            const SizedBox(width: 16),
            TextButton(
              onPressed: () => Navigator.pushNamedAndRemoveUntil(
                context,
                '/',
                (route) => false,
              ),
              child: Text(
                'GO HOME',
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.6),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
