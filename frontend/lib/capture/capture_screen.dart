import 'dart:async';
import 'dart:ui' as ui;

import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
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
            content: Text('Ã¢Å“â€¦ Connected to Backend successfully!'),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 3),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Ã¢ÂÅ’ Cannot reach backend! Check connection.'),
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
    return ('Good Ã¢â‚¬â€ capturing signal', AppTheme.success);
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
            content: Text('Ã¢Å¡Â Ã¯Â¸Â Signal send failing Ã¢â‚¬â€ check connection'),
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
          content: Text('Ã°Å¸â€œÂ¤ Sending behavioral & challenge data...'),
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
    return Center(child: Padding(
      padding: const EdgeInsets.all(AppTheme.s32),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Container(
          width: 72, height: 72,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: AppTheme.error.withValues(alpha: 0.1),
          ),
          child: const Icon(Icons.error_outline, color: AppTheme.error, size: 36),
        ),
        const SizedBox(height: AppTheme.s16),
        Text(_error!, style: AppTheme.body, textAlign: TextAlign.center),
        const SizedBox(height: AppTheme.s24),
        GestureDetector(
          onTap: () => Navigator.pushNamedAndRemoveUntil(context, '/', (r) => false),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            decoration: BoxDecoration(
              color: AppTheme.primary,
              borderRadius: BorderRadius.circular(AppTheme.r24),
            ),
            child: Text('GO HOME', style: AppTheme.button.copyWith(fontSize: 13)),
          ),
        ),
      ]),
    ));
  }

  // ════════════════════════════════════════════════
  //  PHASE 1: ALIGNMENT
  // ════════════════════════════════════════════════
  Widget _buildAlignmentOverlay() {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter, end: Alignment.bottomCenter,
          colors: [
            AppTheme.background.withValues(alpha: 0.3),
            AppTheme.background.withValues(alpha: 0.85),
          ],
        ),
      ),
      child: SafeArea(child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: AppTheme.s32),
        child: Column(children: [
          const Spacer(),
          PulseRing(
            size: 200,
            color: _faceDetectedForAlignment ? AppTheme.success : AppTheme.primary,
            child: Container(
              width: 200, height: 260,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(100),
              ),
              child: Center(child: Icon(
                _faceDetectedForAlignment ? Icons.check_circle_outline : Icons.face,
                size: 56,
                color: (_faceDetectedForAlignment ? AppTheme.success : AppTheme.primary)
                    .withValues(alpha: 0.7),
              )),
            ),
          ),
          const SizedBox(height: AppTheme.s32),
          Text('Position your face', style: AppTheme.heading2),
          const SizedBox(height: AppTheme.s24),
          _guideRow(Icons.center_focus_strong, 'Keep your face inside the frame'),
          const SizedBox(height: AppTheme.s8),
          _guideRow(Icons.light_mode, 'Ensure good lighting'),
          const SizedBox(height: AppTheme.s8),
          _guideRow(Icons.phone_android, 'Hold your phone steady'),
          const SizedBox(height: AppTheme.s16),
          // Live feedback pill
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 250),
            child: Container(
              key: ValueKey(_feedbackMessage),
              padding: const EdgeInsets.symmetric(horizontal: AppTheme.s16, vertical: AppTheme.s8),
              decoration: BoxDecoration(
                color: _feedbackColor.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(AppTheme.r24),
                border: Border.all(color: _feedbackColor.withValues(alpha: 0.25)),
              ),
              child: Text(
                _feedbackMessage.isEmpty ? 'Waiting for face...' : _feedbackMessage,
                style: AppTheme.bodySmall.copyWith(color: _feedbackColor, fontWeight: FontWeight.w600),
              ),
            ),
          ),
          const Spacer(),
          SizedBox(width: double.infinity, height: 52, child: AnimatedOpacity(
            opacity: _faceDetectedForAlignment ? 1.0 : 0.3,
            duration: const Duration(milliseconds: 300),
            child: GestureDetector(
              onTap: _faceDetectedForAlignment ? () {
                HapticFeedback.mediumImpact();
                setState(() => _phase = CapturePhase.signalCollection);
              } : null,
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(AppTheme.r32),
                  gradient: _faceDetectedForAlignment ? AppTheme.primaryGradient : null,
                  color: _faceDetectedForAlignment ? null : AppTheme.surface,
                ),
                alignment: Alignment.center,
                child: Text(
                  _faceDetectedForAlignment ? 'CONTINUE' : 'DETECTING FACE...',
                  style: AppTheme.button.copyWith(fontSize: 14),
                ),
              ),
            ),
          )),
          const SizedBox(height: AppTheme.s32),
        ]),
      )),
    );
  }

  Widget _guideRow(IconData icon, String text) {
    return Row(children: [
      Icon(icon, color: AppTheme.accent, size: 20),
      const SizedBox(width: AppTheme.s12),
      Text(text, style: AppTheme.bodySmall),
    ]);
  }

  // ════════════════════════════════════════════════
  //  PHASE 2: SIGNAL COLLECTION
  // ════════════════════════════════════════════════
  Widget _buildSignalHUD(double progress) {
    return Positioned(
      bottom: 0, left: 0, right: 0,
      child: Container(
        padding: const EdgeInsets.fromLTRB(AppTheme.s24, AppTheme.s24, AppTheme.s24, AppTheme.s32),
        decoration: BoxDecoration(gradient: AppTheme.fadeToBlack),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 300),
            child: Container(
              key: ValueKey(_feedbackMessage),
              padding: const EdgeInsets.symmetric(horizontal: AppTheme.s16, vertical: AppTheme.s8),
              decoration: BoxDecoration(
                color: _feedbackColor.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(AppTheme.r24),
                border: Border.all(color: _feedbackColor.withValues(alpha: 0.25)),
              ),
              child: Text(_feedbackMessage,
                  style: AppTheme.bodySmall.copyWith(color: _feedbackColor, fontWeight: FontWeight.w600)),
            ),
          ),
          const SizedBox(height: AppTheme.s16),
          Text(
            'Hold still while we analyze your heartbeat',
            style: AppTheme.bodySmall.copyWith(color: AppTheme.textPrimary),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppTheme.s8),
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Text('${(progress * 100).toInt()}%',
                style: AppTheme.mono.copyWith(fontSize: 12)),
            Text(progress >= 1.0 ? '✓ Ready' : 'Analyzing...',
                style: AppTheme.bodySmall.copyWith(
                  color: progress >= 1.0 ? AppTheme.success : AppTheme.textMuted,
                  fontWeight: FontWeight.w600,
                )),
          ]),
          const SizedBox(height: AppTheme.s8),
          ShimmerBar(
            value: progress,
            height: 6,
            color: progress >= 1.0 ? AppTheme.success : AppTheme.primary,
          ),
          const SizedBox(height: AppTheme.s20),
          SizedBox(width: double.infinity, height: 52, child: AnimatedOpacity(
            opacity: progress >= 1.0 ? 1.0 : 0.3,
            duration: const Duration(milliseconds: 300),
            child: GestureDetector(
              onTap: progress >= 1.0 ? () {
                HapticFeedback.mediumImpact();
                setState(() => _phase = CapturePhase.challenge);
                _startChallenge();
              } : null,
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(AppTheme.r32),
                  gradient: progress >= 1.0 ? AppTheme.primaryGradient : null,
                  color: progress >= 1.0 ? null : AppTheme.surface,
                  boxShadow: progress >= 1.0 ? [BoxShadow(
                    color: AppTheme.primary.withValues(alpha: 0.3),
                    blurRadius: 16, offset: const Offset(0, 4),
                  )] : null,
                ),
                alignment: Alignment.center,
                child: Text(
                  progress >= 1.0 ? 'CONTINUE' : 'ANALYZING...',
                  style: AppTheme.button.copyWith(fontSize: 14),
                ),
              ),
            ),
          )),
        ]),
      ),
    );
  }

  // ════════════════════════════════════════════════
  //  PHASE 3: CHALLENGE
  // ════════════════════════════════════════════════
  Widget _buildChallengeOverlay() {
    final cs = _challengeSystem;
    final ch = cs.currentChallenge;

    Color overlayColor;
    String mainText, subText;
    String? bottomText;

    final prog = 'Step ${cs.currentIndex + 1} of ${cs.totalChallenges}';

    switch (cs.state) {
      case ChallengeState.countdown:
        overlayColor = AppTheme.background.withValues(alpha: 0.85);
        mainText = '${cs.countdownRemaining}';
        subText = 'Get ready...\n$prog';
      case ChallengeState.active:
        overlayColor = AppTheme.background.withValues(alpha: 0.6);
        mainText = ch?.instruction ?? '';
        subText = '${cs.timeRemaining}s  ·  ${cs.actionCount}/${ch?.requiredCount ?? 0}\n$prog';
      case ChallengeState.success:
        overlayColor = AppTheme.success.withValues(alpha: 0.2);
        mainText = '✔ PASSED';
        subText = ch?.instruction ?? '';
        bottomText = 'Tap for next';
      case ChallengeState.failed:
        overlayColor = AppTheme.error.withValues(alpha: 0.2);
        mainText = '✖ FAILED';
        subText = 'Time ran out';
        bottomText = 'Tap for next';
      case ChallengeState.allDone:
        overlayColor = AppTheme.background.withValues(alpha: 0.9);
        mainText = '${cs.passed}/${cs.totalChallenges}';
        subText = 'Verification steps completed';
        bottomText = 'Tap to view your result';
      case ChallengeState.idle:
        return const SizedBox.shrink();
    }

    return Container(
      color: overlayColor,
      child: Center(child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (cs.results.isNotEmpty) Padding(
            padding: const EdgeInsets.only(bottom: AppTheme.s24),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(cs.totalChallenges, (i) {
                if (i >= cs.results.length) {
                  return const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 6),
                    child: Icon(Icons.circle_outlined, color: AppTheme.textMuted, size: 16),
                  );
                }
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 6),
                  child: Icon(
                    cs.results[i].passed ? Icons.check_circle : Icons.cancel,
                    color: cs.results[i].passed ? AppTheme.success : AppTheme.error,
                    size: 22,
                  ),
                );
              }),
            ),
          ),
          if (cs.state == ChallengeState.active)
            Padding(
              padding: const EdgeInsets.only(bottom: AppTheme.s16),
              child: Icon(Icons.radio_button_on, color: AppTheme.primary, size: 28),
            ),
          Text(mainText, style: GoogleFonts.outfit(
            color: AppTheme.textPrimary,
            fontSize: cs.state == ChallengeState.countdown ? 72 : 30,
            fontWeight: FontWeight.w800,
          ), textAlign: TextAlign.center),
          const SizedBox(height: AppTheme.s12),
          Text(subText, style: AppTheme.body.copyWith(height: 1.4),
              textAlign: TextAlign.center),
          if (bottomText != null) ...[
            const SizedBox(height: AppTheme.s24),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              decoration: BoxDecoration(
                color: AppTheme.surface.withValues(alpha: 0.5),
                borderRadius: BorderRadius.circular(AppTheme.r24),
              ),
              child: Text(bottomText,
                  style: AppTheme.bodySmall.copyWith(
                      color: AppTheme.accent, fontWeight: FontWeight.w600)),
            ),
          ],
        ],
      )),
    );
  }
}
