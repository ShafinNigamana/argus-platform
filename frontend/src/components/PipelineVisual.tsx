import React, { useState } from 'react';
import { Camera, Activity, BrainCircuit, ShieldAlert, FileKey } from 'lucide-react';

interface StageInfo {
  id: number;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  tag: string;
  details: string;
  specs: string[];
}

export const PipelineVisual: React.FC = () => {
  const [selectedStage, setSelectedStage] = useState<number>(2);

  const stages: StageInfo[] = [
    {
      id: 1,
      label: 'Camera Capture',
      sublabel: 'Biometric Framing',
      icon: <Camera className="w-5 h-5 text-cyan-400" />,
      tag: 'EDGE INGESTION',
      details: 'High-speed edge face alignment and pose estimation. Enforces single-person presence with zero raw video transmission or storage.',
      specs: ['15-30 FPS Real-time', 'Biometric Oval HUD', 'Privacy-Preserving ROI'],
    },
    {
      id: 2,
      label: 'Signal Extraction',
      sublabel: 'Forehead rPPG Spectrum',
      icon: <Activity className="w-5 h-5 text-emerald-400" />,
      tag: 'PHYSIOLOGICAL SENSING',
      details: 'Samples microscopic green-channel hemoglobin absorption variations across the forehead capillary bed. Performs rolling FFT to isolate cardiovascular pulse frequencies.',
      specs: ['520-560nm Optical Band', 'Capillary Peak Detection', 'Live BPM Calibration'],
    },
    {
      id: 3,
      label: 'Challenge-Response',
      sublabel: 'Dynamic Reflex Timing',
      icon: <BrainCircuit className="w-5 h-5 text-indigo-400" />,
      tag: 'ANTI-REPLAY DEFENSE',
      details: 'Issues unpredictable, time-bounded micro-challenges (e.g. natural blink sequence or head turn). Evaluates reaction latency to defeat deepfakes, replay scripts, and synthetic injection.',
      specs: ['Millisecond Reaction Tracking', 'Dynamic Nonce Validation', 'Playback Defense'],
    },
    {
      id: 4,
      label: 'AI Intelligence',
      sublabel: 'Forensic Score Fusion',
      icon: <ShieldAlert className="w-5 h-5 text-purple-400" />,
      tag: 'ADAPTIVE REASONING',
      details: 'Evaluates signal authenticity using multimodal reasoning. Blends physiological rPPG frequency stability with behavioral movement naturalness into a unified confidence score.',
      specs: ['Gemini 2.5 Flash-Lite / Vertex AI', 'Thinking Mode Reasoning', 'Multi-Modal Signal Fusion'],
    },
    {
      id: 5,
      label: 'Trust Ledger',
      sublabel: 'Cryptographic Certificate',
      icon: <FileKey className="w-5 h-5 text-amber-400" />,
      tag: 'DIGITAL ATTESTATION',
      details: 'Anchors successful verification into an immutable trust certificate signed by Google Cloud KMS hardware keys. Verifiable by downstream enterprise systems.',
      specs: ['Cloud KMS Asymmetric Signing', 'SHA-256 Digest', 'Firestore Ledger Audit Chain'],
    },
  ];

  return (
    <div className="card-glass p-6 md:p-8 relative overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400 pulse-indicator" />
            <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold">
              Real-Time Verification Architecture
            </span>
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-white">The Multi-Layered Argus Pipeline</h3>
        </div>
        <p className="text-xs text-slate-400 max-w-sm">
          Click on any stage below to inspect the actual scientific and cryptographic operations performed during verification.
        </p>
      </div>

      {/* Interactive Horizontal Pipeline */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {stages.map((stage, idx) => {
          const isSelected = selectedStage === stage.id;
          return (
            <div
              key={stage.id}
              onClick={() => setSelectedStage(stage.id)}
              className={`p-4 rounded-xl cursor-pointer transition-all border relative flex flex-col justify-between select-none ${
                isSelected
                  ? 'bg-slate-900/90 border-cyan-500/50 shadow-[0_0_20px_rgba(0,242,254,0.15)] ring-1 ring-cyan-500/30'
                  : 'bg-slate-900/40 border-white/[0.06] hover:bg-slate-900/60 hover:border-white/[0.15]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-slate-800/80 border border-white/[0.05]">
                    {stage.icon}
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 font-semibold">
                    0{idx + 1}
                  </span>
                </div>
                <div className="text-[10px] uppercase font-mono tracking-wider font-semibold text-slate-400 mb-1">
                  {stage.tag}
                </div>
                <h4 className="text-sm font-bold text-white leading-tight mb-1">{stage.label}</h4>
                <p className="text-xs text-slate-400">{stage.sublabel}</p>
              </div>

              {isSelected && (
                <div className="mt-3 pt-2 border-t border-cyan-500/20 text-[11px] font-mono text-cyan-400 flex items-center gap-1 font-semibold">
                  <span>● Inspecting</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Active Stage Deep Dive */}
      {selectedStage && (
        <div className="bg-[#0B0E14] rounded-xl p-5 border border-cyan-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-cyan-400/10 text-cyan-400 border border-cyan-400/20">
                {stages[selectedStage - 1].tag}
              </span>
              <span className="text-sm font-semibold text-white">
                {stages[selectedStage - 1].label} — {stages[selectedStage - 1].sublabel}
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              {stages[selectedStage - 1].details}
            </p>
          </div>

          <div className="flex flex-wrap md:flex-col gap-2 shrink-0">
            {stages[selectedStage - 1].specs.map((spec, sIdx) => (
              <div 
                key={sIdx}
                className="flex items-center gap-2 text-[11px] font-mono text-slate-300 px-3 py-1.5 rounded-lg bg-slate-900 border border-white/[0.08]"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span>{spec}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
