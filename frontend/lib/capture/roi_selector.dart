import 'dart:ui';

import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';

/// Three regions of interest used by Argus rPPG signal extraction.
///
/// Coordinates are in the same space as `Face.boundingBox` — i.e. the rotated
/// (upright) image space ML Kit returns.
class FaceRois {
  const FaceRois({
    required this.forehead,
    required this.leftCheek,
    required this.rightCheek,
  });

  final Rect forehead;
  final Rect leftCheek;
  final Rect rightCheek;

  Iterable<Rect> get all sync* {
    yield forehead;
    yield leftCheek;
    yield rightCheek;
  }
}

/// Derives forehead + cheek ROIs from a detected face.
///
/// Strategy (Phase 3 — geometric, no per-pixel work yet):
///   - Forehead: a horizontal strip above the eye line, inset from the bbox
///     edges so we avoid hairline and temples.
///   - Cheeks: square-ish patches centered on the ML Kit cheek landmarks if
///     present, or geometrically derived from eye/mouth landmarks as a
///     fallback.
///
/// Phase 4 will tighten these using actual landmark coverage and brightness
/// checks; for now we want stable rectangles that visibly track the face.
class RoiSelector {
  const RoiSelector();

  FaceRois? select(Face face) {
    final box = face.boundingBox;
    if (box.isEmpty) return null;

    // Eye line — average y of left + right eye landmarks if available,
    // otherwise an estimate at 38% of the bbox height.
    final leftEye = face.landmarks[FaceLandmarkType.leftEye]?.position;
    final rightEye = face.landmarks[FaceLandmarkType.rightEye]?.position;
    final eyeY = (leftEye != null && rightEye != null)
        ? (leftEye.y + rightEye.y) / 2.0
        : box.top + box.height * 0.38;

    // --- Forehead: strip from just above eyes up toward bbox top ----------
    final foreheadBottom = eyeY - box.height * 0.08;
    final foreheadTop = box.top + box.height * 0.10; // skip hairline
    final foreheadLeft = box.left + box.width * 0.30;
    final foreheadRight = box.right - box.width * 0.30;
    final forehead = Rect.fromLTRB(
      foreheadLeft,
      foreheadTop,
      foreheadRight,
      foreheadBottom < foreheadTop ? foreheadTop + 1 : foreheadBottom,
    );

    // --- Cheeks: prefer ML Kit landmarks, fall back to geometry -----------
    final leftCheekLm = face.landmarks[FaceLandmarkType.leftCheek]?.position;
    final rightCheekLm = face.landmarks[FaceLandmarkType.rightCheek]?.position;
    final cheekHalf = box.width * 0.08;

    final leftCheek = leftCheekLm != null
        ? Rect.fromCenter(
            center: Offset(leftCheekLm.x.toDouble(), leftCheekLm.y.toDouble()),
            width: cheekHalf * 2,
            height: cheekHalf * 2,
          )
        : Rect.fromLTWH(
            box.left + box.width * 0.10,
            eyeY + box.height * 0.10,
            box.width * 0.18,
            box.height * 0.16,
          );

    final rightCheek = rightCheekLm != null
        ? Rect.fromCenter(
            center: Offset(
                rightCheekLm.x.toDouble(), rightCheekLm.y.toDouble()),
            width: cheekHalf * 2,
            height: cheekHalf * 2,
          )
        : Rect.fromLTWH(
            box.right - box.width * 0.28,
            eyeY + box.height * 0.10,
            box.width * 0.18,
            box.height * 0.16,
          );

    return FaceRois(
      forehead: forehead,
      leftCheek: leftCheek,
      rightCheek: rightCheek,
    );
  }
}
