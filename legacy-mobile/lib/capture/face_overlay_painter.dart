import 'package:flutter/material.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';

import '../theme/app_theme.dart';
import 'roi_selector.dart';

/// Industrial Viewfinder Reticle for biometric face tracking and ROI alignment.
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

    final scaleX = size.width / imageSize.width;
    final scaleY = size.height / imageSize.height;
    final scale = scaleX > scaleY ? scaleX : scaleY;
    final dx = (size.width - imageSize.width * scale) / 2;
    final dy = (size.height - imageSize.height * scale) / 2;

    double mapX(double x) {
      final v = x * scale + dx;
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
      return Rect.fromLTRB(
        mapped.left < mapped.right ? mapped.left : mapped.right,
        mapped.top,
        mapped.left < mapped.right ? mapped.right : mapped.left,
        mapped.bottom,
      );
    }

    final cornerPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.5
      ..color = AppTheme.primary;

    final foreheadPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5
      ..color = AppTheme.success;

    final landmarkPaint = Paint()
      ..style = PaintingStyle.fill
      ..color = AppTheme.primary;

    for (final face in faces) {
      final rect = mapRect(face.boundingBox);
      final cornerLength = (rect.width * 0.15).clamp(12.0, 28.0);

      // Draw Industrial Corner Brackets (Crosshair Viewfinder)
      // Top-Left
      canvas.drawLine(Offset(rect.left, rect.top), Offset(rect.left + cornerLength, rect.top), cornerPaint);
      canvas.drawLine(Offset(rect.left, rect.top), Offset(rect.left, rect.top + cornerLength), cornerPaint);

      // Top-Right
      canvas.drawLine(Offset(rect.right, rect.top), Offset(rect.right - cornerLength, rect.top), cornerPaint);
      canvas.drawLine(Offset(rect.right, rect.top), Offset(rect.right, rect.top + cornerLength), cornerPaint);

      // Bottom-Left
      canvas.drawLine(Offset(rect.left, rect.bottom), Offset(rect.left + cornerLength, rect.bottom), cornerPaint);
      canvas.drawLine(Offset(rect.left, rect.bottom), Offset(rect.left, rect.bottom - cornerLength), cornerPaint);

      // Bottom-Right
      canvas.drawLine(Offset(rect.right, rect.bottom), Offset(rect.right - cornerLength, rect.bottom), cornerPaint);
      canvas.drawLine(Offset(rect.right, rect.bottom), Offset(rect.right, rect.bottom - cornerLength), cornerPaint);

      // Landmarks (tiny technical square points)
      for (final lm in face.landmarks.values) {
        if (lm == null) continue;
        final pt = Offset(
          mapX(lm.position.x.toDouble()),
          mapY(lm.position.y.toDouble()),
        );
        canvas.drawRect(Rect.fromCenter(center: pt, width: 3, height: 3), landmarkPaint);
      }
    }

    // Forehead ROIs
    for (final r in rois) {
      final foreheadRect = mapRect(r.forehead);
      canvas.drawRect(foreheadRect, foreheadPaint);
    }
  }

  @override
  bool shouldRepaint(FaceOverlayPainter oldDelegate) => true;
}
