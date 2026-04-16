import 'dart:math';
import 'dart:ui';

import 'package:camera/camera.dart';

/// Per-frame quality metrics required by the Module 1 output contract §4.
class FrameQuality {
  const FrameQuality({
    required this.brightness,
    required this.blurScore,
    required this.faceStability,
  });

  /// Mean pixel intensity, normalized 0–1 (0 = black, 1 = white).
  final double brightness;

  /// Blur estimate, 0–1 (0 = sharp, 1 = very blurry).
  final double blurScore;

  /// Face position stability, 0–1 (1 = rock-steady, 0 = large movement).
  final double faceStability;

  static const FrameQuality empty =
      FrameQuality(brightness: 0, blurScore: 0, faceStability: 0);
}

/// Computes frame quality metrics from the raw camera image and face bbox.
class FrameQualityAnalyzer {
  Rect? _previousBbox;

  FrameQuality analyze(CameraImage image, Rect faceBbox) {
    final brightness = _brightness(image);
    final blur = _blur(image);
    final stability = _stability(faceBbox);
    _previousBbox = faceBbox;
    return FrameQuality(
      brightness: brightness,
      blurScore: blur,
      faceStability: stability,
    );
  }

  void reset() => _previousBbox = null;

  // --- Brightness: mean Y over full frame, normalized to 0–1 ---------------

  double _brightness(CameraImage image) {
    final yPlane = image.planes[0].bytes;
    final width = image.width;
    final height = image.height;
    final rowStride = image.planes[0].bytesPerRow;

    int sum = 0;
    int count = 0;
    for (var row = 0; row < height; row += 16) {
      final offset = row * rowStride;
      for (var col = 0; col < width; col += 16) {
        if (offset + col < yPlane.length) {
          sum += yPlane[offset + col];
          count++;
        }
      }
    }
    return count == 0 ? 0 : (sum / count) / 255.0;
  }

  // --- Blur: Laplacian variance over full frame, normalized to 0–1 --------

  double _blur(CameraImage image) {
    final yPlane = image.planes[0].bytes;
    final width = image.width;
    final rowStride = image.planes[0].bytesPerRow;
    final height = image.height;

    double sumSq = 0;
    int count = 0;
    for (var row = 2; row < height - 2; row += 16) {
      for (var col = 2; col < width - 2; col += 16) {
        final idx = row * rowStride + col;
        final up = (row - 1) * rowStride + col;
        final down = (row + 1) * rowStride + col;
        if (down + 1 >= yPlane.length) continue;

        final lap = 4 * yPlane[idx] -
            yPlane[up] -
            yPlane[down] -
            yPlane[idx - 1] -
            yPlane[idx + 1];
        sumSq += lap * lap;
        count++;
      }
    }

    if (count == 0) return 1.0;
    final variance = sumSq / count;

    // Empirical: variance > 100 → reasonably sharp (blur ≈ 0).
    const sharpThreshold = 100.0;
    return (1.0 - (variance / sharpThreshold)).clamp(0.0, 1.0);
  }

  // --- Face stability: 1 − normalized bbox-center delta -------------------

  double _stability(Rect currentBbox) {
    final prev = _previousBbox;
    if (prev == null) return 1.0; // first frame → assume stable

    final prevCenter = prev.center;
    final currCenter = currentBbox.center;
    final dx = (currCenter.dx - prevCenter.dx).abs();
    final dy = (currCenter.dy - prevCenter.dy).abs();
    final delta = sqrt(dx * dx + dy * dy);

    // Normalize: > 40 px movement per frame ≈ stability 0.
    const maxDelta = 40.0;
    return (1.0 - delta / maxDelta).clamp(0.0, 1.0);
  }
}
