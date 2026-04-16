import 'dart:async';
import 'dart:ui' as ui;

import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';
import 'package:permission_handler/permission_handler.dart';

import 'face_overlay_painter.dart';
import 'face_tracker.dart';
import 'frame_quality.dart';
import 'roi_selector.dart';

class CaptureScreen extends StatefulWidget {
  const CaptureScreen({super.key});

  @override
  State<CaptureScreen> createState() => _CaptureScreenState();
}

class _CaptureScreenState extends State<CaptureScreen>
    with WidgetsBindingObserver {
  CameraController? _controller;
  CameraDescription? _camera;
  Future<void>? _initFuture;
  String? _error;

  final FaceTracker _faceTracker = FaceTracker();
  final RoiSelector _roiSelector = const RoiSelector();
  final FrameQualityAnalyzer _qualityAnalyzer = FrameQualityAnalyzer();
  List<Face> _faces = const [];
  List<FaceRois> _rois = const [];
  FrameQuality _quality = FrameQuality.empty;
  ui.Size _imageSize = ui.Size.zero;

  int _framesThisSecond = 0;
  int _fps = 0;
  Timer? _fpsTimer;

  // Frame throttling: only run face detection on every Nth frame so the
  // YUV→NV21 conversion + ML Kit call don't starve the camera delivery loop.
  static const int _detectEveryNth = 4;
  int _frameCounter = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _initFuture = _bootstrap();
  }

  Future<void> _bootstrap() async {
    // permission_handler doesn't support web — Chrome prompts on initialize().
    if (!kIsWeb) {
      final status = await Permission.camera.request();
      if (!status.isGranted) {
        setState(() => _error = 'Camera permission denied');
        return;
      }
    }

    final cameras = await availableCameras();
    if (cameras.isEmpty) {
      setState(() => _error = 'No cameras available on this device');
      return;
    }

    final front = cameras.firstWhere(
      (c) => c.lensDirection == CameraLensDirection.front,
      orElse: () => cameras.first,
    );
    _camera = front;

    final controller = CameraController(
      front,
      ResolutionPreset.high, // ~720p — Module 1 requires minimum 720p
      enableAudio: false,
      // ML Kit on Android wants NV21 specifically for byte-input face detect.
      // iOS uses BGRA8888. Web falls back to the plugin default.
      imageFormatGroup: kIsWeb
          ? ImageFormatGroup.unknown
          : (defaultTargetPlatform == TargetPlatform.iOS
              ? ImageFormatGroup.bgra8888
              : ImageFormatGroup.nv21),
    );

    try {
      await controller.initialize();
    } catch (e) {
      setState(() => _error = 'Camera init failed: $e');
      return;
    }
    if (!mounted) {
      await controller.dispose();
      return;
    }

    // startImageStream is not implemented on Flutter web. Skip it there so
    // the preview still renders; Phase 2+ frame processing will only run on
    // mobile/desktop targets.
    if (!kIsWeb) {
      try {
        await controller.startImageStream(_onFrame);
      } catch (e) {
        debugPrint('startImageStream unavailable: $e');
      }
    }

    _fpsTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() {
        _fps = _framesThisSecond;
        _framesThisSecond = 0;
      });
    });

    setState(() {
      _controller = controller;
    });
  }

  Future<void> _onFrame(CameraImage image) async {
    _framesThisSecond++;

    final camera = _camera;
    if (camera == null) return;

    // Throttle: skip most frames so the camera delivery loop stays at 24+ FPS.
    _frameCounter++;
    if (_frameCounter % _detectEveryNth != 0) return;

    final faces = await _faceTracker.process(image, camera);
    if (faces == null) return; // skipped (busy or unsupported platform)

    if (!mounted) return;

    // ML Kit returns face coordinates in the *rotated* (upright) image space,
    // not the raw landscape sensor space. For sensor rotations 90/270 we have
    // to swap width/height so the painter maps coordinates correctly.
    final rot = camera.sensorOrientation;
    final swap = rot == 90 || rot == 270;
    final w = swap ? image.height : image.width;
    final h = swap ? image.width : image.height;

    // Module 1 spec §4.4: single face only — pick the largest bbox.
    final List<Face> filtered;
    if (faces.length <= 1) {
      filtered = faces;
    } else {
      final sorted = [...faces]..sort((a, b) {
        final aArea = a.boundingBox.width * a.boundingBox.height;
        final bArea = b.boundingBox.width * b.boundingBox.height;
        return bArea.compareTo(aArea);
      });
      filtered = [sorted.first];
    }

    final rois = <FaceRois>[];
    for (final f in filtered) {
      final r = _roiSelector.select(f);
      if (r != null) rois.add(r);
    }

    // Compute frame quality metrics from the primary face.
    final quality = filtered.isNotEmpty
        ? _qualityAnalyzer.analyze(image, filtered.first.boundingBox)
        : FrameQuality.empty;

    setState(() {
      _faces = filtered;
      _rois = rois;
      _quality = quality;
      _imageSize = ui.Size(w.toDouble(), h.toDouble());
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final c = _controller;
    if (c == null || !c.value.isInitialized) return;

    if (kIsWeb) return; // no image stream on web

    if (state == AppLifecycleState.inactive ||
        state == AppLifecycleState.paused) {
      c.stopImageStream().catchError((_) {});
    } else if (state == AppLifecycleState.resumed) {
      if (!c.value.isStreamingImages) {
        c.startImageStream(_onFrame).catchError((_) {});
      }
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _fpsTimer?.cancel();
    _controller?.dispose();
    _faceTracker.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: FutureBuilder<void>(
          future: _initFuture,
          builder: (context, snapshot) {
            if (_error != null) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text(
                    _error!,
                    style: const TextStyle(color: Colors.white),
                    textAlign: TextAlign.center,
                  ),
                ),
              );
            }

            final controller = _controller;
            if (snapshot.connectionState != ConnectionState.done ||
                controller == null ||
                !controller.value.isInitialized) {
              return const Center(child: CircularProgressIndicator());
            }

            final isFront =
                _camera?.lensDirection == CameraLensDirection.front;
            final phaseLabel = kIsWeb
                ? 'Phase 1 · camera preview (web — no face detect)'
                : 'Phase 4 · face + ROI + quality';

            // Camera ships frames in landscape (e.g. 1280x720). On a portrait
            // phone we want them to fill the screen and crop to cover, with
            // the face overlay aligned to the same coordinate space.
            final mq = MediaQuery.of(context);
            final previewSize = controller.value.previewSize ?? const ui.Size(0, 0);
            // previewSize is in the camera's native (landscape) orientation.
            // Swap width/height so it represents what the user sees in portrait.
            final cameraAspect =
                previewSize.height == 0 ? 1.0 : previewSize.height / previewSize.width;
            final screenAspect = mq.size.width / mq.size.height;

            return Stack(
              fit: StackFit.expand,
              children: [
                ClipRect(
                  child: OverflowBox(
                    alignment: Alignment.center,
                    maxWidth: double.infinity,
                    maxHeight: double.infinity,
                    child: FittedBox(
                      fit: cameraAspect > screenAspect
                          ? BoxFit.fitHeight
                          : BoxFit.fitWidth,
                      child: SizedBox(
                        width: mq.size.width,
                        height: mq.size.width / cameraAspect,
                        child: Stack(
                          fit: StackFit.expand,
                          children: [
                            CameraPreview(controller),
                            if (_imageSize != ui.Size.zero)
                              CustomPaint(
                                painter: FaceOverlayPainter(
                                  faces: _faces,
                                  rois: _rois,
                                  imageSize: _imageSize,
                                  isFrontCamera: isFront,
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
                Positioned(
                  top: 16,
                  left: 16,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _DebugBadge(text: 'FPS  $_fps'),
                      const SizedBox(height: 6),
                      _DebugBadge(
                        text: 'BR  ${_quality.brightness.toStringAsFixed(2)}',
                      ),
                      const SizedBox(height: 6),
                      _DebugBadge(
                        text: 'BL  ${_quality.blurScore.toStringAsFixed(2)}',
                      ),
                      const SizedBox(height: 6),
                      _DebugBadge(
                        text: 'ST  ${_quality.faceStability.toStringAsFixed(2)}',
                      ),
                    ],
                  ),
                ),
                Positioned(
                  top: 16,
                  right: 16,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      _DebugBadge(text: 'FACES  ${_faces.length}'),
                      const SizedBox(height: 6),
                      _DebugBadge(text: 'ROI  ${_rois.length * 3}'),
                    ],
                  ),
                ),
                Positioned(
                  bottom: 24,
                  left: 0,
                  right: 0,
                  child: Center(
                    child: _DebugBadge(text: phaseLabel),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _DebugBadge extends StatelessWidget {
  final String text;
  const _DebugBadge({required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.55),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white24),
      ),
      child: Text(
        text,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 12,
          fontFeatures: [ui.FontFeature.tabularFigures()],
        ),
      ),
    );
  }
}
