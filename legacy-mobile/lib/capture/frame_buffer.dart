import 'dart:collection';

import 'frame_payload.dart';
import 'frame_quality.dart';

class QualityThresholds {
  const QualityThresholds({
    this.minBrightness = 0.3,
    this.maxBlur = 0.6,
    this.minStability = 0.5,
  });

  final double minBrightness;
  final double maxBlur;
  final double minStability;

  bool passes(FrameQuality q) =>
      q.brightness >= minBrightness &&
      q.blurScore <= maxBlur &&
      q.faceStability >= minStability;
}

enum DropReason { noFace, lowBrightness, highBlur, lowStability }

class BufferResult {
  const BufferResult.accepted() : dropped = false, reason = null;
  const BufferResult.dropped(this.reason) : dropped = true;

  final bool dropped;
  final DropReason? reason;
}

class FrameBuffer {
  FrameBuffer({
    this.capacity = 300,
    this.thresholds = const QualityThresholds(),
    this.batchSize = 30,
  });

  final int capacity;
  final QualityThresholds thresholds;
  final int batchSize;
  final Queue<FramePayload> _buffer = Queue<FramePayload>();

  int _accepted = 0;
  int _dropped = 0;

  int get length => _buffer.length;
  int get accepted => _accepted;
  int get dropped => _dropped;

  BufferResult add(FramePayload frame) {
    if (!frame.faceDetected) {
      _dropped++;
      return const BufferResult.dropped(DropReason.noFace);
    }

    final q = frame.frameQuality;
    if (q != null) {
      if (q.brightness < thresholds.minBrightness) {
        _dropped++;
        return const BufferResult.dropped(DropReason.lowBrightness);
      }
      if (q.blurScore > thresholds.maxBlur) {
        _dropped++;
        return const BufferResult.dropped(DropReason.highBlur);
      }
      if (q.faceStability < thresholds.minStability) {
        _dropped++;
        return const BufferResult.dropped(DropReason.lowStability);
      }
    }

    if (_buffer.length >= capacity) _buffer.removeFirst();
    _buffer.addLast(frame);
    _accepted++;
    return const BufferResult.accepted();
  }

  List<FramePayload> drainBatch() {
    if (_buffer.length < batchSize) return const [];
    return _drain(batchSize);
  }

  List<FramePayload> drainAll() => _drain(_buffer.length);

  FramePayload? get latest => _buffer.isNotEmpty ? _buffer.last : null;

  void clear() {
    _buffer.clear();
    _accepted = 0;
    _dropped = 0;
  }

  List<FramePayload> _drain(int count) {
    final batch = <FramePayload>[];
    for (var i = 0; i < count && _buffer.isNotEmpty; i++) {
      batch.add(_buffer.removeFirst());
    }
    return batch;
  }
}
