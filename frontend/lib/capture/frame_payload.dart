import 'dart:convert';
import 'dart:ui';

import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';

import 'frame_quality.dart';
import 'roi_selector.dart';

class FramePayload {
  FramePayload({
    required this.frameId,
    required this.timestamp,
    required this.faceDetected,
    this.faceBbox,
    this.landmarks,
    this.roi,
    this.frameQuality,
  });

  final int frameId;
  final int timestamp;
  final bool faceDetected;
  final Rect? faceBbox;
  final List<Offset>? landmarks;
  final FaceRois? roi;
  final FrameQuality? frameQuality;

  Map<String, dynamic> toJson() => {
        'frame_id': frameId,
        'timestamp': timestamp,
        'face_detected': faceDetected,
        'face_bbox': faceBbox != null
            ? {
                'x': faceBbox!.left.round(),
                'y': faceBbox!.top.round(),
                'width': faceBbox!.width.round(),
                'height': faceBbox!.height.round(),
              }
            : null,
        'landmarks': landmarks
            ?.map((p) => {
                  'x': double.parse(p.dx.toStringAsFixed(4)),
                  'y': double.parse(p.dy.toStringAsFixed(4)),
                })
            .toList(),
        'roi': roi != null
            ? {
                'forehead': _r(roi!.forehead),
                'left_cheek': _r(roi!.leftCheek),
                'right_cheek': _r(roi!.rightCheek),
              }
            : null,
        'frame_quality': frameQuality != null
            ? {
                'brightness': double.parse(
                    frameQuality!.brightness.toStringAsFixed(2)),
                'blur_score': double.parse(
                    frameQuality!.blurScore.toStringAsFixed(2)),
                'face_stability': double.parse(
                    frameQuality!.faceStability.toStringAsFixed(2)),
              }
            : null,
      };

  String toJsonString() => jsonEncode(toJson());

  static List<int> _r(Rect r) =>
      [r.left.round(), r.top.round(), r.right.round(), r.bottom.round()];
}

class FramePayloadBuilder {
  int _nextFrameId = 0;

  FramePayload build({
    required Face? face,
    required FaceRois? roi,
    required FrameQuality? quality,
    required Size imageSize,
  }) {
    final id = _nextFrameId++;
    final ts = DateTime.now().millisecondsSinceEpoch ~/ 1000;

    if (face == null) {
      return FramePayload(
        frameId: id,
        timestamp: ts,
        faceDetected: false,
      );
    }

    final lms = <Offset>[];
    for (final lm in face.landmarks.values) {
      if (lm == null) continue;
      lms.add(Offset(
        lm.position.x / imageSize.width,
        lm.position.y / imageSize.height,
      ));
    }

    return FramePayload(
      frameId: id,
      timestamp: ts,
      faceDetected: true,
      faceBbox: face.boundingBox,
      landmarks: lms,
      roi: roi,
      frameQuality: quality,
    );
  }
}
