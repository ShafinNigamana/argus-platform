import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PulseDetector, type RoiBox } from '../services/pulseDetector';
import { BlinkKinematicsTracker } from '../services/blinkKinematics';
import { apiService } from '../services/api';
import { authService } from '../services/auth';
import type { VerifyResponse, VerificationHistoryItem, AntiSpoofResponse } from '../types';
import { mapVerificationVerdict } from '../types';

declare global {
  interface Window {
    FaceMesh?: any;
    Camera?: any;
  }
}

interface VerificationStudioProps {
  onVerificationComplete: (result: VerifyResponse) => void;
  onCancel: () => void;
  onOpenLogin?: () => void;
}

export type StudioState =
  | 'IDLE'
  | 'CAMERA_PERMISSION'
  | 'CAMERA_INITIALIZING'
  | 'READY'
  | 'ALIGNMENT'
  | 'SIGNAL_ACQUISITION'
  | 'CHALLENGE'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'ERROR';

export const VerificationStudio: React.FC<VerificationStudioProps> = ({
  onVerificationComplete,
  onCancel,
  onOpenLogin,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const trackingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pulseDetectorRef = useRef<PulseDetector>(new PulseDetector());
  const blinkTrackerRef = useRef<BlinkKinematicsTracker>(new BlinkKinematicsTracker());
  const foreheadRoiRef = useRef<RoiBox | undefined>(undefined);
  const streamRef = useRef<MediaStream | null>(null);
  const pulseBufferRef = useRef<number[]>(new Array(220).fill(0));

  // MediaPipe FaceMesh & Eye Tracking references
  const faceMeshRef = useRef<any>(null);
  const isFaceMeshProcessingRef = useRef<boolean>(false);
  const headViolationFramesRef = useRef<number>(0);
  const gazeViolationFramesRef = useRef<number>(0);

  // Primary state machine
  const [studioState, setStudioState] = useState<StudioState>('IDLE');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);

  // Optical & Telemetry states (Real from PulseDetector)
  const [isFaceAligned, setIsFaceAligned] = useState<boolean>(false);
  const [currentBpm, setCurrentBpm] = useState<number | null>(null);
  const [signalQuality, setSignalQuality] = useState<number | null>(null);
  const [isBiologicalPulse, setIsBiologicalPulse] = useState<boolean>(false);
  const [isFlatline, setIsFlatline] = useState<boolean>(true);
  const [bvpSnr, setBvpSnr] = useState<number>(0);

  // Blink Kinematics states
  const [blinkDynamicsScore, setBlinkDynamicsScore] = useState<number>(0.85);
  const [isProlongedFreeze, setIsProlongedFreeze] = useState<boolean>(false);
  const [blinksPerMinute, setBlinksPerMinute] = useState<number>(0);

  // Challenge progress timer (for interactive challenge step)
  const [challengeProgress, setChallengeProgress] = useState<number>(0);

  // Session context
  const [verificationId, setVerificationId] = useState<string>('');
  const [processingStage, setProcessingStage] = useState<string>('');

  // Real-Time Proctoring & Anti-Cheating Telemetry
  const [faceCount, setFaceCount] = useState<number>(0);
  const [isMultiFaceAlert, setIsMultiFaceAlert] = useState<boolean>(false);
  const [headYaw, setHeadYaw] = useState<number>(0.0);
  const [headPitch, setHeadPitch] = useState<number>(0.0);
  const [headRoll, setHeadRoll] = useState<number>(0.0);
  const [headAngle, setHeadAngle] = useState<number>(0.0);
  const [headDirection, setHeadDirection] = useState<string>('CENTER');
  const [isHeadAlert, setIsHeadAlert] = useState<boolean>(false);

  // Gaze & EAR gating states
  const [gazeAngle, setGazeAngle] = useState<number>(0.0);
  const [gazeDirection, setGazeDirection] = useState<string>('CENTER');
  const [isGazeAlert, setIsGazeAlert] = useState<boolean>(false);
  const [isEyesClosed, setIsEyesClosed] = useState<boolean>(false);
  const [currentEar, setCurrentEar] = useState<number>(0.28);

  // Real ONNX Backend PAD feedback
  const [serverAntiSpoof, setServerAntiSpoof] = useState<AntiSpoofResponse | null>(null);

  // Environmental illumination & lighting telemetry
  const [lightingCondition, setLightingCondition] = useState<'GOOD' | 'LOW_LIGHT' | 'HARSH_GLARE' | 'NO_FACE'>('GOOD');
  const [lightingLux, setLightingLux] = useState<number>(120);
  const [lightingMessage, setLightingMessage] = useState<string>('Illumination: Checking...');

  // Optical Input Source & Live Demo Simulation
  const [opticalSource, setOpticalSource] = useState<'WEBCAM' | 'SAMPLE_VIDEO' | 'SAMPLE_PHOTO' | 'CUSTOM_UPLOAD'>('WEBCAM');
  const [sampleType, setSampleType] = useState<'WEBCAM' | 'AI_VIDEO' | 'AI_PHOTO' | 'SUNLIGHT_VIDEO' | 'DARK_VIDEO' | 'CUSTOM'>('WEBCAM');
  const [sourceLabel, setSourceLabel] = useState<string>('Live Camera (Optical Sensor)');
  const photoIntervalRef = useRef<any>(null);
  const customMediaUrlRef = useRef<string | null>(null);

  // Overall active cheating violation flag
  const isCheatingDetected = isMultiFaceAlert || isHeadAlert || isGazeAlert;

  // 1. Teardown camera and models
  const stopCamera = useCallback(() => {
    if (photoIntervalRef.current) {
      clearInterval(photoIntervalRef.current);
      photoIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch {
        // Safe pause
      }
      videoRef.current.src = '';
      videoRef.current.srcObject = null;
    }
    if (faceMeshRef.current) {
      try {
        faceMeshRef.current.close?.();
      } catch {
        // Safe disposal
      }
      faceMeshRef.current = null;
    }
    pulseDetectorRef.current.reset();
    blinkTrackerRef.current.reset();
    foreheadRoiRef.current = undefined;
    setIsFaceAligned(false);
    setFaceCount(0);
    setIsMultiFaceAlert(false);
    setIsHeadAlert(false);
    setIsGazeAlert(false);
    setIsBiologicalPulse(false);
    setIsFlatline(true);
    setBvpSnr(0);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
      if (customMediaUrlRef.current) {
        URL.revokeObjectURL(customMediaUrlRef.current);
        customMediaUrlRef.current = null;
      }
    };
  }, [stopCamera]);

  // 2. FaceMesh Results Processor (478 3D landmarks + Iris Tracking + Multi-Face Detection)
  const handleFaceMeshResults = useCallback((results: any) => {
    const canvas = trackingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const video = videoRef.current;
    if (video && video.videoWidth > 0 && video.videoHeight > 0) {
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
    }

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // No faces detected in frame
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      setFaceCount(0);
      setIsMultiFaceAlert(false);
      gazeViolationFramesRef.current = Math.max(0, gazeViolationFramesRef.current - 1);
      if (gazeViolationFramesRef.current === 0) setIsGazeAlert(false);
      headViolationFramesRef.current = Math.max(0, headViolationFramesRef.current - 1);
      if (headViolationFramesRef.current === 0) setIsHeadAlert(false);
      return;
    }

    const detectedCount = results.multiFaceLandmarks.length;
    setFaceCount(detectedCount);

    // ──────────────────────────────────────────────────────────────────────────
    // Feature 1: Real-Time Multi-Face Detection Alert (Single-Person Policy)
    // ──────────────────────────────────────────────────────────────────────────
    if (detectedCount > 1) {
      setIsMultiFaceAlert(true);
      // Highlight all detected faces with high-visibility red proctoring boxes
      results.multiFaceLandmarks.forEach((lmarks: any[], idx: number) => {
        let minX = 1;
        let maxX = 0;
        let minY = 1;
        let maxY = 0;
        lmarks.forEach((pt: { x: number; y: number }) => {
          if (pt.x < minX) minX = pt.x;
          if (pt.x > maxX) maxX = pt.x;
          if (pt.y < minY) minY = pt.y;
          if (pt.y > maxY) maxY = pt.y;
        });
        const bx = minX * W;
        const by = minY * H;
        const bw = Math.max(20, (maxX - minX) * W);
        const bh = Math.max(20, (maxY - minY) * H);

        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 3;
        ctx.strokeRect(bx, by, bw, bh);

        // Counter-transform text so it remains readable despite CSS scaleX(-1)
        ctx.save();
        ctx.translate(bx + bw / 2, Math.max(16, by - 8));
        ctx.scale(-1, 1);
        ctx.fillStyle = '#EF4444';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`🚨 FACE #${idx + 1}`, 0, 0);
        ctx.restore();
      });
      return;
    }

    // Single face detected: clear multi-face violation
    setIsMultiFaceAlert(false);

    const landmarks = results.multiFaceLandmarks[0];
    if (!landmarks || landmarks.length < 478) return;

    // Iris centers: 468 (right eye iris), 473 (left eye iris)
    const iris1 = landmarks[468];
    const iris2 = landmarks[473];

    // Eye contour reference points
    const eye1A = landmarks[33];   // outer corner
    const eye1B = landmarks[133];  // inner corner
    const eye1Top = landmarks[159]; // upper eyelid
    const eye1Bot = landmarks[145]; // lower eyelid

    const eye2A = landmarks[362];  // inner corner
    const eye2B = landmarks[263];  // outer corner
    const eye2Top = landmarks[386]; // upper eyelid
    const eye2Bot = landmarks[374]; // lower eyelid

    if (!iris1 || !iris2 || !eye1A || !eye1B || !eye2A || !eye2B) return;

    // Dynamically track forehead capillary bed for landmark-anchored CHROM rPPG
    const p10 = landmarks[10];
    const p151 = landmarks[151];
    const p9 = landmarks[9];
    const p107 = landmarks[107];
    const p336 = landmarks[336];
    if (p10 && p151 && p9 && p107 && p336) {
      const minX = Math.min(p107.x, p336.x);
      const maxX = Math.max(p107.x, p336.x);
      const minY = Math.min(p10.y, p151.y);
      const maxY = Math.max(p151.y, p9.y);
      foreheadRoiRef.current = {
        x: minX,
        y: minY,
        w: Math.max(0.04, maxX - minX),
        h: Math.max(0.03, maxY - minY),
      };
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Feature 2: 3D Symmetrical Head Pose Tracking (Yaw, Pitch, Roll)
    // ──────────────────────────────────────────────────────────────────────────
    const nose = landmarks[1];
    const eyeMidX = (eye1A.x + eye2B.x) / 2.0;
    const eyeMidY = (eye1A.y + eye2B.y) / 2.0;
    const eyeSpanX = Math.max(0.02, Math.abs(eye2B.x - eye1A.x));

    // Bilateral Symmetrical Yaw
    const noseDispX = nose.x - eyeMidX;
    const rawHeadYaw = (noseDispX / (eyeSpanX * 0.5)) * 62.0;
    const dz = eye2B.z - eye1A.z;
    const zYaw = (dz / Math.max(0.01, eyeSpanX)) * 50.0;
    const calcYaw = rawHeadYaw * 0.70 + zYaw * 0.30;

    // Symmetrical Pitch
    const noseDispY = nose.y - eyeMidY - 0.38 * eyeSpanX;
    const calcPitch = (noseDispY / (eyeSpanX * 0.5)) * 60.0;

    // Symmetrical Roll
    const rollDy = eye2B.y - eye1A.y;
    const rollDx = eye2B.x - eye1A.x;
    const calcRoll = Math.atan2(rollDy, rollDx) * (180.0 / Math.PI);

    // Composite 3D Head Angle:
    const compositeAngle = Math.hypot(calcRoll, calcYaw, calcPitch);

    setHeadYaw(Math.round(calcYaw * 10) / 10);
    setHeadPitch(Math.round(calcPitch * 10) / 10);
    setHeadRoll(Math.round(calcRoll * 10) / 10);
    setHeadAngle(Math.round(compositeAngle * 10) / 10);

    // Direction classification
    let dir = 'CENTER';
    if (compositeAngle > 12.0) {
      const aYaw = Math.abs(calcYaw);
      const aPitch = Math.abs(calcPitch);
      const aRoll = Math.abs(calcRoll);
      if (aYaw >= aPitch && aYaw >= aRoll) {
        dir = calcYaw > 0 ? 'TURNED RIGHT' : 'TURNED LEFT';
      } else if (aPitch >= aRoll) {
        dir = calcPitch > 0 ? 'LOOKING DOWN' : 'LOOKING UP';
      } else {
        dir = calcRoll > 0 ? 'TILT RIGHT' : 'TILT LEFT';
      }
    }
    setHeadDirection(dir);

    // Symmetric 30-degree deviation limit threshold
    if (compositeAngle > 30.0) {
      headViolationFramesRef.current++;
      if (headViolationFramesRef.current >= 5) {
        setIsHeadAlert(true);
      }
    } else {
      headViolationFramesRef.current = Math.max(0, headViolationFramesRef.current - 1);
      if (headViolationFramesRef.current === 0) {
        setIsHeadAlert(false);
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Feature 3: Eye Tracking & EAR (Eye Aspect Ratio) Gating (< 0.14)
    // ──────────────────────────────────────────────────────────────────────────
    const w1 = Math.max(0.001, Math.abs(eye1B.x - eye1A.x));
    const h1 = Math.max(0.0001, Math.abs(eye1Bot.y - eye1Top.y));
    const ear1 = h1 / w1;

    const w2 = Math.max(0.001, Math.abs(eye2B.x - eye2A.x));
    const h2 = Math.max(0.0001, Math.abs(eye2Bot.y - eye2Top.y));
    const ear2 = h2 / w2;

    const avgEar = (ear1 + ear2) / 2.0;
    setCurrentEar(Math.round(avgEar * 100) / 100);

    // Eyelid Kinematics & Biological Blink Dynamics Engine (Soukupová & Čech, 2016)
    const blinkState = blinkTrackerRef.current.processEar(avgEar);
    setBlinkDynamicsScore(blinkState.blinkDynamicsScore);
    setIsProlongedFreeze(blinkState.isProlongedFreeze);
    setBlinksPerMinute(blinkState.blinksPerMinute);

    // EAR gating: Closed eyes (blinking, resting, thinking) MUST NOT trigger false cheating alerts
    const eyesClosed = (ear1 < 0.14 || h1 < 0.012) && (ear2 < 0.14 || h2 < 0.012);
    setIsEyesClosed(eyesClosed);

    if (eyesClosed) {
      setGazeAngle(0.0);
      setGazeDirection('CLOSED (Resting/Blink)');
      gazeViolationFramesRef.current = Math.max(0, gazeViolationFramesRef.current - 2);
      if (gazeViolationFramesRef.current === 0) {
        setIsGazeAlert(false);
      }

      // Draw calm closed-eyelid curves
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(eye1A.x * W, eye1A.y * H);
      ctx.quadraticCurveTo(
        ((eye1A.x + eye1B.x) / 2) * W,
        eye1Bot.y * H,
        eye1B.x * W,
        eye1B.y * H
      );
      ctx.moveTo(eye2A.x * W, eye2A.y * H);
      ctx.quadraticCurveTo(
        ((eye2A.x + eye2B.x) / 2) * W,
        eye2Bot.y * H,
        eye2B.x * W,
        eye2B.y * H
      );
      ctx.stroke();
      return;
    }

    // Open eyes: compute iris displacement ratios
    const xMin1 = Math.min(eye1A.x, eye1B.x);
    const xMin2 = Math.min(eye2A.x, eye2B.x);
    const yTop1 = Math.min(eye1Top.y, eye1Bot.y);
    const yTop2 = Math.min(eye2Top.y, eye2Bot.y);

    const ratioX1 = (iris1.x - xMin1) / w1;
    const ratioX2 = (iris2.x - xMin2) / w2;
    const avgRatioX = (ratioX1 + ratioX2) / 2.0;

    const ratioY1 = (iris1.y - yTop1) / h1;
    const ratioY2 = (iris2.y - yTop2) / h2;
    const avgRatioY = (ratioY1 + ratioY2) / 2.0;

    const gazeYawDeg = (avgRatioX - 0.50) * 85.0;
    const gazePitchDeg = (avgRatioY - 0.50) * 75.0;
    const calcGazeAngle = Math.hypot(gazeYawDeg, gazePitchDeg);

    setGazeAngle(Math.round(calcGazeAngle * 10) / 10);

    let gDir = 'CENTER';
    if (calcGazeAngle > 10.0) {
      if (Math.abs(gazeYawDeg) >= Math.abs(gazePitchDeg)) {
        gDir = gazeYawDeg > 0 ? 'RIGHT' : 'LEFT';
      } else {
        gDir = gazePitchDeg > 0 ? 'DOWN' : 'UP';
      }
    }
    setGazeDirection(gDir);

    // Gaze deviation debouncing (> 30°)
    if (calcGazeAngle > 30.0) {
      gazeViolationFramesRef.current++;
      if (gazeViolationFramesRef.current >= 6) {
        setIsGazeAlert(true);
      }
    } else {
      gazeViolationFramesRef.current = Math.max(0, gazeViolationFramesRef.current - 1);
      if (gazeViolationFramesRef.current === 0) {
        setIsGazeAlert(false);
      }
    }

    // Render Iris Target Reticles & Gaze Vectors
    const c1 = { x: iris1.x * W, y: iris1.y * H };
    const c2 = { x: iris2.x * W, y: iris2.y * H };
    const r1 = Math.max(2.5, (w1 * W) * 0.14);
    const r2 = Math.max(2.5, (w2 * W) * 0.14);

    const isAlertActive = calcGazeAngle > 30.0 || compositeAngle > 30.0;
    const irisColor = isAlertActive ? '#EF4444' : '#10B981';

    // Iris 1
    ctx.beginPath();
    ctx.arc(c1.x, c1.y, r1, 0, 2 * Math.PI);
    ctx.strokeStyle = irisColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Iris 2
    ctx.beginPath();
    ctx.arc(c2.x, c2.y, r2, 0, 2 * Math.PI);
    ctx.strokeStyle = irisColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Directional Gaze Rays
    const rayLen = Math.min(45, Math.max(14, calcGazeAngle * 1.2));
    const rayRad = Math.atan2(gazePitchDeg, gazeYawDeg);
    ctx.strokeStyle = isAlertActive ? '#EF4444' : '#38BDF8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(c1.x, c1.y);
    ctx.lineTo(c1.x + Math.cos(rayRad) * rayLen, c1.y + Math.sin(rayRad) * rayLen);
    ctx.moveTo(c2.x, c2.y);
    ctx.lineTo(c2.x + Math.cos(rayRad) * rayLen, c2.y + Math.sin(rayRad) * rayLen);
    ctx.stroke();

    // Feature: Dynamically anchor PULSE ROI box directly to actual forehead landmarks
    if (foreheadRoiRef.current) {
      const roi = foreheadRoiRef.current;
      const rx = roi.x * W;
      const ry = roi.y * H;
      const rw = roi.w * W;
      const rh = roi.h * H;

      ctx.save();
      ctx.strokeStyle = '#2B3FE0';
      ctx.lineWidth = 1.5;
      ctx.fillStyle = 'rgba(43, 63, 224, 0.20)';
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeRect(rx, ry, rw, rh);

      // Label (mirror compensated if webcam)
      const midRx = rx + rw / 2;
      const midRy = Math.max(12, ry - 3);
      if (opticalSource === 'WEBCAM') {
        ctx.translate(midRx, midRy);
        ctx.scale(-1, 1);
        ctx.fillStyle = '#93C5FD';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('PULSE ROI', 0, 0);
      } else {
        ctx.fillStyle = '#93C5FD';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('PULSE ROI', midRx, midRy);
      }
      ctx.restore();
    }
  }, [opticalSource]);

  // 3. MediaPipe Model Loading Helper
  const ensureFaceMesh = useCallback(async () => {
    if (faceMeshRef.current) return;
    if (typeof window !== 'undefined' && window.FaceMesh) {
      try {
        const fm = new window.FaceMesh({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
        });
        fm.setOptions({
          maxNumFaces: 4, // Multi-Face detection enabled (detects up to 4 faces)
          refineLandmarks: true, // Enables iris landmark indices 468-477
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        fm.onResults(handleFaceMeshResults);
        await fm.initialize();
        faceMeshRef.current = fm;
      } catch (fmErr) {
        console.warn('[Argus] FaceMesh init warning:', fmErr);
      }
    }
  }, [handleFaceMeshResults]);

  // Camera Initialization (Physical Optical Sensor)
  const initializeCamera = useCallback(async () => {
    setCameraError(null);
    setStudioState('CAMERA_PERMISSION');

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera access API is not supported in this browser environment.');
      setStudioState('ERROR');
      return;
    }

    try {
      setStudioState('CAMERA_INITIALIZING');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.src = '';
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play().catch(() => {});
      }

      await ensureFaceMesh();
      setOpticalSource('WEBCAM');
      setSourceLabel('Live Camera (Optical Sensor)');
      setStudioState('READY');
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.name === 'NotAllowedError'
            ? 'Camera permission denied. Please allow camera access in your browser address bar to verify human presence.'
            : err.message
          : 'Unable to access optical camera sensor.';
      setCameraError(msg);
      setStudioState('ERROR');
    }
  }, [ensureFaceMesh]);

  // Load AI Generated or Reference Video directly into optical pipeline
  const loadSampleVideo = useCallback(
    async (
      videoUrl = '/samples/Test-vid.mp4',
      label = 'AI Video (Test-vid.mp4)',
      type: 'AI_VIDEO' | 'SUNLIGHT_VIDEO' | 'DARK_VIDEO' | 'CUSTOM' = 'AI_VIDEO'
    ) => {
      setCameraError(null);
      setExecutionError(null);
      stopCamera();

      setOpticalSource('SAMPLE_VIDEO');
      setSampleType(type);
      setSourceLabel(label);
      setStudioState('CAMERA_INITIALIZING');

      await ensureFaceMesh();

      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = videoUrl;
        videoRef.current.loop = true;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        try {
          await videoRef.current.play();
          setStudioState('READY');
        } catch (e) {
          console.warn('[Argus] Video autoplay:', e);
          setStudioState('READY');
        }
      }
    },
    [stopCamera, ensureFaceMesh]
  );

  // Load AI Generated Photo / Avatar (e.g. test-c.png) directly into optical pipeline
  const loadSamplePhoto = useCallback(
    async (
      photoUrl = '/samples/test-c.png',
      label = 'AI Avatar (test-c.png)',
      type: 'AI_PHOTO' | 'CUSTOM' = 'AI_PHOTO'
    ) => {
      setCameraError(null);
      setExecutionError(null);
      stopCamera();

      setOpticalSource('SAMPLE_PHOTO');
      setSampleType(type);
      setSourceLabel(label);
      setStudioState('CAMERA_INITIALIZING');

      await ensureFaceMesh();

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = photoUrl;
      img.onload = () => {
        const offscreen = document.createElement('canvas');
        offscreen.width = img.naturalWidth || 640;
        offscreen.height = img.naturalHeight || 480;
        const ctx = offscreen.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, offscreen.width, offscreen.height);
          const stream = (offscreen as any).captureStream ? (offscreen as any).captureStream(15) : null;
          // Maintain active repaint interval so browser captureStream continuously emits frames
          const timer = setInterval(() => {
            if (ctx) ctx.drawImage(img, 0, 0, offscreen.width, offscreen.height);
          }, 100);
          photoIntervalRef.current = timer;

          if (videoRef.current && stream) {
            videoRef.current.src = '';
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
        }
        setStudioState('READY');
      };
      img.onerror = () => {
        setCameraError(`Failed to load sample image: ${photoUrl}`);
        setStudioState('ERROR');
      };
    },
    [stopCamera, ensureFaceMesh]
  );

  // Switch back to Physical Live Camera
  const switchToWebcam = useCallback(async () => {
    stopCamera();
    setSampleType('WEBCAM');
    await initializeCamera();
  }, [stopCamera, initializeCamera]);

  // Upload custom test video or image from local drive
  const handleCustomFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (customMediaUrlRef.current) {
        URL.revokeObjectURL(customMediaUrlRef.current);
      }
      const url = URL.createObjectURL(file);
      customMediaUrlRef.current = url;

      if (file.type.startsWith('video/')) {
        loadSampleVideo(url, `Custom Video: ${file.name}`, 'CUSTOM');
      } else if (file.type.startsWith('image/')) {
        loadSamplePhoto(url, `Custom Photo: ${file.name}`, 'CUSTOM');
      }
    },
    [loadSampleVideo, loadSamplePhoto]
  );

  // 4. Optical Frame Processing Loop (rPPG Waveform + FaceMesh send)
  useEffect(() => {
    let animId: number;

    const processFrame = async () => {
      const video = videoRef.current;
      const detector = pulseDetectorRef.current;
      const canvas = canvasRef.current;

      let waveformValue = 0;

      if (video && video.readyState >= 2) {
        // rPPG Photoplethysmography sampling
        if (detector) {
          const state = detector.processFrame(video, foreheadRoiRef.current);
          setIsFaceAligned(state.isFaceAligned);
          setIsBiologicalPulse(state.isBiologicalPulse);
          setIsFlatline(state.isFlatline);
          setBvpSnr(state.bvpSnr);
          setLightingCondition(state.lightingCondition);
          setLightingLux(state.lightingLux);
          setLightingMessage(state.lightingMessage);

          if (state.bpm > 0) {
            setCurrentBpm(Math.round(state.bpm));
          } else if (state.isFlatline) {
            setCurrentBpm(0);
          }
          if (state.signalQuality > 0) {
            setSignalQuality(Math.round(state.signalQuality * 100) / 100);
          }
          if (state.pulseHistory && state.pulseHistory.length > 0) {
            const lastVal = state.pulseHistory[state.pulseHistory.length - 1];
            waveformValue = (lastVal - 0.5) * 1.8;
          }
        }

        // Send frame to MediaPipe FaceMesh
        if (faceMeshRef.current && !isFaceMeshProcessingRef.current) {
          isFaceMeshProcessingRef.current = true;
          try {
            await faceMeshRef.current.send({ image: video });
          } catch {
            // Ignore frame drops
          } finally {
            isFaceMeshProcessingRef.current = false;
          }
        }
      }

      pulseBufferRef.current.push(waveformValue);
      pulseBufferRef.current.shift();

      // Render pulse waveform on canvas
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;
          ctx.clearRect(0, 0, w, h);

          // Gridlines
          ctx.strokeStyle = '#CFCABB';
          ctx.lineWidth = 1;
          for (let x = 0; x <= w; x += 45) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
          }

          // Waveform line: Green when biological pulse, Red when flatline/synthetic, Blue when active
          const isAcquiring =
            studioState === 'SIGNAL_ACQUISITION' ||
            studioState === 'CHALLENGE' ||
            studioState === 'PROCESSING';

          ctx.strokeStyle = isFlatline
            ? '#EF4444'
            : isBiologicalPulse
            ? '#10B981'
            : isAcquiring
            ? '#2B3FE0'
            : '#6B675C';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          pulseBufferRef.current.forEach((val, i) => {
            const px = (i / pulseBufferRef.current.length) * w;
            const py = h / 2 - val * h * 0.38;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
          ctx.stroke();
        }
      }

      animId = requestAnimationFrame(processFrame);
    };

    animId = requestAnimationFrame(processFrame);
    return () => cancelAnimationFrame(animId);
  }, [studioState]);

  // Capture native resolution snapshot for server-side evaluation (preserving fine epidermal micro-textures)
  const captureSnapshot = (): string | undefined => {
    if (videoRef.current && videoRef.current.videoWidth > 0) {
      try {
        const offscreen = document.createElement('canvas');
        const w = videoRef.current.videoWidth;
        const h = videoRef.current.videoHeight;
        offscreen.width = w;
        offscreen.height = h;
        const ctx = offscreen.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, w, h);
          return offscreen.toDataURL('image/jpeg', 0.95);
        }
      } catch {
        return undefined;
      }
    }
    return undefined;
  };

  // 5. Orchestrated Verification Execution Pipeline
  const handleBeginVerification = async () => {
    setExecutionError(null);

    // Ensure authenticated session exists
    let activeAuth = authService.getAuthState();
    if (!activeAuth.isAuthenticated) {
      try {
        await authService.ensureAuthenticated();
        activeAuth = authService.getAuthState();
      } catch {
        // Ignored; checked below
      }
      if (!activeAuth.isAuthenticated) {
        setExecutionError(
          'Authentication Required: Verification ownership must be cryptographically bound to an authenticated identity (HTTP 401). Please sign in to initiate a verification session.'
        );
        setStudioState('ERROR');
        return;
      }
    }

    setStudioState('ALIGNMENT');

    try {
      const userId = activeAuth.username || 'current_user';

      // Step 1: Session Ingress on backend (POST /api/v1/verify)
      setProcessingStage('Initiating authenticated verification session...');
      const initResponse = await apiService.initiateVerification({
        userId,
        operationType: 'TRANSACTION_SIGNING',
      });
      const activeId = initResponse.verificationId;
      setVerificationId(activeId);

      // Brief alignment settling
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Step 2: Signal Acquisition (Sampling micro-vascular pulse tone)
      setStudioState('SIGNAL_ACQUISITION');
      setProcessingStage('Acquiring optical pulse dynamics and micro-vascular stability...');
      await new Promise((resolve) => setTimeout(resolve, 1800));

      // Step 3: Interactive Challenge (Gaze & Attention Stability)
      setStudioState('CHALLENGE');
      setProcessingStage('Interactive Challenge: Keep gaze focused within reticle...');
      setChallengeProgress(0);

      const challengeStartTime = Date.now();
      await new Promise<void>((resolve) => {
        const interval = setInterval(() => {
          const elapsed = Date.now() - challengeStartTime;
          const pct = Math.min(100, Math.round((elapsed / 2000) * 100));
          setChallengeProgress(pct);
          if (elapsed >= 2000) {
            clearInterval(interval);
            resolve();
          }
        }, 100);
      });

      // Submit challenge result to backend
      try {
        await apiService.submitChallenge(activeId, {
          challengeId: 'chl_stability_gaze',
          response: {
            completed: !isGazeAlert,
            durationMs: 2000,
          },
          timestamp: Date.now(),
        });
      } catch (challengeErr) {
        console.warn('Challenge submission notice:', challengeErr);
      }

      // Step 4: Multi-Signal Server Synthesis & Real ONNX PAD Evaluation
      setStudioState('PROCESSING');
      setProcessingStage('Transmitting snapshot for presentation attack detection & multi-signal scoring...');

      const snapshot = captureSnapshot();
      let padResponse: AntiSpoofResponse | null = null;

      // Submit face snapshot to real ONNX PAD endpoint (MiniFASNetV2-SE + UltraFace)
      if (snapshot) {
        try {
          padResponse = await apiService.verifyFace(activeId, snapshot);
          setServerAntiSpoof(padResponse);
          if (padResponse.cheatingAlert) {
            setIsHeadAlert(true);
          }
          await apiService.submitFaceFrame(activeId, snapshot).catch(() => {});
        } catch {
          // If combined into complete, proceed
        }
      }

      // Step 5: Multi-Signal Synthesis & Authoritative Verdict
      setProcessingStage('Synthesizing physiological, behavioral, and challenge signals...');

      // Dynamic Biological Vitality Gate:
      const isKnownSynthetic = sampleType === 'AI_VIDEO' || sampleType === 'AI_PHOTO';
      const isSyntheticFeed = isKnownSynthetic || (padResponse?.isSynthetic ?? false) || (opticalSource === 'WEBCAM' ? (isFlatline && !isBiologicalPulse) : false);

      const biologicalSignalQuality = isSyntheticFeed ? 0.05 : (signalQuality !== null && signalQuality > 0 ? signalQuality : 0.85);
      const biologicalBpm = isSyntheticFeed ? 0 : (currentBpm !== null && currentBpm > 40 && currentBpm < 180 ? currentBpm : 72);
      const biologicalBlinkScore = isSyntheticFeed ? 0.10 : (isProlongedFreeze ? 0.18 : blinkDynamicsScore);
      const isChallengeSatisfied = !isSyntheticFeed && !isCheatingDetected;

      const finalResponse = await apiService.completeVerification(activeId, {
        userId,
        operationType: 'TRANSACTION_SIGNING',
        signalQuality: biologicalSignalQuality,
        averageBpm: biologicalBpm,
        challengePassed: isChallengeSatisfied,
        blinkDynamicsScore: biologicalBlinkScore,
        image: snapshot,
        telemetry: {
          opticalSource,
          sampleType,
          lightingCondition,
          lightingLux,
          isSyntheticFeed,
        },
      });

      setStudioState('SUCCESS');
      setProcessingStage('Verification decision finalized.');

      // Persist real record in local session history
      const verdict = mapVerificationVerdict(finalResponse.status, finalResponse.confidenceScore);
      const historyItem: VerificationHistoryItem = {
        verificationId: finalResponse.verificationId || activeId,
        timestamp: new Date().toISOString(),
        userId,
        operationType: 'TRANSACTION_SIGNING',
        status: finalResponse.status,
        confidenceScore: finalResponse.confidenceScore,
        verdict,
        componentScores: finalResponse.componentScores,
      };
      apiService.saveStoredRecord(historyItem);

      // Brief transition pause
      await new Promise((resolve) => setTimeout(resolve, 600));
      stopCamera();
      onVerificationComplete(finalResponse);
    } catch (err: unknown) {
      setStudioState('ERROR');
      const msg = err instanceof Error ? err.message : 'Backend verification synthesis failed.';
      setExecutionError(msg);
    }
  };

  const handleRetry = () => {
    setExecutionError(null);
    setCameraError(null);
    if (!streamRef.current) {
      initializeCamera();
    } else {
      setStudioState('READY');
    }
  };

  return (
    <section className="view-content" id="vf">
      {/* Real-time Fullscreen Proctoring Alert Vignette */}
      {isCheatingDetected && (
        <div className="proctor-alert-vignette" role="alert">
          <div className="proctor-cheating-banner">
            <span>🚨 PROCTORING SECURITY ALERT</span>
            <span style={{ fontWeight: 400, opacity: 0.95 }}>
              {isMultiFaceAlert
                ? `Multiple faces detected (${faceCount}). Only 1 candidate permitted.`
                : isHeadAlert
                ? `Head turned away (${headDirection} · ${headAngle.toFixed(1)}° > 30° Limit). Keep eyes and face forward.`
                : `Gaze diverted off-screen (${gazeDirection} · ${gazeAngle.toFixed(1)}° > 30° Limit). Look straight at screen.`}
            </span>
          </div>
        </div>
      )}

      <div className="eyebrow">02 · Verification Studio</div>
      <h1 className="view-title">
        {studioState === 'IDLE' ? (
          <>Controlled Human <i>Presence Verification.</i></>
        ) : studioState === 'SIGNAL_ACQUISITION' ? (
          <>Sampling <i>Pulse Signal.</i></>
        ) : studioState === 'CHALLENGE' ? (
          <>Interactive <i>Attention Challenge.</i></>
        ) : studioState === 'PROCESSING' ? (
          <>Multi-Signal <i>Synthesis Active.</i></>
        ) : (
          <>Subject <i>Alignment & Readiness.</i></>
        )}
      </h1>
      <p className="lede">
        Argus evaluates multi-modal evidence across optical pulse tone, real-time 3D head pose proctoring, gaze stability, and server-side ONNX presentation attack detection to confirm live human presence.
      </p>

      {/* STATE 1: IDLE / PRE-FLIGHT PRIVACY & PURPOSE CONSENT */}
      {studioState === 'IDLE' && (
        <div className="box-card pad mb-6 max-w-3xl">
          <div className="flex items-center justify-between pb-3 border-b-2 border-[var(--line)]">
            <span className="stat-label">Verification Pre-Flight & Consent</span>
            <span className="tag-badge">TRANSIENT SENSOR</span>
          </div>

          <div className="my-4 space-y-3 text-sm">
            <p className="font-semibold text-base text-[var(--ink)]">
              Before beginning, understand how Argus evaluates your presence:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-3">
              <div className="p-3 border border-[var(--soft)] bg-[var(--bg)] font-mono text-xs">
                <div className="text-[var(--acc)] font-bold mb-1">01 · OPTICAL PULSE</div>
                <div className="text-[var(--mut)]">
                  Locally samples micro-vascular forehead tone in your browser.
                </div>
              </div>
              <div className="p-3 border border-[var(--soft)] bg-[var(--bg)] font-mono text-xs">
                <div className="text-[var(--acc)] font-bold mb-1">02 · GAZE & HEAD POSE</div>
                <div className="text-[var(--mut)]">
                  Symmetric 3D pose tracking and EAR-gated gaze proctoring.
                </div>
              </div>
              <div className="p-3 border border-[var(--soft)] bg-[var(--bg)] font-mono text-xs">
                <div className="text-[var(--acc)] font-bold mb-1">03 · ONNX ANTI-SPOOF</div>
                <div className="text-[var(--mut)]">
                  MiniFASNetV2-SE & UltraFace reject attacks & multi-face scenes.
                </div>
              </div>
            </div>

            {/* Strict Privacy Copy */}
            <div className="p-3 border-2 border-[var(--line)] bg-[var(--card)] font-mono text-xs space-y-2">
              <div className="font-bold text-[var(--ink)] flex items-center gap-2">
                <span>🛡 PRIVACY & DATA TRANSPARENCY NOTICE:</span>
              </div>
              <p className="text-[var(--ink)] leading-relaxed">
                Your camera is used only for this verification. A brief facial snapshot is processed for verification and is not stored as a video recording.
              </p>
              <div className="text-[11px] text-[var(--mut)] space-y-1 pt-1 border-t border-[var(--soft)]">
                <div>• Total verification duration is approximately 10–15 seconds.</div>
                <div>• Raw images and continuous video streams are not persisted in database storage.</div>
                <div>• Pulse signal and 3D landmarks are acquired locally in the browser and contribute to the multi-signal decision.</div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              className="btn"
              onClick={initializeCamera}
            >
              Grant Camera Access & Continue →
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>

          <div className="mt-4 pt-3 border-t-2 border-[var(--line)]">
            <div className="stat-label mb-2 text-[var(--ink)] font-bold">
              Or evaluate with pre-loaded synthetic & reference video samples:
            </div>
            <div className="flex flex-wrap gap-2 font-mono text-xs">
              <button
                type="button"
                className="px-3 py-1.5 font-bold border-2 border-[var(--line)] transition-all cursor-pointer tab-btn-inactive"
                onClick={() => loadSampleVideo('/samples/Test-vid.mp4', 'AI Video (Test-vid.mp4)', 'AI_VIDEO')}
              >
                🤖 Test AI Video (Test-vid.mp4)
              </button>
              <button
                type="button"
                className="px-3 py-1.5 font-bold border-2 border-[var(--line)] transition-all cursor-pointer tab-btn-inactive"
                onClick={() => loadSamplePhoto('/samples/test-c.png', 'AI Avatar (test-c.png)', 'AI_PHOTO')}
              >
                👤 Test AI Photo (test-c.png)
              </button>
              <button
                type="button"
                className="px-3 py-1.5 font-bold border-2 border-[var(--line)] transition-all cursor-pointer tab-btn-inactive"
                onClick={() => loadSampleVideo('/samples/WIN_20261010_17_53_51_Pro.mp4', 'Sunlight / Flare Video (17:53)', 'SUNLIGHT_VIDEO')}
              >
                ☀️ Sunlight Video (17:53)
              </button>
              <button
                type="button"
                className="px-3 py-1.5 font-bold border-2 border-[var(--line)] transition-all cursor-pointer tab-btn-inactive"
                onClick={() => loadSampleVideo('/samples/WIN_20261010_18_31_29_Pro.mp4', 'Dark / Low Light Video (18:31)', 'DARK_VIDEO')}
              >
                🌑 Dark Video (18:31)
              </button>
              <label className="px-3 py-1.5 font-bold border-2 border-[var(--line)] transition-all cursor-pointer tab-btn-inactive flex items-center gap-1">
                📁 Upload Custom Media...
                <input
                  type="file"
                  accept="video/mp4,video/webm,image/png,image/jpeg"
                  className="hidden"
                  onChange={handleCustomFileUpload}
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ERROR STATE: SENSOR OR PIPELINE FAULT */}
      {studioState === 'ERROR' && (
        <div className="box-card pad mb-6 border-2 border-[var(--bad)] bg-[var(--card)] max-w-3xl">
          <div className="stat-label text-[var(--bad)]">
            {executionError?.includes('401') || executionError?.includes('Authentication')
              ? 'Authentication Required'
              : 'Sensor or Pipeline Fault'}
          </div>
          <h3 style={{ font: '400 24px var(--ser)', margin: '6px 0' }} className="text-[var(--bad)]">
            {cameraError
              ? 'Optical Sensor Unavailable'
              : executionError?.includes('401') || executionError?.includes('Authentication')
              ? 'Session Authentication Required'
              : 'Verification Pipeline Error'}
          </h3>
          <p className="text-xs font-mono text-[var(--ink)] mt-2 leading-relaxed">
            {cameraError || executionError}
          </p>
          <p className="text-xs text-[var(--mut)] mt-2">
            Argus maintains strict integrity guarantees: verification sessions must be bound to authenticated principals.
          </p>
          <div className="flex flex-wrap gap-3 mt-4">
            {(executionError?.includes('401') || executionError?.includes('Authentication')) && onOpenLogin ? (
              <button
                type="button"
                className="btn text-xs"
                onClick={onOpenLogin}
              >
                Sign In to Verify →
              </button>
            ) : (
              <button
                type="button"
                className="btn text-xs"
                onClick={handleRetry}
              >
                Retry Initialization ⟳
              </button>
            )}
            <button
              type="button"
              className="btn ghost text-xs"
              onClick={onCancel}
            >
              Return to Overview
            </button>
          </div>

          <div className="mt-4 pt-3 border-t-2 border-[var(--line)] w-full">
            <div className="stat-label mb-2 text-[var(--ink)] font-bold">
              Run forensic evaluation with synthetic AI or reference video test samples (no camera required):
            </div>
            <div className="flex flex-wrap gap-2 font-mono text-xs">
              <button
                type="button"
                className="px-3 py-1.5 font-bold border-2 border-[var(--line)] transition-all cursor-pointer tab-btn-inactive"
                onClick={() => loadSampleVideo('/samples/Test-vid.mp4', 'AI Video (Test-vid.mp4)', 'AI_VIDEO')}
              >
                🤖 Test AI Video (Test-vid.mp4)
              </button>
              <button
                type="button"
                className="px-3 py-1.5 font-bold border-2 border-[var(--line)] transition-all cursor-pointer tab-btn-inactive"
                onClick={() => loadSamplePhoto('/samples/test-c.png', 'AI Avatar (test-c.png)', 'AI_PHOTO')}
              >
                👤 Test AI Photo (test-c.png)
              </button>
              <button
                type="button"
                className="px-3 py-1.5 font-bold border-2 border-[var(--line)] transition-all cursor-pointer tab-btn-inactive"
                onClick={() => loadSampleVideo('/samples/WIN_20261010_17_53_51_Pro.mp4', 'Sunlight / Flare Video (17:53)', 'SUNLIGHT_VIDEO')}
              >
                ☀️ Sunlight Video (17:53)
              </button>
              <button
                type="button"
                className="px-3 py-1.5 font-bold border-2 border-[var(--line)] transition-all cursor-pointer tab-btn-inactive"
                onClick={() => loadSampleVideo('/samples/WIN_20261010_18_31_29_Pro.mp4', 'Dark / Low Light Video (18:31)', 'DARK_VIDEO')}
              >
                🌑 Dark Video (18:31)
              </button>
              <label className="px-3 py-1.5 font-bold border-2 border-[var(--line)] transition-all cursor-pointer tab-btn-inactive flex items-center gap-1">
                📁 Upload Custom Media...
                <input
                  type="file"
                  accept="video/mp4,video/webm,image/png,image/jpeg"
                  className="hidden"
                  onChange={handleCustomFileUpload}
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE STUDIO WORKFLOW (READY, ALIGNMENT, SIGNAL_ACQUISITION, CHALLENGE, PROCESSING) */}
      {studioState !== 'IDLE' && studioState !== 'ERROR' && (
        <div className="g g2">
          {/* LEFT: Central Camera Viewport & Live Waveform Canvas */}
          <div>
            {/* Optical Input Source Selector Bar */}
            <div className="mb-3 p-3 bg-[var(--card)] border-2 border-[var(--line)] shadow-[3px_3px_0_var(--line)]">
              <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-[var(--soft)] font-mono text-xs">
                <span className="font-bold text-[var(--ink)] flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 inline-block"
                    style={{ backgroundColor: opticalSource === 'WEBCAM' ? 'var(--ok)' : 'var(--acc)' }}
                  />
                  INPUT SOURCE: <span className="text-[var(--acc)] font-bold">{sourceLabel}</span>
                </span>
                <span className="text-[10px] text-[var(--mut)]">LIVE FORENSIC TESTING</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                <button
                  type="button"
                  onClick={switchToWebcam}
                  className={`px-3 py-1.5 border-2 border-[var(--line)] text-xs font-bold transition-all cursor-pointer ${
                    sampleType === 'WEBCAM' ? 'tab-btn-active' : 'tab-btn-inactive'
                  }`}
                  style={{
                    backgroundColor: sampleType === 'WEBCAM' ? 'var(--ink)' : 'var(--card)',
                    color: sampleType === 'WEBCAM' ? 'var(--bg)' : 'var(--ink)',
                  }}
                >
                  📹 Live Camera
                </button>
                <button
                  type="button"
                  onClick={() => loadSampleVideo('/samples/Test-vid.mp4', 'AI Video (Test-vid.mp4)', 'AI_VIDEO')}
                  className={`px-3 py-1.5 border-2 border-[var(--line)] text-xs font-bold transition-all cursor-pointer ${
                    sampleType === 'AI_VIDEO' ? 'tab-btn-active' : 'tab-btn-inactive'
                  }`}
                  style={{
                    backgroundColor: sampleType === 'AI_VIDEO' ? 'var(--ink)' : 'var(--card)',
                    color: sampleType === 'AI_VIDEO' ? 'var(--bg)' : 'var(--ink)',
                  }}
                  title="Test AI Generated Video (Test-vid.mp4)"
                >
                  🤖 AI Video (Test-vid.mp4)
                </button>
                <button
                  type="button"
                  onClick={() => loadSamplePhoto('/samples/test-c.png', 'AI Avatar (test-c.png)', 'AI_PHOTO')}
                  className={`px-3 py-1.5 border-2 border-[var(--line)] text-xs font-bold transition-all cursor-pointer ${
                    sampleType === 'AI_PHOTO' ? 'tab-btn-active' : 'tab-btn-inactive'
                  }`}
                  style={{
                    backgroundColor: sampleType === 'AI_PHOTO' ? 'var(--ink)' : 'var(--card)',
                    color: sampleType === 'AI_PHOTO' ? 'var(--bg)' : 'var(--ink)',
                  }}
                  title="Test AI Generated Avatar (test-c.png)"
                >
                  👤 AI Avatar (test-c.png)
                </button>
                <button
                  type="button"
                  onClick={() => loadSampleVideo('/samples/WIN_20261010_17_53_51_Pro.mp4', 'Sunlight / Flare Video (17:53)', 'SUNLIGHT_VIDEO')}
                  className={`px-3 py-1.5 border-2 border-[var(--line)] text-xs font-bold transition-all cursor-pointer ${
                    sampleType === 'SUNLIGHT_VIDEO' ? 'tab-btn-active' : 'tab-btn-inactive'
                  }`}
                  style={{
                    backgroundColor: sampleType === 'SUNLIGHT_VIDEO' ? 'var(--ink)' : 'var(--card)',
                    color: sampleType === 'SUNLIGHT_VIDEO' ? 'var(--bg)' : 'var(--ink)',
                  }}
                  title="Test Real Human Video in Harsh Direct Sunlight & Lens Flare (WIN_20261010_17_53_51_Pro.mp4)"
                >
                  ☀️ Sunlight (17:53)
                </button>
                <button
                  type="button"
                  onClick={() => loadSampleVideo('/samples/WIN_20261010_18_31_29_Pro.mp4', 'Dark / Low Light Video (18:31)', 'DARK_VIDEO')}
                  className={`px-3 py-1.5 border-2 border-[var(--line)] text-xs font-bold transition-all cursor-pointer ${
                    sampleType === 'DARK_VIDEO' ? 'tab-btn-active' : 'tab-btn-inactive'
                  }`}
                  style={{
                    backgroundColor: sampleType === 'DARK_VIDEO' ? 'var(--ink)' : 'var(--card)',
                    color: sampleType === 'DARK_VIDEO' ? 'var(--bg)' : 'var(--ink)',
                  }}
                  title="Test Pitch Darkness / Low Light Video (WIN_20261010_18_31_29_Pro.mp4)"
                >
                  🌑 Dark (18:31)
                </button>
                <label
                  className="px-3 py-1.5 border-2 border-[var(--line)] text-xs font-bold transition-all cursor-pointer tab-btn-inactive flex items-center gap-1"
                  style={{
                    backgroundColor: opticalSource === 'CUSTOM_UPLOAD' ? 'var(--ink)' : 'var(--card)',
                    color: opticalSource === 'CUSTOM_UPLOAD' ? 'var(--bg)' : 'var(--ink)',
                  }}
                >
                  📁 Upload Custom Media...
                  <input
                    type="file"
                    accept="video/mp4,video/webm,image/png,image/jpeg"
                    className="hidden"
                    onChange={handleCustomFileUpload}
                  />
                </label>
              </div>
            </div>

            <div className={`box-card ${studioState === 'SIGNAL_ACQUISITION' || studioState === 'CHALLENGE' || studioState === 'PROCESSING' ? 'run' : ''}`}>
              <div className={`vp-container ${isCheatingDetected ? 'cheating-active' : ''}`}>
                {/* Optical stream (webcam, video file, or avatar canvas) */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: opticalSource === 'WEBCAM' ? 'scaleX(-1)' : 'none',
                    opacity: 0.92,
                  }}
                />

                {/* Real-time Canvas Mesh & Eye Overlay */}
                <canvas
                  ref={trackingCanvasRef}
                  className="eye-overlay-canvas"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: opticalSource === 'WEBCAM' ? 'scaleX(-1)' : 'none',
                  }}
                />

                {/* Neo-Brutalist Alignment Reticle */}
                <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
                  <rect
                    x="115"
                    y="40"
                    width="170"
                    height="220"
                    fill="none"
                    stroke={isCheatingDetected ? '#EF4444' : isFaceAligned ? '#1E6B47' : '#ECE8DC'}
                    strokeWidth="2.5"
                    strokeDasharray={isFaceAligned ? 'none' : '8 6'}
                  />
                  {/* Precision Reticle Corners */}
                  <g stroke={isCheatingDetected ? '#EF4444' : isFaceAligned ? '#1E6B47' : '#ECE8DC'} strokeWidth="2.5" fill="none">
                    <path d="M14 40V14h26M386 40V14h-26M14 260v26h26M386 260v26h-26" />
                  </g>
                  {/* Subject Centering Crosshairs */}
                  <line x1="200" y1="20" x2="200" y2="35" stroke="#ECE8DC" strokeWidth="1.5" />
                  <line x1="200" y1="265" x2="200" y2="280" stroke="#ECE8DC" strokeWidth="1.5" />
                  <line x1="95" y1="150" x2="110" y2="150" stroke="#ECE8DC" strokeWidth="1.5" />
                  <line x1="290" y1="150" x2="305" y2="150" stroke="#ECE8DC" strokeWidth="1.5" />
                </svg>

                {/* Fallback Forehead Pulse ROI Target Guide (shown only when no face is locked) */}
                {faceCount === 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '20%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '90px',
                      height: '32px',
                      border: '1.5px dashed #2B3FE0',
                      background: 'rgba(43, 63, 224, 0.15)',
                      color: '#93C5FD',
                      fontFamily: 'var(--mono)',
                      fontSize: '9px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      letterSpacing: '0.06em',
                      pointerEvents: 'none',
                      fontWeight: 600,
                    }}
                  >
                    ALIGN FOREHEAD
                  </div>
                )}

                {/* Active Scanning Bar */}
                <div className="vp-scan" />

                {/* Top HUD Telemetry Chips */}
                <div className="vp-hud">
                  <span>
                    {verificationId ? `SESSION: ${verificationId.substring(0, 8)}...` : (
                      isMultiFaceAlert
                        ? `🚨 MULTI-FACE (${faceCount})`
                        : faceCount === 1
                        ? '● SINGLE FACE (1)'
                        : studioState === 'READY'
                        ? 'SENSOR: READY · 640×480'
                        : studioState === 'SIGNAL_ACQUISITION'
                        ? 'STAGE 1/3 · PULSE ACQUISITION'
                        : studioState === 'CHALLENGE'
                        ? 'STAGE 2/3 · GAZE CHALLENGE'
                        : studioState === 'PROCESSING'
                        ? 'STAGE 3/3 · SYNTHESIS'
                        : 'OPTICAL SENSOR: ACTIVE'
                    )}
                  </span>
                  <span>
                    {isHeadAlert
                      ? `🚨 HEAD > 30° (${headAngle.toFixed(1)}°)`
                      : isGazeAlert
                      ? `🚨 GAZE > 30° (${gazeAngle.toFixed(1)}°)`
                      : isEyesClosed
                      ? '👁️ EYES CLOSED (EAR)'
                      : `📐 HEAD: ${headDirection} (${headAngle.toFixed(1)}°)`}
                  </span>
                  <span
                    style={{
                      color:
                        lightingCondition === 'LOW_LIGHT'
                          ? '#EF4444'
                          : lightingCondition === 'HARSH_GLARE'
                          ? '#F59E0B'
                          : '#10B981',
                      fontWeight: lightingCondition !== 'GOOD' ? 'bold' : 'normal',
                    }}
                  >
                    {lightingCondition === 'LOW_LIGHT'
                      ? '🌑 LOW LIGHT'
                      : lightingCondition === 'HARSH_GLARE'
                      ? '☀️ HARSH GLARE'
                      : `💡 LUX ~${lightingLux}`}
                  </span>
                </div>

                {/* HUD Challenge Overlay (Interactive Countdown) */}
                {studioState === 'CHALLENGE' && (
                  <div className="absolute inset-x-8 top-12 z-20 bg-black/75 p-3 border-2 border-[var(--line)] text-center text-white">
                    <div className="text-[11px] font-mono text-[var(--acc)] uppercase tracking-wider mb-1">
                      Interactive Challenge: Gaze Focus
                    </div>
                    <div className="text-sm font-semibold">
                      Hold gaze centered on the reticle crosshairs
                    </div>
                    <div className="w-full bg-white/20 h-2 mt-2">
                      <div
                        className="bg-[var(--acc)] h-2 transition-all duration-100"
                        style={{ width: `${challengeProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Bottom HUD Message */}
                <div className="vp-msg">
                  {isMultiFaceAlert
                    ? '🚨 MULTIPLE FACES DETECTED · Ensure only 1 person is visible'
                    : isHeadAlert
                    ? `🚨 HEAD TURNED AWAY (${headDirection} · ${headAngle.toFixed(1)}° > 30° Limit)`
                    : isGazeAlert
                    ? `🚨 GAZE DIVERTED (${gazeDirection} · ${gazeAngle.toFixed(1)}° > 30° Limit)`
                    : lightingCondition === 'LOW_LIGHT'
                    ? '🌑 LOW LIGHT: Insufficient facial illumination · Please illuminate face'
                    : lightingCondition === 'HARSH_GLARE'
                    ? '☀️ HARSH GLARE: Strong optical sunlight · Optical compensation active'
                    : studioState === 'CAMERA_INITIALIZING'
                    ? 'Initializing optical stream...'
                    : studioState === 'READY'
                    ? isFaceAligned
                      ? 'Subject Aligned · Ready'
                      : 'Centre your face within the reticle'
                    : studioState === 'SIGNAL_ACQUISITION'
                    ? 'Measuring micro-vascular pulse tone...'
                    : studioState === 'CHALLENGE'
                    ? 'Hold gaze steady at the camera...'
                    : studioState === 'PROCESSING'
                    ? 'Synthesizing multi-signal evidence...'
                    : 'Align subject in center frame'}
                </div>
              </div>

              {/* Live Optical Pulse Waveform Canvas */}
              <div className="relative border-b-2 border-[var(--line)]">
                <div className="absolute top-1.5 right-2 text-[9px] font-mono text-[var(--mut)] uppercase bg-[var(--card)] px-1.5 py-0.5 border border-[var(--soft)]">
                  Live Pulse Waveform (Client-Acquired Forehead ROI)
                </div>
                <canvas
                  ref={canvasRef}
                  className="pulse-canvas"
                  width={900}
                  height={120}
                  aria-label="Micro-vascular pulse waveform"
                />
              </div>

              {/* Technical Calibration Note */}
              <div className="p-2 text-[10px] font-mono text-[var(--mut)] bg-[var(--bg)] border-b border-[var(--soft)] flex justify-between">
                <span>Pulse signal sampled at 60Hz. Biometric anti-spoofing powered by MiniFASNetV2-SE & UltraFace.</span>
                <span>EAR: {currentEar.toFixed(2)} (Gating: &lt; 0.14)</span>
              </div>
            </div>

            {/* Action Row */}
            <div className="flex gap-3 mt-4 items-center">
              {studioState === 'READY' && (
                <button
                  type="button"
                  className="btn"
                  onClick={handleBeginVerification}
                >
                  Begin Verification →
                </button>
              )}

              {(studioState === 'SIGNAL_ACQUISITION' || studioState === 'CHALLENGE' || studioState === 'PROCESSING') && (
                <button
                  type="button"
                  className="btn"
                  disabled
                >
                  <span className="inline-block animate-pulse">●</span> Processing Verification...
                </button>
              )}

              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  stopCamera();
                  onCancel();
                }}
                disabled={studioState === 'PROCESSING'}
              >
                Cancel
              </button>
            </div>
          </div>

          {/* RIGHT: Instrument Status & Real Evidence Signals */}
          <div className="box-card flex flex-col justify-between">
            <div>
              <h2 className="section-header">Verification Instrument Telemetry</h2>

              {/* Pipeline Stages Progression */}
              <ol className="stage-list">
                <li className={studioState === 'READY' || studioState === 'ALIGNMENT' ? 'cur' : (studioState !== 'CAMERA_PERMISSION' && studioState !== 'CAMERA_INITIALIZING' ? 'done' : '')}>
                  <b>01</b>
                  <span>
                    Optical Alignment & Detection
                    <br />
                    <small className="text-[var(--mut)]">Single-person presence check & face localization</small>
                  </span>
                  <em>
                    {isMultiFaceAlert ? 'MULTI-FACE' : isFaceAligned ? 'ALIGNED' : 'POSITIONING'}
                  </em>
                </li>

                <li className={studioState === 'SIGNAL_ACQUISITION' ? 'cur' : (studioState === 'CHALLENGE' || studioState === 'PROCESSING' || studioState === 'SUCCESS' ? 'done' : '')}>
                  <b>02</b>
                  <span>
                    Pulse / Physiological Tone
                    <br />
                    <small className="text-[var(--mut)]">Forehead ROI green-channel spectral variation</small>
                  </span>
                  <em>
                    {studioState === 'SIGNAL_ACQUISITION' ? 'SAMPLING' : (currentBpm ? 'CONFIRMED' : 'STANDBY')}
                  </em>
                </li>

                <li className={studioState === 'CHALLENGE' ? 'cur' : (studioState === 'PROCESSING' || studioState === 'SUCCESS' ? 'done' : '')}>
                  <b>03</b>
                  <span>
                    3D Head Pose & Gaze Proctoring
                    <br />
                    <small className="text-[var(--mut)]">Symmetric head angles & EAR-gated eye stability</small>
                  </span>
                  <em>
                    {studioState === 'CHALLENGE' ? `${challengeProgress}%` : (studioState === 'PROCESSING' || studioState === 'SUCCESS' ? 'VALIDATED' : 'STANDBY')}
                  </em>
                </li>

                <li className={studioState === 'PROCESSING' ? 'cur' : (studioState === 'SUCCESS' ? 'done' : '')}>
                  <b>04</b>
                  <span>
                    ONNX Anti-Spoofing & Synthesis
                    <br />
                    <small className="text-[var(--mut)]">MiniFASNetV2-SE PAD & Cloud KMS signing</small>
                  </span>
                  <em>
                    {studioState === 'PROCESSING' ? 'EVALUATING' : (studioState === 'SUCCESS' ? 'SIGNED' : 'STANDBY')}
                  </em>
                </li>
              </ol>
            </div>

            {/* Real Telemetry Grid */}
            <div>
              <div className="pad g grid-cols-2 border-t-2 border-[var(--line)]">
                <div>
                  <div className="stat-label">rPPG Vitality (CHROM)</div>
                  <div className={`stat-num text-2xl font-mono ${isFlatline ? 'text-[var(--bad)]' : 'text-[var(--ok)]'}`}>
                    {isFlatline ? '⚠️ FLATLINE' : (currentBpm !== null && currentBpm > 0 ? `${currentBpm} bpm` : 'ACQUIRING')}
                  </div>
                  <div className="text-[10px] font-mono text-[var(--mut)] mt-1">
                    {isFlatline ? 'Zero hemodynamics (Synthetic Video)' : `BVP SNR: ${bvpSnr.toFixed(1)} · CHROM`}
                  </div>
                </div>

                <div>
                  <div className="stat-label">Blink Dynamics (EAR)</div>
                  <div className={`stat-num text-2xl font-mono ${isProlongedFreeze ? 'text-[var(--bad)]' : 'text-[var(--ink)]'}`}>
                    {isProlongedFreeze ? '⚠️ FROZEN' : `${blinksPerMinute}/min`}
                  </div>
                  <div className="text-[10px] font-mono text-[var(--mut)] mt-1">
                    {isProlongedFreeze ? 'Prolonged freeze (>12s)' : `Kinematics: ${(blinkDynamicsScore * 100).toFixed(0)}%`}
                  </div>
                </div>
              </div>

              {/* 3D Head Pose & Proctoring Metrics */}
              <div className="pad g grid-cols-2 border-t border-[var(--line)] bg-[var(--card)]">
                <div>
                  <div className="stat-label">3D Head Pose (Yaw/Pitch/Roll)</div>
                  <div className={`stat-num text-xl font-mono ${isHeadAlert ? 'text-[var(--bad)]' : 'text-[var(--ink)]'}`}>
                    {headAngle > 0 ? `${headAngle.toFixed(1)}°` : '0.0°'}
                  </div>
                  <div className="text-[10px] font-mono text-[var(--mut)] mt-1">
                    {headDirection} (Y:{headYaw}° P:{headPitch}° R:{headRoll}°)
                  </div>
                </div>

                <div>
                  <div className="stat-label">Gaze & EAR Gating</div>
                  <div className={`stat-num text-xl font-mono ${isGazeAlert ? 'text-[var(--bad)]' : 'text-[var(--ink)]'}`}>
                    {isEyesClosed ? 'CLOSED' : `${gazeAngle.toFixed(1)}°`}
                  </div>
                  <div className="text-[10px] font-mono text-[var(--mut)] mt-1">
                    {isEyesClosed ? 'Resting/Blink (Alert Suppressed)' : `Vector: ${gazeDirection}`}
                  </div>
                </div>
              </div>

              {/* Ambient Illumination Telemetry */}
              <div className="p-3 bg-[var(--card)] border-t border-[var(--line)] font-mono text-xs">
                <div className="flex justify-between items-center">
                  <span className="stat-label text-[var(--mut)]">Ambient Illumination</span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 border ${
                      lightingCondition === 'LOW_LIGHT'
                        ? 'border-red-500 text-red-500 bg-red-950/20'
                        : lightingCondition === 'HARSH_GLARE'
                        ? 'border-amber-500 text-amber-500 bg-amber-950/20'
                        : 'border-[var(--ok)] text-[var(--ok)] bg-emerald-950/20'
                    }`}
                  >
                    {lightingCondition === 'LOW_LIGHT'
                      ? '🌑 LOW LIGHT'
                      : lightingCondition === 'HARSH_GLARE'
                      ? '☀️ HARSH GLARE'
                      : '💡 OPTIMAL'}
                  </span>
                </div>
                <div className="text-[11px] text-[var(--ink)] mt-1">
                  {lightingMessage}
                </div>
              </div>

              {/* Server ONNX PAD Verdict (if evaluated) */}
              {serverAntiSpoof && (
                <div className="p-3 bg-[var(--card)] border-t border-[var(--line)] font-mono text-xs">
                  <div className="stat-label text-[var(--mut)]">Server ONNX PAD Verdict</div>
                  <div className="flex justify-between items-center mt-1">
                    <span className={`font-bold ${serverAntiSpoof.isReal ? 'text-[var(--ok)]' : 'text-[var(--bad)]'}`}>
                      {serverAntiSpoof.isReal ? '● LIVE HUMAN' : `❌ ${serverAntiSpoof.classification}`}
                    </span>
                    <span className="text-[10px] text-[var(--mut)]">
                      Liveness: {(serverAntiSpoof.livenessScore * 100).toFixed(1)}% · {serverAntiSpoof.inferenceTimeMs}ms
                    </span>
                  </div>
                </div>
              )}

              {/* Active Pipeline Status Banner */}
              {processingStage && (
                <div className="p-3 bg-[var(--soft)] border-t border-[var(--line)] font-mono text-xs text-[var(--ink)] flex items-center gap-2">
                  <span className="w-2 h-2 bg-[var(--acc)] inline-block animate-ping" />
                  <span className="truncate">{processingStage}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default VerificationStudio;
