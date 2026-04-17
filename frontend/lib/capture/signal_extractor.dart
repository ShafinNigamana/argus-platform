import 'dart:ui';

import 'package:camera/camera.dart';

/// Extracts the average green channel value from the forehead ROI.
///
/// Uses YUV → Green conversion on the raw NV21/YUV camera image.
/// Handles the coordinate rotation between ML Kit's rotated space
/// and the raw sensor image layout.
class SignalExtractor {
  /// Extract average green channel intensity from [roi] in [image].
  ///
  /// Returns null if extraction fails (no data, bad coordinates, etc).
  double? extractGreen(CameraImage image, Rect roi, int sensorRotation) {
    if (roi.isEmpty) return null;

    final rawW = image.width;
    final rawH = image.height;
    final bytes = image.planes[0].bytes;

    // NV21 single-plane: Y data (rawW * rawH bytes) then VU interleaved.
    final ySize = rawW * rawH;
    if (bytes.length < ySize + ySize ~/ 2) return null;

    // Convert ROI corners from ML Kit rotated space to raw sensor space.
    final (rawLeft, rawTop) =
        _rotatedToRaw(roi.left.toInt(), roi.top.toInt(), rawW, rawH, sensorRotation);
    final (rawRight, rawBottom) =
        _rotatedToRaw(roi.right.toInt(), roi.bottom.toInt(), rawW, rawH, sensorRotation);

    // Normalize — rotation can flip min/max.
    final x0 = rawLeft < rawRight ? rawLeft : rawRight;
    final x1 = rawLeft < rawRight ? rawRight : rawLeft;
    final y0 = rawTop < rawBottom ? rawTop : rawBottom;
    final y1 = rawTop < rawBottom ? rawBottom : rawTop;

    // Clamp to image bounds.
    final left = x0.clamp(0, rawW - 1);
    final right = x1.clamp(0, rawW - 1);
    final top = y0.clamp(0, rawH - 1);
    final bottom = y1.clamp(0, rawH - 1);

    if (right <= left || bottom <= top) return null;

    double greenSum = 0;
    int count = 0;

    // Sample every 2nd pixel for speed — still gives accurate mean.
    for (var y = top; y < bottom; y += 2) {
      for (var x = left; x < right; x += 2) {
        // Y channel
        final yVal = bytes[y * rawW + x];

        // UV from NV21: VU interleaved after Y plane.
        // Each 2×2 block shares one V and one U.
        final uvBase = ySize + (y ~/ 2) * rawW + (x ~/ 2) * 2;
        if (uvBase + 1 >= bytes.length) continue;
        final v = bytes[uvBase];
        final u = bytes[uvBase + 1];

        // YUV → Green
        final g = yVal - 0.344 * (u - 128) - 0.714 * (v - 128);
        greenSum += g.clamp(0, 255);
        count++;
      }
    }

    return count == 0 ? null : greenSum / count;
  }

  /// Convert a point from ML Kit's rotated (upright) space to raw sensor space.
  (int, int) _rotatedToRaw(int rx, int ry, int rawW, int rawH, int rotation) {
    switch (rotation) {
      case 270:
        return (rawW - 1 - ry, rx);
      case 90:
        return (ry, rawH - 1 - rx);
      case 180:
        return (rawW - 1 - rx, rawH - 1 - ry);
      default: // 0
        return (rx, ry);
    }
  }
}
