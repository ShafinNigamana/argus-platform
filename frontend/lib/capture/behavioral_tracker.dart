import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';

class BehavioralSignals {
  const BehavioralSignals({
    required this.leftEyeOpen,
    required this.rightEyeOpen,
    required this.isBlinking,
    required this.blinkCount,
    required this.headTurnX,
    required this.headTurnY,
    required this.headDirection,
    required this.motionConsistency,
  });

  final double? leftEyeOpen;
  final double? rightEyeOpen;
  final bool isBlinking;
  final int blinkCount;
  final double? headTurnX;
  final double? headTurnY;
  final String headDirection;
  final double motionConsistency;

  static const BehavioralSignals empty = BehavioralSignals(
    leftEyeOpen: null,
    rightEyeOpen: null,
    isBlinking: false,
    blinkCount: 0,
    headTurnX: null,
    headTurnY: null,
    headDirection: 'unknown',
    motionConsistency: 1.0,
  );
}

/// Recorded blink event with timing data for the backend.
class RecordedBlinkEvent {
  final int timestamp; // epoch ms when blink ended (eyes reopened)
  final int duration;  // blink duration in ms

  const RecordedBlinkEvent({required this.timestamp, required this.duration});

  Map<String, dynamic> toJson() => {
    'timestamp': timestamp,
    'duration': duration,
  };
}

/// Recorded head movement snapshot for the backend.
class RecordedHeadMovement {
  final double angle;   // head Y angle in degrees
  final int timestamp;  // epoch ms

  const RecordedHeadMovement({required this.angle, required this.timestamp});

  Map<String, dynamic> toJson() => {
    'angle': angle,
    'timestamp': timestamp,
  };
}

class BehavioralTracker {
  static const double _blinkThreshold = 0.3;
  static const double _turnThreshold = 10.0;

  int _blinkCount = 0;
  bool _wasBlinking = false;
  int _blinkStartMs = 0;
  final List<double> _recentHeadY = [];
  static const int _historySize = 15;

  // ── Raw event accumulation for backend API ──
  final List<RecordedBlinkEvent> recordedBlinks = [];
  final List<RecordedHeadMovement> recordedMovements = [];
  int _sessionStartMs = 0;

  /// The epoch ms when tracking started.
  int get sessionStartMs => _sessionStartMs;

  /// Session duration in ms from first update to now.
  int get sessionDurationMs => _sessionStartMs > 0
      ? DateTime.now().millisecondsSinceEpoch - _sessionStartMs
      : 0;

  BehavioralSignals update(Face face) {
    final now = DateTime.now().millisecondsSinceEpoch;
    if (_sessionStartMs == 0) _sessionStartMs = now;

    final leftOpen = face.leftEyeOpenProbability;
    final rightOpen = face.rightEyeOpenProbability;
    final headX = face.headEulerAngleX;
    final headY = face.headEulerAngleY;

    final eyesClosed = (leftOpen != null && leftOpen < _blinkThreshold) &&
        (rightOpen != null && rightOpen < _blinkThreshold);

    // Track blink start time
    if (eyesClosed && !_wasBlinking) {
      _blinkStartMs = now;
    }

    // On blink end (eyes reopen), record the event
    if (_wasBlinking && !eyesClosed) {
      _blinkCount++;
      final duration = now - _blinkStartMs;
      if (duration > 0 && duration < 2000) {
        recordedBlinks.add(RecordedBlinkEvent(
          timestamp: now,
          duration: duration,
        ));
      }
    }
    _wasBlinking = eyesClosed;

    final direction = _classifyDirection(headY);

    if (headY != null) {
      _recentHeadY.add(headY);
      if (_recentHeadY.length > _historySize) {
        _recentHeadY.removeAt(0);
      }

      // Record head movement snapshot (throttled — max ~4/sec via frame throttling)
      recordedMovements.add(RecordedHeadMovement(
        angle: headY,
        timestamp: now,
      ));
    }

    return BehavioralSignals(
      leftEyeOpen: leftOpen,
      rightEyeOpen: rightOpen,
      isBlinking: eyesClosed,
      blinkCount: _blinkCount,
      headTurnX: headX,
      headTurnY: headY,
      headDirection: direction,
      motionConsistency: _computeConsistency(),
    );
  }

  void reset() {
    _blinkCount = 0;
    _wasBlinking = false;
    _blinkStartMs = 0;
    _recentHeadY.clear();
    recordedBlinks.clear();
    recordedMovements.clear();
    _sessionStartMs = 0;
  }

  String _classifyDirection(double? headY) {
    if (headY == null) return 'unknown';
    if (headY > _turnThreshold) return 'LEFT';
    if (headY < -_turnThreshold) return 'RIGHT';
    return 'CENTER';
  }

  double _computeConsistency() {
    if (_recentHeadY.length < 3) return 1.0;
    final mean = _recentHeadY.reduce((a, b) => a + b) / _recentHeadY.length;
    var sumSq = 0.0;
    for (final v in _recentHeadY) {
      sumSq += (v - mean) * (v - mean);
    }
    final stdDev = sumSq / _recentHeadY.length;
    return (1.0 - stdDev / 100.0).clamp(0.0, 1.0);
  }
}
