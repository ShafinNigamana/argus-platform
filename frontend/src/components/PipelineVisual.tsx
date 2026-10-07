import React, { useState } from 'react';
import { Camera, Activity, BrainCircuit, ShieldAlert, FileKey, ChevronRight } from 'lucide-react';

interface StageInfo {
  id: number;
  label: string;
  sublabel: string;
  icon: React.FC<{ className?: string }>;
  tag: string;
  color: string;
  glow: string;
  borderColor: string;
  details: string;
  specs: string[];
}

export const PipelineVisual: React.FC = () => {
  const [selectedStage, setSelectedStage] = useState<number>(2);

  const stages: StageInfo[] = [
    {
      id: 1,
      label: 'Camera input',
      sublabel: 'Local sampling',
      icon: Camera,
      tag: 'IN BROWSER',
      color: 'text-sky-400',
      glow: 'rgba(14,165,233,0.15)',
      borderColor: 'rgba(14,165,233,0.3)',
      details:
        'The browser requests camera access and samples a fixed forehead region locally. This interface does not perform facial landmark or single-person detection.',
      specs: ['Camera permission required', 'Frames sampled in browser', 'No video upload in this flow'],
    },
    {
      id: 2,
      label: 'Signal Extraction',
      sublabel: 'Green-channel sampling',
      icon: Activity,
      tag: 'LOCAL ESTIMATE',
      color: 'text-emerald-400',
      glow: 'rgba(16,185,129,0.15)',
      borderColor: 'rgba(16,185,129,0.3)',
      details:
        'A lightweight browser detector samples green-channel changes and estimates pulse from detected peaks. This estimate alone is not identity or liveness proof.',
      specs: ['Green-channel samples', 'Peak interval estimate', 'Signal quality indicator'],
    },
    {
      id: 3,
      label: 'Challenge-Response',
      sublabel: 'Timed action prompt',
      icon: BrainCircuit,
      tag: 'SERVICE VALIDATION',
      color: 'text-indigo-400',
      glow: 'rgba(99,102,241,0.15)',
      borderColor: 'rgba(99,102,241,0.3)',
      details:
        'The interface shows a timed action prompt and sends the user confirmation and timestamp to the verification service. Camera based blink and head movement detection is not connected.',
      specs: ['Timed prompt', 'User confirmation', 'Backend response required'],
    },
    {
      id: 4,
      label: 'Verification result',
      sublabel: 'Backend evaluation',
      icon: ShieldAlert,
      tag: 'SERVICE RESULT',
      color: 'text-purple-400',
      glow: 'rgba(139,92,246,0.15)',
      borderColor: 'rgba(139,92,246,0.3)',
      details:
        'The frontend waits for the backend to return a terminal verification result. It displays the service provided score and reasoning when available, without calculating a replacement.',
      specs: ['Fetched by session ID', 'Service-provided score', 'Inconclusive if unavailable'],
    },
    {
      id: 5,
      label: 'Certificate',
      sublabel: 'Certificate lookup',
      icon: FileKey,
      tag: 'SERVICE RECORD',
      color: 'text-amber-400',
      glow: 'rgba(245,158,11,0.15)',
      borderColor: 'rgba(245,158,11,0.3)',
      details:
        'The interface requests a certificate for the session and presents fields returned by the service. It does not create a local certificate or verify the signature itself.',
      specs: ['Fetched by session ID', 'Signature shown as returned', 'No local substitute'],
    },
  ];

  const selected = stages[selectedStage - 1];

  return (
    <section className="workflow-panel relative overflow-hidden">
      {/* Top shimmer */}

      {/* Header */}
      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 pb-8"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 pulse-indicator" style={{ boxShadow: '0 0 8px rgba(0,242,254,0.6)' }} />
            <span className="text-[11px] font-mono uppercase tracking-[0.15em] font-bold text-cyan-400">
              Verification workflow
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white">
            From camera input to service result
          </h2>
        </div>
        <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
          Select a step to see what this frontend performs and what it asks the verification service to return.
        </p>
      </div>

      {/* Pipeline nodes */}
      <div className="relative flex flex-col lg:flex-row items-stretch gap-2 mb-8">
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          const isActive = selectedStage === stage.id;
          return (
            <React.Fragment key={stage.id}>
              <button
                onClick={() => setSelectedStage(stage.id)}
                className="pipeline-stage flex-1 text-left group"
                aria-pressed={isActive}
                style={isActive ? {
                  borderColor: stage.borderColor,
                  boxShadow: `0 12px 40px rgba(0,0,0,0.6), 0 0 30px ${stage.glow.replace('0.15', '0.25')}`,
                  background: `linear-gradient(145deg, ${stage.glow} 0%, rgba(13,17,23,0.98) 100%)`,
                } : {}}
              >
                {/* Number + Icon */}
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center ${stage.color} transition-all duration-300`}
                    style={{
                      background: isActive ? stage.glow : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${isActive ? stage.borderColor : 'rgba(255,255,255,0.06)'}`,
                      boxShadow: isActive ? `0 0 20px ${stage.glow}` : 'none',
                    }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span
                    className="text-[11px] font-mono font-bold"
                    style={{ color: isActive ? stage.color.replace('text-', '') : 'rgba(255,255,255,0.15)' }}
                  >
                    0{idx + 1}
                  </span>
                </div>

                {/* Labels */}
                <div
                  className="text-[9px] uppercase font-mono font-bold tracking-widest mb-1.5"
                  style={{ color: isActive ? '#00F2FE' : 'rgba(100,116,139,1)' }}
                >
                  {stage.tag}
                </div>
                <h4 className="text-sm font-bold text-white leading-tight mb-1">{stage.label}</h4>
                <p className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">{stage.sublabel}</p>

                {/* Active indicator bar */}
                {isActive && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                    style={{ background: `linear-gradient(90deg, transparent, ${stage.borderColor}, transparent)` }}
                  />
                )}
              </button>

              {/* Arrow connector (not after last) */}
              {idx < stages.length - 1 && (
                <div className="hidden lg:flex items-center justify-center self-center shrink-0 px-1">
                  <ChevronRight
                    className="w-4 h-4"
                    style={{ color: 'rgba(0,242,254,0.3)' }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Detail panel */}
      <div
        key={selectedStage}
        className="workflow-detail-panel relative rounded-2xl p-6 overflow-hidden"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Text */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <span
                className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg tracking-widest uppercase"
                style={{
                  background: selected.glow,
                  color: '#00F2FE',
                  border: `1px solid ${selected.borderColor}`,
                }}
              >
                {selected.tag}
              </span>
              <span className="text-sm font-bold text-white">
                {selected.label} — {selected.sublabel}
              </span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
              {selected.details}
            </p>
          </div>

          {/* Spec pills */}
          <div className="flex flex-wrap md:flex-col gap-2 shrink-0">
            {selected.specs.map((spec, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-xs font-mono text-slate-300 px-3.5 py-2 rounded-xl"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: '#00F2FE', boxShadow: '0 0 6px rgba(0,242,254,0.7)' }}
                />
                {spec}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
