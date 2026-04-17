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

class BehavioralTracker {
  static const double _blinkThreshold = 0.3;
  static const double _turnThreshold = 10.0;

  int _blinkCount = 0;
  bool _wasBlinking = false;
  final List<double> _recentHeadY = [];
  static const int _historySize = 15;

  BehavioralSignals update(Face face) {
    final leftOpen = face.leftEyeOpenProbability;
    final rightOpen = face.rightEyeOpenProbability;
    final headX = face.headEulerAngleX;
    final headY = face.headEulerAngleY;

    final eyesClosed = (leftOpen != null && leftOpen < _blinkThreshold) &&
        (rightOpen != null && rightOpen < _blinkThreshold);

    if (_wasBlinking && !eyesClosed) {
      _blinkCount++;
    }
    _wasBlinking = eyesClosed;

    final direction = _classifyDirection(headY);

    if (headY != null) {
      _recentHeadY.add(headY);
      if (_recentHeadY.length > _historySize) {
        _recentHeadY.removeAt(0);
      }
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
    _recentHeadY.clear();
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
