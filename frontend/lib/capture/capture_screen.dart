import 'dart:async';
import 'dart:ui' as ui;

import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';
import 'package:permission_handler/permission_handler.dart';

import 'behavioral_tracker.dart';
import 'challenge_system.dart';
import 'face_overlay_painter.dart';
import 'face_tracker.dart';
import 'frame_quality.dart';
import 'roi_selector.dart';
import 'signal_buffer.dart';
import 'signal_extractor.dart';
import '../screens/result_screen.dart';
import '../services/api_service.dart';

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

  // Phase 2-3: face detection + ROI
  final FaceTracker _faceTracker = FaceTracker();
  final RoiSelector _roiSelector = const RoiSelector();
  List<Face> _faces = const [];
  List<FaceRois> _rois = const [];
  ui.Size _imageSize = ui.Size.zero;

  // Phase 4: frame quality
  final FrameQualityAnalyzer _qualityAnalyzer = FrameQualityAnalyzer();
  FrameQuality _quality = FrameQuality.empty;

  // Signal extraction + API
  final SignalExtractor _signalExtractor = SignalExtractor();
  final SignalBuffer _signalBuffer = SignalBuffer();
  final ApiService _apiService = ApiService();
  Timer? _signalTimer;

  // Phase 7: behavioral signals
  final BehavioralTracker _behavioralTracker = BehavioralTracker();
  BehavioralSignals _behavior = BehavioralSignals.empty;

  // Phase 8: challenge-response
  final ChallengeSystem _challengeSystem = ChallengeSystem();
  Timer? _challengeTimer;

  // FPS counter
  int _framesThisSecond = 0;
  int _fps = 0;
  Timer? _fpsTimer;

  // Frame throttling
  static const int _detectEveryNth = 4;
  int _frameCounter = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _initFuture = _bootstrap();
  }

  Future<void> _bootstrap() async {
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
      ResolutionPreset.high,
      enableAudio: false,
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

    // Start backend session + signal send timer.
    _apiService.startSession().then((sessionId) {
      if (!mounted) return;
      if (sessionId != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Connected to Backend successfully!'),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 3),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('❌ Cannot reach backend! Check connection.'),
            backgroundColor: Colors.red,
            duration: Duration(seconds: 5),
          ),
        );
      }
    });
    _signalTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      _sendSignalBatch();
    });

    setState(() => _controller = controller);
  }

  Future<void> _onFrame(CameraImage image) async {
    _framesThisSecond++;

    final camera = _camera;
    if (camera == null) return;

    // Green signal extraction runs on EVERY frame (lightweight).
    // Uses the last known forehead ROI.
    if (_rois.isNotEmpty) {
      final green = _signalExtractor.extractGreen(
        image,
        _rois.first.forehead,
        camera.sensorOrientation,
      );
      if (green != null) {
        _signalBuffer.add(green);
      }
    }

    // Face detection stays throttled (heavy ML Kit call).
    _frameCounter++;
    if (_frameCounter % _detectEveryNth != 0) return;

    final faces = await _faceTracker.process(image, camera);
    if (faces == null) return;
    if (!mounted) return;

    final rot = camera.sensorOrientation;
    final swap = rot == 90 || rot == 270;
    final w = swap ? image.height : image.width;
    final h = swap ? image.width : image.height;

    // Single face filter
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

    final quality = filtered.isNotEmpty
        ? _qualityAnalyzer.analyze(image, filtered.first.boundingBox)
        : FrameQuality.empty;

    // Phase 7: behavioral signals
    final behavior = filtered.isNotEmpty
        ? _behavioralTracker.update(filtered.first)
        : BehavioralSignals.empty;

    // Phase 8: feed challenge system
    _challengeSystem.updateFromBehavior(behavior);

    final imgSize = ui.Size(w.toDouble(), h.toDouble());

    setState(() {
      _faces = filtered;
      _rois = rois;
      _quality = quality;
      _behavior = behavior;
      _imageSize = imgSize;
    });
  }

  // --- Signal sending ---

  Future<void> _sendSignalBatch() async {
    final batch = _signalBuffer.drain();
    if (batch.isEmpty) return;
    await _apiService.sendSignal(signal: batch, fps: _fps);
  }

  // --- Challenge controls ---

  void _startChallenge() {
    _challengeSystem.startAll();
    _challengeTimer?.cancel();
    _challengeTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() {
        if (_challengeSystem.state == ChallengeState.countdown) {
          _challengeSystem.tickCountdown();
        } else if (_challengeSystem.state == ChallengeState.active) {
          _challengeSystem.tickActive();
        }
      });
    });
    setState(() {});
  }

  void _onChallengeStepTap() {
    final cs = _challengeSystem;

    if (cs.state == ChallengeState.allDone) {
      _challengeTimer?.cancel();
      _navigateToProcessing();
      return;
    }

    if (cs.state == ChallengeState.success ||
        cs.state == ChallengeState.failed) {
      cs.next();
      if (cs.state == ChallengeState.allDone) {
        _challengeTimer?.cancel();
        _navigateToProcessing();
      } else {
        setState(() {});
      }
    }
  }

  void _navigateToProcessing() {
    final result = VerificationResult(
      challengesPassed: _challengeSystem.passed,
      challengesTotal: _challengeSystem.totalChallenges,
      signalSamples: _signalBuffer.totalAdded,
    );
    Navigator.pushReplacementNamed(
      context,
      '/processing',
      arguments: result,
    );
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final c = _controller;
    if (c == null || !c.value.isInitialized) return;
    if (kIsWeb) return;

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
    _signalTimer?.cancel();
    _challengeTimer?.cancel();
    _controller?.dispose();
    _faceTracker.dispose();
    _apiService.dispose();
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

            final mq = MediaQuery.of(context);
            final previewSize =
                controller.value.previewSize ?? const ui.Size(0, 0);
            final cameraAspect = previewSize.height == 0
                ? 1.0
                : previewSize.height / previewSize.width;
            final screenAspect = mq.size.width / mq.size.height;

            return Stack(
              fit: StackFit.expand,
              children: [
                // Camera preview + overlays
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

                // Left debug badges
                Positioned(
                  top: 16,
                  left: 16,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _DebugBadge(text: 'FPS  $_fps'),
                      const SizedBox(height: 6),
                      _DebugBadge(
                          text:
                              'BR  ${_quality.brightness.toStringAsFixed(2)}'),
                      const SizedBox(height: 6),
                      _DebugBadge(
                          text:
                              'BL  ${_quality.blurScore.toStringAsFixed(2)}'),
                      const SizedBox(height: 6),
                      _DebugBadge(
                          text:
                              'ST  ${_quality.faceStability.toStringAsFixed(2)}'),
                      const SizedBox(height: 12),
                      _DebugBadge(text: 'BLINKS  ${_behavior.blinkCount}'),
                      const SizedBox(height: 6),
                      _DebugBadge(text: 'HEAD  ${_behavior.headDirection}'),
                    ],
                  ),
                ),

                // Right debug badges
                Positioned(
                  top: 16,
                  right: 16,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      _DebugBadge(text: 'FACES  ${_faces.length}'),
                      const SizedBox(height: 6),
                      _DebugBadge(text: 'ROI  ${_rois.length * 3}'),
                      const SizedBox(height: 6),
                      _DebugBadge(
                        text: 'SIG  ${_signalBuffer.totalAdded}',
                      ),
                    ],
                  ),
                ),

                // Challenge overlay
                if (_challengeSystem.state != ChallengeState.idle)
                  GestureDetector(
                    onTap: _onChallengeStepTap,
                    child: _buildChallengeOverlay(),
                  ),

                // Bottom: challenge button or phase label
                Positioned(
                  bottom: 24,
                  left: 0,
                  right: 0,
                  child: Center(
                    child: _challengeSystem.state == ChallengeState.idle
                        ? GestureDetector(
                            onTap: _startChallenge,
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 24, vertical: 12),
                              decoration: BoxDecoration(
                                color: const Color(0xFF7C4DFF),
                                borderRadius: BorderRadius.circular(30),
                              ),
                              child: const Text(
                                'START CHALLENGE',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          )
                        : const SizedBox.shrink(),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildChallengeOverlay() {
    final cs = _challengeSystem;
    final challenge = cs.currentChallenge;

    Color overlayColor;
    String mainText;
    String subText;
    String? bottomText;

    final progress =
        'Challenge ${cs.currentIndex + 1} of ${cs.totalChallenges}';

    switch (cs.state) {
      case ChallengeState.countdown:
        overlayColor = Colors.black54;
        mainText = '${cs.countdownRemaining}';
        subText = 'Get ready...\n$progress';
      case ChallengeState.active:
        overlayColor = Colors.black38;
        mainText = challenge?.instruction ?? '';
        subText =
            '${cs.timeRemaining}s  ·  ${cs.actionCount}/${challenge?.requiredCount ?? 0}\n$progress';
      case ChallengeState.success:
        overlayColor = const Color(0x9900C853);
        mainText = 'PASSED';
        subText = challenge?.instruction ?? '';
        bottomText = 'Tap for next challenge';
      case ChallengeState.failed:
        overlayColor = const Color(0x99D50000);
        mainText = 'FAILED';
        subText = 'Time ran out';
        bottomText = 'Tap for next challenge';
      case ChallengeState.allDone:
        overlayColor = Colors.black87;
        mainText = '${cs.passed}/${cs.totalChallenges}';
        subText =
            'Challenges completed\nScore: ${cs.scorePercent}%';
        bottomText = 'Tap to see results';
      case ChallengeState.idle:
        return const SizedBox.shrink();
    }

    return Container(
      color: overlayColor,
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Result dots for completed challenges
            if (cs.results.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(bottom: 20),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(cs.totalChallenges, (i) {
                    if (i >= cs.results.length) {
                      return const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 6),
                        child: Icon(Icons.circle_outlined,
                            color: Colors.white30, size: 16),
                      );
                    }
                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 6),
                      child: Icon(
                        cs.results[i].passed
                            ? Icons.check_circle
                            : Icons.cancel,
                        color: cs.results[i].passed
                            ? const Color(0xFF00C853)
                            : const Color(0xFFD50000),
                        size: 20,
                      ),
                    );
                  }),
                ),
              ),
            Text(
              mainText,
              style: TextStyle(
                color: Colors.white,
                fontSize: cs.state == ChallengeState.countdown ? 72 : 36,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            Text(
              subText,
              style: const TextStyle(
                  color: Colors.white70, fontSize: 16, height: 1.4),
              textAlign: TextAlign.center,
            ),
            if (bottomText != null) ...[
              const SizedBox(height: 24),
              Text(
                bottomText,
                style: const TextStyle(color: Colors.white54, fontSize: 14),
              ),
            ],
          ],
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
