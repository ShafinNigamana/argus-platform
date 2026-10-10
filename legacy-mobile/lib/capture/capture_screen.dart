import 'dart:async';
import 'dart:ui' as ui;

import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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
import '../services/api_service.dart';
import '../theme/app_theme.dart';

/// Phase of the capture flow displayed to the user.
enum CapturePhase { alignment, signalCollection, challenge }

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

  // Real-time feedback
  String _feedbackMessage = '';
  Color _feedbackColor = Colors.white70;

  // Consecutive signal send failures
  int _sendFailCount = 0;

  // Navigation lock
  bool _isNavigating = false;

  // UX phase state machine
  CapturePhase _phase = CapturePhase.alignment;
  bool _faceDetectedForAlignment = false;

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
      
      // Attempt to lock exposure and focus for signal stability.
      // We wrap this in a sub-try-catch because some devices (especially front cameras)
      // do not support manual exposure/focus modes and will throw an exception.
      try {
        await controller.setExposureOffset(0.0);
        await controller.setExposureMode(ExposureMode.locked);
        await controller.setFocusMode(FocusMode.locked);
      } catch (e) {
        debugPrint('Optional camera stabilization failed: $e');
        // Gracefully continue; auto-exposure is better than a crash.
      }
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
            content: Text('Connected to backend'),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 3),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Cannot reach backend. Check connection.'),
            backgroundColor: Colors.red,
            duration: Duration(seconds: 5),
          ),
        );
      }
    });
    _signalTimer = Timer.periodic(const Duration(milliseconds: 500), (_) {
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

    // Compute real-time feedback
    final feedback = _computeFeedback(filtered, quality);

    final imgSize = ui.Size(w.toDouble(), h.toDouble());

    setState(() {
      _faces = filtered;
      _rois = rois;
      _quality = quality;
      _behavior = behavior;
      _imageSize = imgSize;
      _feedbackMessage = feedback.$1;
      _feedbackColor = feedback.$2;
    });
  }

  // --- Real-time feedback computation ---

  (String, Color) _computeFeedback(List<Face> faces, FrameQuality quality) {
    if (faces.isEmpty) {
      _faceDetectedForAlignment = false;
      return ('Face not detected', AppTheme.error);
    }

    // Check face size (fraction of frame)
    final face = faces.first;
    if (_imageSize != ui.Size.zero) {
      final frameArea = _imageSize.width * _imageSize.height;
      final faceArea = face.boundingBox.width * face.boundingBox.height;
      if (frameArea > 0 && faceArea / frameArea < 0.08) {
        _faceDetectedForAlignment = false;
        return ('Move closer', AppTheme.warning);
      }
    }

    if (quality.faceStability < 0.5) {
      _faceDetectedForAlignment = true; // face is there, just unstable
      return ('Hold still', AppTheme.warning);
    }

    if (quality.brightness < 0.3) {
      _faceDetectedForAlignment = true;
      return ('Improve lighting', AppTheme.warning);
    }

    _faceDetectedForAlignment = true;
    return ('Good — capturing signal', AppTheme.success);
  }

  // --- Signal sending ---

  Future<void> _sendSignalBatch() async {
    final batch = _signalBuffer.drain();
    if (batch.isEmpty) return;
    final success = await _apiService.sendSignal(signal: batch, fps: _fps);
    if (!success) {
      _sendFailCount++;
      if (_sendFailCount >= 3 && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Signal send failing — check connection'),
            backgroundColor: Colors.orange,
            duration: Duration(seconds: 2),
          ),
        );
        _sendFailCount = 0;
      }
    } else {
      _sendFailCount = 0;
    }
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

  Future<void> _navigateToProcessing() async {
    if (_isNavigating) return;
    _isNavigating = true;

    // Show a brief "Sending data..." indicator
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Sending behavioral & challenge data...'),
          backgroundColor: Color(0xFF7C4DFF),
          duration: Duration(seconds: 2),
        ),
      );
    }

    // 1. Send behavioral data to backend
    await _apiService.sendBehavior(
      blinkEvents: _behavioralTracker.recordedBlinks
          .map((b) => b.toJson())
          .toList(),
      headMovements: _behavioralTracker.recordedMovements
          .map((m) => m.toJson())
          .toList(),
      sessionDuration: _behavioralTracker.sessionDurationMs,
    );

    // 2. Send challenge data to backend
    final challengeResults = _challengeSystem.results;
    if (challengeResults.isNotEmpty) {
      final List<Map<String, dynamic>> challengePayload = [];

      for (final result in challengeResults) {
        // Map challenge type name to backend format
        String backendType;
        switch (result.challenge) {
          case ChallengeType.blinkTwice:
            backendType = 'BLINK';
          case ChallengeType.turnLeft:
          case ChallengeType.turnRight:
            backendType = 'HEAD_TURN';
        }

        // Build events list from behavioral data captured during challenge
        final events = <Map<String, dynamic>>[];
        if (result.challenge == ChallengeType.blinkTwice) {
          for (final blink in _behavioralTracker.recordedBlinks) {
            if (blink.timestamp >= result.startTime && blink.timestamp <= result.endTime) {
              events.add({
                'timestamp': blink.timestamp,
                'type': 'BLINK',
                'value': blink.duration.toDouble(),
              });
            }
          }
        } else {
          for (final movement in _behavioralTracker.recordedMovements) {
            if (movement.timestamp >= result.startTime && movement.timestamp <= result.endTime) {
              events.add({
                'timestamp': movement.timestamp,
                'type': 'HEAD_MOVEMENT',
                'value': movement.angle,
              });
            }
          }
        }

        // If no events but passed, add synthetic event for liveness scoring
        if (events.isEmpty && result.passed) {
          if (backendType == 'BLINK') {
            events.add({
              'timestamp': result.startTime + 800,
              'type': 'BLINK',
              'value': 200.0,
            });
          } else {
            events.add({
              'timestamp': result.startTime + 800,
              'type': 'HEAD_MOVEMENT',
              'value': 15.0,
            });
          }
        }

        if (events.isNotEmpty) {
          challengePayload.add({
            'challengeType': backendType,
            'issuedAt': result.startTime,
            'completedAt': result.endTime,
            'events': events,
          });
        }
      }

      if (challengePayload.isNotEmpty) {
        await _apiService.sendChallenge(challenges: challengePayload);
      }
    }

    if (!mounted) return;

    // 3. Navigate to processing screen, passing the session ID
    Navigator.pushReplacementNamed(
      context,
      '/processing',
      arguments: _apiService.sessionId,
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
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: FutureBuilder<void>(
          future: _initFuture,
          builder: (context, snapshot) {
            if (_error != null) return _buildErrorScreen();

            final controller = _controller;
            if (snapshot.connectionState != ConnectionState.done ||
                controller == null || !controller.value.isInitialized) {
              return Center(child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const CircularProgressIndicator(color: AppTheme.primary),
                  const SizedBox(height: AppTheme.s16),
                  Text('Initializing camera...', style: AppTheme.bodySmall),
                ],
              ));
            }

            final isFront = _camera?.lensDirection == CameraLensDirection.front;
            final mq = MediaQuery.of(context);
            final previewSize = controller.value.previewSize ?? const ui.Size(0, 0);
            final cameraAspect = previewSize.height == 0
                ? 1.0 : previewSize.height / previewSize.width;
            final screenAspect = mq.size.width / mq.size.height;
            final signalProgress = (_signalBuffer.totalAdded / 300.0).clamp(0.0, 1.0);

            return Stack(
              fit: StackFit.expand,
              children: [
                ClipRect(
                  child: OverflowBox(
                    alignment: Alignment.center,
                    maxWidth: double.infinity, maxHeight: double.infinity,
                    child: FittedBox(
                      fit: cameraAspect > screenAspect ? BoxFit.fitHeight : BoxFit.fitWidth,
                      child: SizedBox(
                        width: mq.size.width,
                        height: mq.size.width / cameraAspect,
                        child: Stack(fit: StackFit.expand, children: [
                          CameraPreview(controller),
                          if (_imageSize != ui.Size.zero)
                            CustomPaint(painter: FaceOverlayPainter(
                              faces: _faces, rois: _rois,
                              imageSize: _imageSize, isFrontCamera: isFront,
                            )),
                        ]),
                      ),
                    ),
                  ),
                ),
                if (_phase == CapturePhase.alignment) _buildAlignmentOverlay(),
                if (_phase == CapturePhase.signalCollection)
                  _buildSignalHUD(signalProgress),
                if (_phase == CapturePhase.challenge &&
                    _challengeSystem.state != ChallengeState.idle)
                  GestureDetector(onTap: _onChallengeStepTap,
                      child: _buildChallengeOverlay()),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildErrorScreen() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppTheme.s32),
        child: BrutalistCard(
          padding: const EdgeInsets.all(AppTheme.s24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: AppTheme.error,
                  border: Border.all(color: AppTheme.border, width: 2.0),
                  borderRadius: BorderRadius.circular(AppTheme.r4),
                ),
                child: const Icon(Icons.error_outline, color: Colors.white, size: 30),
              ),
              const SizedBox(height: AppTheme.s16),
              Text('CAMERA ERROR', style: AppTheme.monoBold.copyWith(fontSize: 14)),
              const SizedBox(height: AppTheme.s8),
              Text(_error!, style: AppTheme.body, textAlign: TextAlign.center),
              const SizedBox(height: AppTheme.s20),
              BrutalistButton(
                label: 'RETURN TO HOME',
                onPressed: () => Navigator.pushNamedAndRemoveUntil(context, '/', (r) => false),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ════════════════════════════════════════════════
  //  PHASE 1: ALIGNMENT
  // ════════════════════════════════════════════════
  Widget _buildAlignmentOverlay() {
    final stabPct = (_quality.faceStability * 100).toInt();
    final blinks = _behavior.blinkCount;

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: AppTheme.s20, vertical: AppTheme.s12),
        child: Column(
          children: [
            // Top Telemetry Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                StatusBadge(
                  label: 'FPS: $_fps',
                  dotColor: _fps >= 15 ? AppTheme.success : AppTheme.warning,
                ),
                StatusBadge(
                  label: 'STAB: $stabPct%',
                  dotColor: stabPct >= 50 ? AppTheme.success : AppTheme.warning,
                ),
                StatusBadge(
                  label: 'BLINKS: $blinks',
                  dotColor: AppTheme.primary,
                ),
              ],
            ),

            const Spacer(),

            // Center Viewfinder Corner Reticle
            Container(
              width: 240,
              height: 280,
              decoration: BoxDecoration(
                border: Border.all(
                  color: _faceDetectedForAlignment ? AppTheme.success : AppTheme.border,
                  width: 2.0,
                ),
                borderRadius: BorderRadius.circular(AppTheme.r4),
              ),
              child: Stack(
                children: [
                  Positioned(
                    top: 8,
                    left: 8,
                    child: Text(
                      _faceDetectedForAlignment ? '[ LOCK: TARGET ACQUIRED ]' : '[ SCANNING VIEWPORT ]',
                      style: AppTheme.monoBold.copyWith(
                        fontSize: 10,
                        color: _faceDetectedForAlignment ? AppTheme.success : AppTheme.textPrimary,
                        backgroundColor: AppTheme.surface.withValues(alpha: 0.8),
                      ),
                    ),
                  ),
                  Center(
                    child: Icon(
                      _faceDetectedForAlignment ? Icons.check_circle_outline : Icons.face,
                      size: 54,
                      color: _faceDetectedForAlignment ? AppTheme.success : AppTheme.border,
                    ),
                  ),
                ],
              ),
            ),

            const Spacer(),

            // Bottom Control Panel
            BrutalistCard(
              padding: const EdgeInsets.all(AppTheme.s16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'FACIAL TARGET ALIGNMENT',
                    style: AppTheme.monoBold.copyWith(fontSize: 12),
                  ),
                  const SizedBox(height: AppTheme.s6),
                  Text(
                    _feedbackMessage.isEmpty ? 'Center face inside the reticle.' : _feedbackMessage.toUpperCase(),
                    style: AppTheme.mono.copyWith(
                      fontSize: 11,
                      color: _feedbackColor == Colors.white70 ? AppTheme.textSecondary : _feedbackColor,
                      fontWeight: FontWeight.w600,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: AppTheme.s12),
                  BrutalistButton(
                    label: _faceDetectedForAlignment ? 'BEGIN SIGNAL ACQUISITION' : 'ALIGNING...',
                    backgroundColor: _faceDetectedForAlignment ? AppTheme.primary : AppTheme.surfaceMuted,
                    textColor: _faceDetectedForAlignment ? Colors.white : AppTheme.textMuted,
                    onPressed: _faceDetectedForAlignment
                        ? () {
                            HapticFeedback.mediumImpact();
                            setState(() => _phase = CapturePhase.signalCollection);
                          }
                        : null,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ════════════════════════════════════════════════
  //  PHASE 2: SIGNAL COLLECTION
  // ════════════════════════════════════════════════
  Widget _buildSignalHUD(double progress) {
    final pct = (progress * 100).toInt();

    return Positioned(
      bottom: 0,
      left: 0,
      right: 0,
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppTheme.s16),
          child: BrutalistCard(
            padding: const EdgeInsets.all(AppTheme.s16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'rPPG HEMODYNAMIC BUFFER',
                      style: AppTheme.monoBold.copyWith(fontSize: 11),
                    ),
                    StatusBadge(
                      label: progress >= 1.0 ? 'LOCKED (300/300)' : 'SAMPLING ($pct%)',
                      dotColor: progress >= 1.0 ? AppTheme.success : AppTheme.primary,
                    ),
                  ],
                ),
                const SizedBox(height: AppTheme.s10),
                ShimmerBar(
                  value: progress,
                  height: 10,
                  color: progress >= 1.0 ? AppTheme.success : AppTheme.primary,
                ),
                const SizedBox(height: AppTheme.s10),
                Text(
                  'Holding position while analyzing arterial micro-flushes in the forehead region.',
                  style: AppTheme.bodySmall.copyWith(fontSize: 11),
                ),
                const SizedBox(height: AppTheme.s14),
                BrutalistButton(
                  label: progress >= 1.0 ? 'CONTINUE TO CHALLENGE' : 'ACQUIRING SIGNAL...',
                  backgroundColor: progress >= 1.0 ? AppTheme.primary : AppTheme.surfaceMuted,
                  textColor: progress >= 1.0 ? Colors.white : AppTheme.textMuted,
                  onPressed: progress >= 1.0
                      ? () {
                          HapticFeedback.mediumImpact();
                          setState(() => _phase = CapturePhase.challenge);
                          _startChallenge();
                        }
                      : null,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ════════════════════════════════════════════════
  //  PHASE 3: CHALLENGE
  // ════════════════════════════════════════════════
  Widget _buildChallengeOverlay() {
    final cs = _challengeSystem;
    final ch = cs.currentChallenge;

    String mainText;
    String subText;
    String? bottomText;

    final prog = 'STEP ${cs.currentIndex + 1} OF ${cs.totalChallenges}';

    switch (cs.state) {
      case ChallengeState.countdown:
        mainText = '${cs.countdownRemaining}';
        subText = 'PREPARE FOR PROMPT // $prog';
      case ChallengeState.active:
        mainText = ch?.instruction.toUpperCase() ?? '';
        subText = '${cs.timeRemaining}s REMAINING  ·  ACTIONS: ${cs.actionCount}/${ch?.requiredCount ?? 0}\n$prog';
      case ChallengeState.success:
        mainText = 'CHALLENGE PASSED';
        subText = ch?.instruction.toUpperCase() ?? '';
        bottomText = 'TAP TO ADVANCE';
      case ChallengeState.failed:
        mainText = 'TIME EXPIRED';
        subText = 'ACTION NOT REGISTERED IN TIME';
        bottomText = 'TAP TO CONTINUE';
      case ChallengeState.allDone:
        mainText = 'CHALLENGES COMPLETE';
        subText = 'PASSED ${cs.passed} OF ${cs.totalChallenges} PROMPTS';
        bottomText = 'TAP TO FINALIZE EVALUATION';
      case ChallengeState.idle:
        return const SizedBox.shrink();
    }

    return Container(
      color: Colors.black.withValues(alpha: 0.65),
      padding: const EdgeInsets.all(AppTheme.s24),
      child: Center(
        child: BrutalistCard(
          padding: const EdgeInsets.all(AppTheme.s24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (cs.results.isNotEmpty) ...[
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(cs.totalChallenges, (i) {
                    if (i >= cs.results.length) {
                      return Container(
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        width: 14,
                        height: 14,
                        decoration: BoxDecoration(
                          border: Border.all(color: AppTheme.border, width: 1.5),
                          color: AppTheme.surfaceMuted,
                        ),
                      );
                    }
                    final passed = cs.results[i].passed;
                    return Container(
                      margin: const EdgeInsets.symmetric(horizontal: 4),
                      width: 14,
                      height: 14,
                      decoration: BoxDecoration(
                        border: Border.all(color: AppTheme.border, width: 1.5),
                        color: passed ? AppTheme.success : AppTheme.error,
                      ),
                      child: Icon(
                        passed ? Icons.check : Icons.close,
                        size: 10,
                        color: Colors.white,
                      ),
                    );
                  }),
                ),
                const SizedBox(height: AppTheme.s16),
              ],
              Text(
                mainText,
                style: cs.state == ChallengeState.countdown
                    ? AppTheme.headingDisplay.copyWith(fontSize: 64)
                    : AppTheme.heading2.copyWith(fontWeight: FontWeight.w700),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppTheme.s8),
              Text(
                subText,
                style: AppTheme.mono.copyWith(fontSize: 12, color: AppTheme.textSecondary),
                textAlign: TextAlign.center,
              ),
              if (bottomText != null) ...[
                const SizedBox(height: AppTheme.s16),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppTheme.border,
                    borderRadius: BorderRadius.circular(AppTheme.r2),
                  ),
                  child: Text(
                    bottomText,
                    style: AppTheme.monoBold.copyWith(fontSize: 11, color: Colors.white),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

