import 'dart:convert';

import 'behavioral_tracker.dart';

enum ChallengeType {
  blinkTwice('Blink twice', 2),
  turnLeft('Turn your head left', 1),
  turnRight('Turn your head right', 1);

  const ChallengeType(this.instruction, this.requiredCount);
  final String instruction;
  final int requiredCount;
}

enum ChallengeState { idle, countdown, active, success, failed, allDone }

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

/// Runs ALL challenges in sequence: blink → turn left → turn right.
/// Tracks pass/fail for each and computes an overall score.
class ChallengeSystem {
  static const int countdownSeconds = 3;
  static const int challengeTimeLimit = 10;

  // Fixed sequence — every user gets the same challenges.
  static const _sequence = [
    ChallengeType.blinkTwice,
    ChallengeType.turnLeft,
    ChallengeType.turnRight,
  ];

  final List<ChallengeResult> results = [];

  ChallengeState state = ChallengeState.idle;
  ChallengeType? currentChallenge;
  int _sequenceIndex = 0;
  int _countdownRemaining = 0;
  int _timeRemaining = 0;
  int _startEpoch = 0;
  int _actionCount = 0;
  int _baselineBlinkCount = 0;

  int get countdownRemaining => _countdownRemaining;
  int get timeRemaining => _timeRemaining;
  int get actionCount => _actionCount;
  int get currentIndex => _sequenceIndex;
  int get totalChallenges => _sequence.length;
  int get passed => results.where((r) => r.passed).length;
  int get scorePercent =>
      results.isEmpty ? 0 : (passed * 100) ~/ results.length;

  /// Start the full challenge sequence.
  void startAll() {
    results.clear();
    _sequenceIndex = 0;
    _startCurrent();
  }

  /// Advance to next challenge or finish.
  void next() {
    _sequenceIndex++;
    if (_sequenceIndex >= _sequence.length) {
      state = ChallengeState.allDone;
    } else {
      _startCurrent();
    }
  }

  void _startCurrent() {
    currentChallenge = _sequence[_sequenceIndex];
    state = ChallengeState.countdown;
    _countdownRemaining = countdownSeconds;
    _timeRemaining = challengeTimeLimit;
    _actionCount = 0;
  }

  void tickCountdown() {
    if (state != ChallengeState.countdown) return;
    _countdownRemaining--;
    if (_countdownRemaining <= 0) {
      state = ChallengeState.active;
      _startEpoch = DateTime.now().millisecondsSinceEpoch;
    }
  }

  void tickActive() {
    if (state != ChallengeState.active) return;
    _timeRemaining--;
    if (_timeRemaining <= 0) {
      _complete(false);
    }
  }

  void updateFromBehavior(BehavioralSignals signals) {
    if (state == ChallengeState.countdown) {
      _baselineBlinkCount = signals.blinkCount;
      return;
    }
    if (state != ChallengeState.active) return;

    final ch = currentChallenge;
    if (ch == null) return;

    switch (ch) {
      case ChallengeType.blinkTwice:
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

  void reset() {
    state = ChallengeState.idle;
    currentChallenge = null;
    _sequenceIndex = 0;
    _actionCount = 0;
    results.clear();
  }

  void _complete(bool passed) {
    final endEpoch = DateTime.now().millisecondsSinceEpoch;
    results.add(ChallengeResult(
      challenge: currentChallenge!,
      startTime: _startEpoch,
      endTime: endEpoch,
      passed: passed,
    ));
    state = passed ? ChallengeState.success : ChallengeState.failed;
  }
}
