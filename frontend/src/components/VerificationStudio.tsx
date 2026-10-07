import React, { useState, useEffect, useRef, useCallback, useId } from 'react';
import { 
  Activity, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2 
} from 'lucide-react';
import { PulseDetector } from '../services/pulseDetector';
import { apiService } from '../services/api';
import type { VerifyResponse, ChallengeDefinition, ChallengeResponse } from '../types';

interface VerificationStudioProps {
  onVerificationComplete: (result: VerifyResponse) => void;
  onCancel: () => void;
}

type StepStage = 'SETUP' | 'ALIGNING' | 'COLLECTING_SIGNAL' | 'CHALLENGE' | 'PROCESSING';

const AVAILABLE_CHALLENGES: ChallengeDefinition[] = [
  {
    id: 'chl_blink_2',
    title: 'Blink action prompt',
    description: 'Blink twice, then confirm before the timer ends. The camera does not verify the blink.',
    type: 'BLINK',
    durationSeconds: 4,
  },
  {
    id: 'chl_turn_left',
    title: 'Head movement prompt',
    description: 'Turn your head left and return to center, then confirm. The camera does not verify the movement.',
    type: 'HEAD_LEFT',
    durationSeconds: 4,
  },
  {
    id: 'chl_hold_still',
    title: 'Stillness prompt',
    description: 'Hold still while the camera samples the optical signal, then confirm before the timer ends.',
    type: 'HOLD_STILL',
    durationSeconds: 3,
  },
];

export const VerificationStudio: React.FC<VerificationStudioProps> = ({
  onVerificationComplete,
  onCancel,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pulseDetectorRef = useRef<PulseDetector>(new PulseDetector());
  const challengeSubmittedRef = useRef(false);
  const processingStartedRef = useRef(false);
  const challengeStartedAtRef = useRef(0);
  const currentBpmRef = useRef(0);
  const verificationIdRef = useRef('');
  const lastUiUpdateAtRef = useRef(0);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState<StepStage>('SETUP');
  
  // Real-time signal states
  const [currentBpm, setCurrentBpm] = useState<number>(0);
  const [signalQuality, setSignalQuality] = useState<number>(0);
  const [isFaceAligned, setIsFaceAligned] = useState<boolean>(false);
  const [cameraReady, setCameraReady] = useState<boolean>(false);
  
  // Workflow progress
  const [activeChallenge, setActiveChallenge] = useState<ChallengeDefinition>(AVAILABLE_CHALLENGES[0]);
  const [challengeCountdown, setChallengeCountdown] = useState<number>(4);
  const [challengeValid, setChallengeValid] = useState<boolean | null>(null);
  const [challengeSubmitted, setChallengeSubmitted] = useState(false);
  const [challengeResponse, setChallengeResponse] = useState<ChallengeResponse | null>(null);

  // Processing pipeline stages
  const [pipelineState, setPipelineState] = useState({
    faceConfirmed: false,
    signalCaptured: false,
    challengeVerified: false,
    aiReasoningComplete: false,
    kmsRecordSecured: false,
  });

  // Active user / operation context
  const userId = 'usr_' + useId().replaceAll(':', '');
  const [operationType] = useState<string>('HIGH_VALUE_TRANSACTION');

  // 1. Initialize Camera
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = mediaStream;
      setCameraError(null);
      setCameraReady(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setCurrentStage('ALIGNING');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Camera access denied or unavailable';
      setCameraReady(false);
      setCameraError(errMsg);
    }
  };

  useEffect(() => {
    let cancelled = false;
    let activeStream: MediaStream | null = null;
    const videoElement = videoRef.current;
    const openCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
          },
          audio: false,
        });
        if (cancelled) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }
        activeStream = mediaStream;
        streamRef.current = mediaStream;
        setCameraError(null);
        setCameraReady(true);
        if (videoElement) videoElement.srcObject = mediaStream;
        setCurrentStage('ALIGNING');
      } catch (err: unknown) {
        if (cancelled) return;
        setCameraReady(false);
        setCameraError(err instanceof Error ? err.message : 'Camera access denied or unavailable');
      }
    };
    void openCamera();
    return () => {
      cancelled = true;
      activeStream?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoElement) videoElement.srcObject = null;
    };
  }, []);

  // 2. Video Frame Processing & Waveform Rendering Loop
  useEffect(() => {
    let animId: number;

    const loop = () => {
      const video = videoRef.current;
      const detector = pulseDetectorRef.current;
      const canvas = waveformCanvasRef.current;

      if (video && video.readyState >= 2 && detector) {
        // Process rPPG frame
        const state = detector.processFrame(video);
        const now = performance.now();
        if (now - lastUiUpdateAtRef.current >= 250) {
          const bpm = state.isFaceAligned ? state.bpm : 0;
          currentBpmRef.current = bpm;
          setIsFaceAligned(state.isFaceAligned);
          setSignalQuality(state.signalQuality);
          setCurrentBpm(bpm);
          lastUiUpdateAtRef.current = now;
        }

        // Render Waveform Canvas
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const w = canvas.width;
            const h = canvas.height;
            ctx.clearRect(0, 0, w, h);

            // Draw center gridline
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, h / 2);
            ctx.lineTo(w, h / 2);
            ctx.stroke();

            // Draw micro pulse waveform
            const history = state.pulseHistory;
            if (history.length > 1) {
              ctx.strokeStyle = state.isFaceAligned ? '#00F2FE' : 'rgba(148, 163, 184, 0.4)';
              ctx.lineWidth = 2;
              ctx.beginPath();

              const step = w / (history.length - 1);
              for (let i = 0; i < history.length; i++) {
                const x = i * step;
                // Invert y: higher value draws higher on canvas
                const y = h - (history[i] * (h - 8) + 4);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
              }
              ctx.stroke();
            }
          }
        }

      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  const submitChallengeResponse = useCallback(async (completed: boolean) => {
    if (challengeSubmittedRef.current) return;
    challengeSubmittedRef.current = true;
    setChallengeSubmitted(true);
    setChallengeResponse(null);
    let sessionId = verificationIdRef.current;
    if (!sessionId) {
      const session = await apiService.initiateVerification({ userId, operationType });
      sessionId = session.verificationId;
      verificationIdRef.current = sessionId;
    }

    const response = await apiService.submitChallenge(sessionId, {
      challengeId: activeChallenge.id,
      response: { completed, durationMs: Math.max(0, Date.now() - challengeStartedAtRef.current) },
      timestamp: Date.now(),
    });
    setChallengeResponse(response);
    setChallengeValid(response.valid);
    setPipelineState((state) => ({ ...state, challengeVerified: response.valid }));
    // Stage UI is driven by the active protocol step.
    processingStartedRef.current = false;
    setCurrentStage('PROCESSING');
  }, [activeChallenge, operationType, userId]);

  // State advances only after the corresponding camera, interaction, or service event.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (currentStage === 'ALIGNING' && isFaceAligned) {
      timer = setTimeout(() => {
        setPipelineState((state) => ({ ...state, faceConfirmed: true }));
        setCurrentStage('COLLECTING_SIGNAL');
      }, 1200);
    } else if (currentStage === 'COLLECTING_SIGNAL') {
      if (!verificationIdRef.current) {
        apiService.initiateVerification({ userId, operationType }).then((session) => {
          verificationIdRef.current = session.verificationId;
        });
      }
      let secondsCollected = 0;
      const interval = setInterval(() => {
        secondsCollected += 1;
        if (secondsCollected >= 4) {
          clearInterval(interval);
          setPipelineState((state) => ({ ...state, signalCaptured: true }));
          challengeSubmittedRef.current = false;
          setChallengeSubmitted(false);
          setChallengeValid(null);
          const nextChallenge = AVAILABLE_CHALLENGES[Math.floor(Math.random() * AVAILABLE_CHALLENGES.length)];
          setActiveChallenge(nextChallenge);
          setChallengeCountdown(nextChallenge.durationSeconds);
          challengeStartedAtRef.current = Date.now();
          setCurrentStage('CHALLENGE');
        }
      }, 1000);
      return () => clearInterval(interval);
    } else if (currentStage === 'CHALLENGE') {
      const interval = setInterval(() => {
        setChallengeCountdown((remaining) => {
          if (remaining <= 1) {
            clearInterval(interval);
            void submitChallengeResponse(false);
            return 0;
          }
          return remaining - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else if (currentStage === 'PROCESSING' && !processingStartedRef.current) {
      processingStartedRef.current = true;
      const finalize = async () => {
        const sessionId = verificationIdRef.current || (await apiService.initiateVerification({ userId, operationType })).verificationId;
        const response = await apiService.completeVerification(sessionId, {
          userId,
          averageBpm: currentBpmRef.current,
        });
        setPipelineState((state) => ({
          ...state,
          aiReasoningComplete: response.confidenceScore !== null || response.componentScores !== null,
        }));
        const certificate = await apiService.getCertificate(sessionId);
        setPipelineState((state) => ({ ...state, kmsRecordSecured: certificate !== null }));
        onVerificationComplete(response);
      };
      void finalize();
    }
    return () => clearTimeout(timer);
  }, [currentStage, challengeValid, isFaceAligned, onVerificationComplete, operationType, submitChallengeResponse, userId]);

  // Stage Header Text & Single Instruction
  const getInstruction = () => {
    switch (currentStage) {
      case 'SETUP':
        return {
          title: 'Initializing Optical Sensor',
          instruction: 'Please grant camera access to begin biometric verification.',
          badge: 'INITIALIZING',
        };
      case 'ALIGNING':
        return {
          title: 'Position forehead in the guide',
          instruction: isFaceAligned
            ? 'Skin region is inside the guide. Holding position…'
            : 'Center your forehead in the guide under steady lighting.',
          badge: isFaceAligned ? 'REGION ALIGNED' : 'POSITIONING',
        };
      case 'COLLECTING_SIGNAL':
        return {
          title: 'Collecting live signal',
          instruction: 'Hold still while Argus samples the camera feed. Signal values appear only when measured.',
          badge: 'SIGNAL CAPTURE',
        };
      case 'CHALLENGE':
        return {
          title: activeChallenge.title,
          instruction: activeChallenge.description,
          badge: `CHALLENGE (${challengeCountdown}s)`,
        };
      case 'PROCESSING':
        return {
          title: 'Waiting for verification result',
          instruction: 'The verification service is evaluating the submitted session. A score or trust record appears only when returned by the service.',
          badge: 'SERVICE REVIEW',
        };
    }
  };

  const instruction = getInstruction();
  const stageIndex = ['SETUP', 'ALIGNING', 'COLLECTING_SIGNAL', 'CHALLENGE', 'PROCESSING'].indexOf(currentStage);
  const stageProgress = ((stageIndex + 1) / 5) * 100;
  const scanning = currentStage === 'ALIGNING' || currentStage === 'COLLECTING_SIGNAL';

  return (
    <div className={`argus-page argus-verification-page stage-${currentStage.toLowerCase()}`}>
      {/* Studio Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 pulse-indicator" />
            <h2 className="text-xl font-bold text-white font-display">Live verification</h2>
            <span className="badge-status badge-cyan text-[10px]">Step {stageIndex + 1} / 5</span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Subject ID: <span className="font-mono text-slate-300">{userId}</span> | Operation: <span className="font-mono text-cyan-400">{operationType}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={onCancel}
            className="btn-outline text-xs py-1.5 px-3"
          >
            Cancel Session
          </button>
        </div>
      </div>

      {/* Main Verification Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Biometric Viewport (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="camera-container">
            {/* Real WebRTC Video Stream */}
            <video 
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="video-stream"
            />

            {/* Subtle Scanning Scanline Effect */}
            {scanning && <div className="scanline-effect" />}

            {/* Sleek Biometric Face Alignment Guide */}
            <div 
              className={`biometric-oval ${
                currentStage === 'CHALLENGE' 
                  ? 'challenge' 
                  : isFaceAligned 
                  ? 'aligned' 
                  : 'warning'
              }`}
            />

            {/* Approximate signal sampling region */}
            <div className="rppg-target-roi">
              SIGNAL REGION
            </div>

            {/* HUD Corner Accents */}
            <div className="hud-corner hud-corner-tl" />
            <div className="hud-corner hud-corner-tr" />
            <div className="hud-corner hud-corner-bl" />
            <div className="hud-corner hud-corner-br" />

            {/* Top HUD Badges */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-mono">
                <span className={`w-2 h-2 rounded-full ${isFaceAligned ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span className="text-slate-200">{instruction.badge}</span>
              </div>

              <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-mono text-slate-300">
                <span className={`w-2 h-2 rounded-full ${cameraReady ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                <span>{cameraReady ? 'Camera ready' : 'Camera off'}</span>
              </div>
            </div>

            {/* Bottom HUD: Live Physiological Readout Bar */}
            <div className="absolute bottom-4 left-4 right-4 p-3 rounded-xl bg-black/75 backdrop-blur-md border border-white/10 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase text-slate-400">Pulse estimate</div>
                  <div className="text-sm font-bold font-mono text-emerald-400">
                    {isFaceAligned && currentBpm > 0 ? `${currentBpm} BPM` : isFaceAligned ? 'Sampling' : 'Align to sample'}
                  </div>
                </div>
              </div>

              <div className="h-6 w-[1px] bg-white/10 hidden sm:block" />

              <div className="flex-1 max-w-[180px] hidden sm:block">
                <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                  <span>Optical signal</span>
                  <span className="text-cyan-400">{signalQuality >= 0.55 ? 'Clear' : signalQuality > 0.2 ? 'Gathering' : 'Low'}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-cyan-400 transition-all duration-300"
                    style={{ width: `${signalQuality * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Camera Error Message Overlay */}
            {cameraError && (
              <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-6 text-center">
                <AlertCircle className="w-10 h-10 text-rose-400 mb-3" />
                <h4 className="text-white font-bold mb-1">Camera Stream Unavailable</h4>
                <p className="text-xs text-slate-400 max-w-xs mb-4">{cameraError}</p>
                <button onClick={startCamera} className="btn-primary text-xs py-2 px-4">
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Camera</span>
                </button>
              </div>
            )}
          </div>

          {/* Live Waveform Canvas */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.08]">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-2">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                Live optical signal
              </span>
              <span className="text-slate-500">Sampling region</span>
            </div>
            <canvas 
              ref={waveformCanvasRef}
              width={500}
              height={48}
              className="pulse-waveform-canvas"
            />
          </div>
        </div>

        {/* Right Column: Active Instruction & Pipeline Stages (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-4">
          {/* Active Step Panel */}
          <div className="card-glass p-5 rounded-2xl flex-1 flex flex-col justify-between">
            <div>
              {/* Progress bar */}
              <div className="mb-5">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
                  <span className="uppercase text-cyan-400 font-semibold">Verification protocol</span>
                  <span>Step {stageIndex + 1} of 5</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-white/5">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-500 rounded-full transition-all duration-300"
                    style={{ width: `${stageProgress}%` }}
                  />
                </div>
              </div>

              {/* Step Instruction Card */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 mb-5">
                <div className="text-[10px] font-mono uppercase font-bold text-cyan-400 tracking-wider mb-1">
                  CURRENT DIRECTIVE
                </div>
                <h3 className="text-lg font-bold text-white mb-2 font-display">
                  {instruction.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {instruction.instruction}
                </p>
              </div>

              {/* Challenge Active UI with Countdown */}
              {currentStage === 'CHALLENGE' && (
                <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30 mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-bold font-mono text-lg">
                      {challengeCountdown}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Interaction verification</div>
                      <div className="text-[11px] text-slate-400">Follow the instruction, then confirm</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => void submitChallengeResponse(true)}
                    disabled={challengeSubmitted}
                    className="btn-outline text-xs py-1.5 px-3"
                  >
                    Confirm action
                  </button>
                </div>
              )}
              {challengeResponse && !challengeResponse.valid && (
                <div className="mb-5 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-3 text-xs text-amber-200">
                  {challengeResponse.message}
                </div>
              )}

              {/* Processing Pipeline Checklist */}
              <div className="space-y-2.5">
                <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-semibold mb-2">
                  Verification Pipeline Checklist
                </div>

                <div className="flex items-center gap-2.5 text-xs">
                  {pipelineState.faceConfirmed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-600 shrink-0" />
                  )}
                  <span className={pipelineState.faceConfirmed ? 'text-white' : 'text-slate-400'}>
                    Forehead region positioned
                  </span>
                </div>

                <div className="flex items-center gap-2.5 text-xs">
                  {pipelineState.signalCaptured ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-600 shrink-0" />
                  )}
                  <span className={pipelineState.signalCaptured ? 'text-white' : 'text-slate-400'}>
                    Camera signal samples collected
                  </span>
                </div>

                <div className="flex items-center gap-2.5 text-xs">
                  {pipelineState.challengeVerified ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-600 shrink-0" />
                  )}
                  <span className={pipelineState.challengeVerified ? 'text-white' : 'text-slate-400'}>
                    Challenge response accepted by service
                  </span>
                </div>

                <div className="flex items-center gap-2.5 text-xs">
                  {pipelineState.aiReasoningComplete ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-600 shrink-0" />
                  )}
                  <span className={pipelineState.aiReasoningComplete ? 'text-white' : 'text-slate-400'}>
                    Confidence result returned by service
                  </span>
                </div>

                <div className="flex items-center gap-2.5 text-xs">
                  {pipelineState.kmsRecordSecured ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-600 shrink-0" />
                  )}
                  <span className={pipelineState.kmsRecordSecured ? 'text-white' : 'text-slate-400'}>
                    Trust certificate returned by service
                  </span>
                </div>
              </div>
            </div>

            {/* Privacy and processing status */}
            <div className="pt-4 mt-4 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono text-[11px]">Camera frames are processed in this browser.</span>
              <span className="text-[11px]">{currentStage === 'PROCESSING' ? 'Waiting for service response…' : 'No video upload'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
