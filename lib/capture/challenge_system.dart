import 'dart:convert';
import 'dart:math';

import 'behavioral_tracker.dart';

/// Types of challenges the system can issue.
enum ChallengeType {
  blinkTwice('Blink twice', 2),
  blinkThrice('Blink three times', 3),
  turnLeft('Turn your head left', 1),
  turnRight('Turn your head right', 1);

  const ChallengeType(this.instruction, this.requiredCount);
  final String instruction;
  final int requiredCount;
}

/// Current state of a running challenge.
enum ChallengeState { idle, countdown, active, success, failed }

/// Result of a completed challenge.
class ChallengeResult {
  const ChallengeResult({
    required this.challenge,
    required this.startTime,
    required this.endTime,
    required this.passed,
  });

  final ChallengeType challenge;
  final int startTime;
  final int endTime;
  final bool passed;

  Map<String, dynamic> toJson() => {
        'challenge': challenge.name,
        'start_time': startTime,
        'end_time': endTime,
        'status': passed ? 'success' : 'failure',
      };

  String toJsonString() => jsonEncode(toJson());
}

/// Orchestrates challenge-response verification.
///
/// Flow: idle → countdown (3s) → active (time limit) → success/failed
class ChallengeSystem {
  static const int countdownSeconds = 3;
  static const int challengeTimeLimit = 10;

  final _random = Random();
  final List<ChallengeResult> results = [];

  ChallengeState state = ChallengeState.idle;
  ChallengeType? currentChallenge;
  int _countdownRemaining = 0;
  int _timeRemaining = 0;
  int _startEpoch = 0;
  int _actionCount = 0;

  // Track blink count at challenge start to compute delta.
  int _baselineBlinkCount = 0;

  int get countdownRemaining => _countdownRemaining;
  int get timeRemaining => _timeRemaining;
  int get actionCount => _actionCount;

  /// Start a random challenge (or a specific one).
  void start([ChallengeType? type]) {
    currentChallenge = type ?? _randomChallenge();
    state = ChallengeState.countdown;
    _countdownRemaining = countdownSeconds;
    _timeRemaining = challengeTimeLimit;
    _actionCount = 0;
  }

  /// Call once per second during countdown phase.
  void tickCountdown() {
    if (state != ChallengeState.countdown) return;
    _countdownRemaining--;
    if (_countdownRemaining <= 0) {
      state = ChallengeState.active;
      _startEpoch = DateTime.now().millisecondsSinceEpoch ~/ 1000;
    }
  }

  /// Call once per second during active phase.
  void tickActive() {
    if (state != ChallengeState.active) return;
    _timeRemaining--;
    if (_timeRemaining <= 0) {
      _complete(false);
    }
  }

  /// Feed behavioral signals each frame during the active phase.
  void updateFromBehavior(BehavioralSignals signals) {
    if (state != ChallengeState.active) {
      // Capture baseline blink count at the moment we go active.
      if (state == ChallengeState.countdown) {
        _baselineBlinkCount = signals.blinkCount;
      }
      return;
    }

    final ch = currentChallenge;
    if (ch == null) return;

    switch (ch) {
      case ChallengeType.blinkTwice:
      case ChallengeType.blinkThrice:
        _actionCount = signals.blinkCount - _baselineBlinkCount;
        if (_actionCount >= ch.requiredCount) {
          _complete(true);
        }
      case ChallengeType.turnLeft:
        if (signals.headDirection == 'LEFT') {
          _actionCount = 1;
          _complete(true);
        }
      case ChallengeType.turnRight:
        if (signals.headDirection == 'RIGHT') {
          _actionCount = 1;
          _complete(true);
        }
    }
  }

  /// Reset to idle (e.g. after showing result).
  void reset() {
    state = ChallengeState.idle;
    currentChallenge = null;
    _actionCount = 0;
  }

  void _complete(bool passed) {
    final endEpoch = DateTime.now().millisecondsSinceEpoch ~/ 1000;
    final result = ChallengeResult(
      challenge: currentChallenge!,
      startTime: _startEpoch,
      endTime: endEpoch,
      passed: passed,
    );
    results.add(result);
    state = passed ? ChallengeState.success : ChallengeState.failed;
  }

  ChallengeType _randomChallenge() {
    final types = ChallengeType.values;
    return types[_random.nextInt(types.length)];
  }
}
