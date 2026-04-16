import 'dart:io';
import 'dart:ui' show Size;

import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';

/// Thin wrapper around ML Kit's FaceDetector that ingests raw CameraImage
/// frames from the `camera` plugin and returns detected faces.
///
/// Phase 2 of Module 1: feeds the Argus pipeline with stable face bounding
/// boxes and landmarks. ML Kit is used here as an MVP shortcut for MediaPipe
/// Face Landmarker — swap the implementation later if stricter landmark
/// coverage is needed.
///
/// Android/iOS only. All public methods return null / empty on other platforms.
class FaceTracker {
  FaceTracker()
      : _detector = FaceDetector(
          options: FaceDetectorOptions(
            enableLandmarks: true,
            enableContours: true,
            enableTracking: true,
            performanceMode: FaceDetectorMode.fast,
          ),
        );

  final FaceDetector _detector;
  bool _busy = false;

  /// Process one frame and return the detected faces.
  /// Returns null if the frame was skipped (platform unsupported or still
  /// processing the previous frame).
  Future<List<Face>?> process(
    CameraImage image,
    CameraDescription camera,
  ) async {
    if (kIsWeb) return null;
    if (!(Platform.isAndroid || Platform.isIOS)) return null;
    if (_busy) return null;
    _busy = true;

    try {
      final input = _toInputImage(image, camera);
      if (input == null) return const <Face>[];
      return await _detector.processImage(input);
    } catch (e) {
      debugPrint('FaceTracker error: $e');
      return const <Face>[];
    } finally {
      _busy = false;
    }
  }

  Future<void> dispose() => _detector.close();

  // --- CameraImage → InputImage conversion ----------------------------------

  InputImage? _toInputImage(CameraImage image, CameraDescription camera) {
    final rotation = _rotationFor(camera);
    if (rotation == null) return null;

    if (Platform.isIOS) {
      // iOS delivers BGRA8888 single-plane, ML Kit accepts it directly.
      final plane = image.planes.first;
      return InputImage.fromBytes(
        bytes: plane.bytes,
        metadata: InputImageMetadata(
          size: Size(image.width.toDouble(), image.height.toDouble()),
          rotation: rotation,
          format: InputImageFormat.bgra8888,
          bytesPerRow: plane.bytesPerRow,
        ),
      );
    }

    // Android: ML Kit only accepts true NV21. Two cases:
    //   1. Camera plugin honored our nv21 request → single packed plane → use as-is.
    //   2. HAL fell back to yuv_420_888 → 3 planes → convert in Dart.
    if (image.planes.length == 1) {
      final plane = image.planes.first;
      return InputImage.fromBytes(
        bytes: plane.bytes,
        metadata: InputImageMetadata(
          size: Size(image.width.toDouble(), image.height.toDouble()),
          rotation: rotation,
          format: InputImageFormat.nv21,
          bytesPerRow: plane.bytesPerRow,
        ),
      );
    }

    final nv21 = _yuv420ToNv21(image);
    return InputImage.fromBytes(
      bytes: nv21,
      metadata: InputImageMetadata(
        size: Size(image.width.toDouble(), image.height.toDouble()),
        rotation: rotation,
        format: InputImageFormat.nv21,
        bytesPerRow: image.width, // Y row stride for NV21
      ),
    );
  }

  /// Converts a CameraImage in YUV_420_888 (or already-NV21 single-plane) to
  /// a contiguous NV21 buffer suitable for ML Kit.
  ///
  /// NV21 layout: [Y plane (w*h bytes)] [interleaved VU plane (w*h/2 bytes)].
  Uint8List _yuv420ToNv21(CameraImage image) {
    final width = image.width;
    final height = image.height;
    final ySize = width * height;
    final uvSize = ySize ~/ 2;
    final out = Uint8List(ySize + uvSize);

    // --- Y plane ---------------------------------------------------------
    final yPlane = image.planes[0];
    final yRowStride = yPlane.bytesPerRow;
    final yBytes = yPlane.bytes;
    if (yRowStride == width) {
      out.setRange(0, ySize, yBytes);
    } else {
      var dst = 0;
      for (var row = 0; row < height; row++) {
        final src = row * yRowStride;
        out.setRange(dst, dst + width, yBytes, src);
        dst += width;
      }
    }

    if (image.planes.length < 3) {
      // Already NV21 single-plane (or NV12) — copy the chroma plane as-is.
      // For true NV21 we just need the second plane appended.
      if (image.planes.length == 2) {
        final uv = image.planes[1].bytes;
        out.setRange(ySize, ySize + uv.length.clamp(0, uvSize), uv);
      }
      return out;
    }

    // --- VU interleave from separate U and V planes ----------------------
    final uPlane = image.planes[1];
    final vPlane = image.planes[2];
    final uBytes = uPlane.bytes;
    final vBytes = vPlane.bytes;
    final uvRowStride = uPlane.bytesPerRow;
    final uvPixelStride = uPlane.bytesPerPixel ?? 1;

    var dst = ySize;
    final halfH = height ~/ 2;
    final halfW = width ~/ 2;
    for (var row = 0; row < halfH; row++) {
      for (var col = 0; col < halfW; col++) {
        final src = row * uvRowStride + col * uvPixelStride;
        if (src >= vBytes.length || src >= uBytes.length) break;
        out[dst++] = vBytes[src]; // V first → NV21
        out[dst++] = uBytes[src];
      }
    }
    return out;
  }

  InputImageRotation? _rotationFor(CameraDescription camera) {
    // Simple path: trust the camera's sensor orientation. Good enough while
    // the device is held in portrait. Phase 3+ can refine this using the
    // live DeviceOrientation if rotation artifacts show up.
    return InputImageRotationValue.fromRawValue(camera.sensorOrientation);
  }
}

