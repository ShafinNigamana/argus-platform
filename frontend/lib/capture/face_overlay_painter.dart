import 'package:flutter/material.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';

import 'roi_selector.dart';

/// Draws face bounding boxes, landmarks, and ROI rectangles on top of the
/// camera preview. Phase 2/3 debug visualization — required per Module 1
/// spec §12.
class FaceOverlayPainter extends CustomPainter {
  FaceOverlayPainter({
    required this.faces,
    required this.rois,
    required this.imageSize,
    required this.isFrontCamera,
  });

  final List<Face> faces;
  final List<FaceRois> rois;
  final Size imageSize;
  final bool isFrontCamera;

  @override
  void paint(Canvas canvas, Size size) {
    if (faces.isEmpty || imageSize.width == 0 || imageSize.height == 0) return;

    // Scale from image-pixel coords to widget coords (cover-fit style).
    final scaleX = size.width / imageSize.width;
    final scaleY = size.height / imageSize.height;
    final scale = scaleX > scaleY ? scaleX : scaleY;
    final dx = (size.width - imageSize.width * scale) / 2;
    final dy = (size.height - imageSize.height * scale) / 2;

    double mapX(double x) {
      final v = x * scale + dx;
      // Front camera preview is mirrored; mirror landmarks to match.
      return isFrontCamera ? size.width - v : v;
    }

    double mapY(double y) => y * scale + dy;

    Rect mapRect(Rect r) {
      final mapped = Rect.fromLTRB(
        mapX(r.left),
        mapY(r.top),
        mapX(r.right),
        mapY(r.bottom),
      );
      // Mirroring flips left/right; normalize so left ≤ right.
      return Rect.fromLTRB(
        mapped.left < mapped.right ? mapped.left : mapped.right,
        mapped.top,
        mapped.left < mapped.right ? mapped.right : mapped.left,
        mapped.bottom,
      );
    }

    final boxPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3
      ..color = const Color(0xFF7C4DFF); // purple — face bbox

    final landmarkPaint = Paint()
      ..style = PaintingStyle.fill
      ..color = const Color(0xFF00E5FF); // cyan — landmarks

    final foreheadPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..color = const Color(0xFF76FF03); // green — forehead ROI

    final cheekPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..color = const Color(0xFFFFC400); // amber — cheek ROIs

    for (final face in faces) {
      // 1. Face bounding box
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          mapRect(face.boundingBox),
          const Radius.circular(8),
        ),
        boxPaint,
      );

      // 2. Landmarks
      for (final lm in face.landmarks.values) {
        if (lm == null) continue;
        canvas.drawCircle(
          Offset(
            mapX(lm.position.x.toDouble()),
            mapY(lm.position.y.toDouble()),
          ),
          3,
          landmarkPaint,
        );
      }
    }

    // 3. ROIs (drawn after faces so they sit on top)
    for (final r in rois) {
      canvas.drawRect(mapRect(r.forehead), foreheadPaint);
      canvas.drawRect(mapRect(r.leftCheek), cheekPaint);
      canvas.drawRect(mapRect(r.rightCheek), cheekPaint);
    }
  }

  @override
  bool shouldRepaint(covariant FaceOverlayPainter old) =>
      old.faces != faces ||
      old.rois != rois ||
      old.imageSize != imageSize ||
      old.isFrontCamera != isFrontCamera;
}
