import React from 'react';
import { ArrowRight, Lock, Activity, Key, Globe2, FileCheck2, Eye, Zap } from 'lucide-react';
import type { ActiveTab } from '../types';

interface HeroSectionProps {
  onStartVerification: () => void;
  setActiveTab: (tab: ActiveTab) => void;
}

const VerificationCore: React.FC = () => (
  <div className="verification-core" role="img" aria-label="Layered optical verification core with signal rings">
    <div className="verification-core-ring core-ring-outer"><span className="core-orbit-point" /></div>
    <div className="verification-core-ring core-ring-middle"><span className="core-tick core-tick-one" /><span className="core-tick core-tick-two" /></div>
    <div className="verification-core-ring core-ring-inner" />
    <div className="verification-core-center">
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r="44" fill="url(#coreGlow)" />
        <circle cx="60" cy="60" r="31" fill="none" stroke="rgba(94,234,212,.5)" strokeWidth="1" />
        <circle cx="60" cy="60" r="19" fill="rgba(8,20,27,.92)" stroke="rgba(165,243,252,.72)" strokeWidth="1.2" />
        <path d="M23 60h13l5-10 8 22 7-15 5 7h36" fill="none" stroke="#5eead4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <defs><radialGradient id="coreGlow"><stop stopColor="#5eead4" stopOpacity=".24"/><stop offset="1" stopColor="#5eead4" stopOpacity="0"/></radialGradient></defs>
      </svg>
    </div>
    <div className="core-data-label core-label-top"><span className="core-status-dot" />OPTICAL INPUT</div>
    <div className="core-data-label core-label-bottom">SIGNAL → TRUST</div>
  </div>
);

export const HeroSection: React.FC<HeroSectionProps> = ({ onStartVerification, setActiveTab }) => {
  const metrics = [
    { label: 'Camera', dot: 'bg-cyan-400', desc: 'Capture' },
    { label: 'Optical signal', dot: 'bg-emerald-400', desc: 'Sample' },
    { label: 'Timed prompt', dot: 'bg-indigo-400', desc: 'Respond' },
    { label: 'Verification', dot: 'bg-violet-400', desc: 'Service result' },
    { label: 'Certificate', dot: 'bg-purple-400', desc: 'When returned' },
  ];

  const modules = [
    {
      icon: Activity,
      tag: 'MODULE 1 • PHYSIOLOGICAL',
      tagColor: 'text-cyan-400',
      iconBg: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
      title: 'rPPG Pulse Extraction',
      desc: 'Samples green-channel variation from the camera region of interest and estimates pulse only after enough signal peaks are available.',
      spec1: 'Green-channel ROI',
      spec2: 'Measured locally',
      spec2Color: 'text-emerald-400',
      cardClass: 'stat-card-3d stat-card-cyan',
    },
    {
      icon: Eye,
      tag: 'MODULE 2 • INTERACTION',
      tagColor: 'text-indigo-400',
      iconBg: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
      title: 'Challenge-response protocol',
      desc: 'The session can request a timed action. The verification service decides whether the submitted response is valid; the interface does not claim to detect an action it cannot measure.',
      spec1: 'Session-bound action',
      spec2: 'Service evaluated',
      spec2Color: 'text-indigo-400',
      cardClass: 'stat-card-3d stat-card-indigo',
    },
    {
      icon: Key,
      tag: 'MODULE 3 • CRYPTOGRAPHIC',
      tagColor: 'text-purple-400',
      iconBg: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
      title: 'Trust record',
      desc: 'When the verification service returns a certificate, Argus presents its identifier, signature and status for inspection or export.',
      spec1: 'Returned by service',
      spec2: 'No local signature',
      spec2Color: 'text-purple-400',
      cardClass: 'stat-card-3d stat-card-purple',
    },
  ];

  return (
    <div className="space-y-16">
      {/* ── HERO SECTION ── */}
      <div className="argus-hero relative max-w-6xl mx-auto overflow-hidden rounded-[32px]">
        {/* Radial inner glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 55% 85% at 75% 50%, rgba(0,242,254,0.09) 0%, transparent 70%)',
          }}
        />

        <div className="argus-hero-content relative z-10">
          {/* Product label */}
          <div className="argus-hero-badge inline-flex items-center gap-2.5 px-4 py-2 rounded-full border mb-8"
            style={{
              background: 'rgba(0,242,254,0.05)',
              borderColor: 'rgba(0,242,254,0.2)',
              boxShadow: '0 0 20px rgba(0,242,254,0.08)',
            }}>
            <span className="w-2 h-2 rounded-full bg-cyan-400 pulse-indicator" />
            <span className="text-xs font-mono font-bold tracking-widest text-cyan-400 uppercase">
              ARGUS · HUMAN VERIFICATION & DIGITAL TRUST
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wide">Camera · Signal · Trust</span>
          </div>

          <div className="argus-hero-grid">
            <div className="argus-hero-copy">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.02] mb-6">
                <span className="text-white">Trust the</span><br />
                <span className="gradient-text-cyan">human.</span>
              </h1>

              <p className="text-base sm:text-lg text-slate-300 leading-relaxed mb-8 max-w-xl">
                A camera-based liveness workflow that samples optical signal, requests a session challenge, and displays only the verification result returned by the service.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-3 mb-9">
                <button onClick={onStartVerification} className="btn-primary w-full sm:w-auto text-base py-4 px-7">
                  <Activity className="w-5 h-5" />
                  <span>Start verification</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button onClick={() => setActiveTab('architecture')} className="btn-secondary w-full sm:w-auto text-base py-4 px-6">
                  <Lock className="w-4 h-4 text-slate-400" />
                  <span>Explore the platform</span>
                </button>
              </div>

              <div className="argus-hero-assurance flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400">
                <span><Lock className="w-3.5 h-3.5" /> Video frames stay in browser</span>
                <span><Key className="w-3.5 h-3.5" /> Certificate only when issued</span>
              </div>
            </div>

            <div className="argus-hero-art" aria-label="Argus optical signal verification core">
              <div className="argus-orbit-label argus-orbit-label-top"><Activity className="w-3.5 h-3.5" /> OPTICAL SIGNAL CORE</div>
              <VerificationCore />
              <div className="argus-orbit-label argus-orbit-label-bottom">CAMERA <ArrowRight className="w-3 h-3" /> SIGNAL <ArrowRight className="w-3 h-3" /> TRUST</div>
            </div>
          </div>

          {/* Metrics strip */}
          <div className="argus-metrics flex flex-wrap items-center justify-center gap-6 sm:gap-10 pt-6 border-t"
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            {metrics.map((m, i) => (
              <div key={i} className="flex flex-col items-center gap-1 group cursor-default">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${m.dot}`} />
                  <span className="text-xs font-mono font-bold text-slate-300 group-hover:text-white transition-colors">{m.label}</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wide">{m.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── MODULE BENTO CARDS ── */}
      <div className="argus-section-heading -mb-10">
        <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold">Product capabilities</span>
        <h2 className="text-2xl sm:text-3xl font-bold text-white">A clear path from signal to service result</h2>
        <p className="text-sm text-slate-400 max-w-2xl">Each step reflects what the current interface and connected service actually provide.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {modules.map((mod, i) => {
          const Icon = mod.icon;
          return (
            <div
              key={i}
              className={`${mod.cardClass} flex flex-col justify-between`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              {/* Shimmer */}
              <div>
                <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center mb-5 ${mod.iconBg}`}
                  style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className={`text-[10px] font-mono uppercase font-bold tracking-widest ${mod.tagColor} mb-2`}>
                  {mod.tag}
                </div>
                <h3 className="text-lg font-bold text-white mb-3">{mod.title}</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{mod.desc}</p>
              </div>

              <div className="mt-6 pt-4 flex items-center justify-between text-xs font-mono"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-slate-500">{mod.spec1}</span>
                <span className={`font-bold ${mod.spec2Color}`}>{mod.spec2}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── IMPACT BANNER ── */}
      <div
        className="card-3d p-7 md:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 overflow-hidden relative"
        style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.05) 0%, rgba(13,17,23,0.98) 50%, rgba(14,165,233,0.04) 100%)' }}
      >
        <div className="shimmer-line" />
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
            style={{
              background: 'rgba(16,185,129,0.1)',
              border: '1px solid rgba(16,185,129,0.25)',
              boxShadow: '0 0 20px rgba(16,185,129,0.15)',
            }}>
            <Globe2 className="w-7 h-7 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-mono uppercase font-bold tracking-widest text-amber-400">
                Trust records
              </span>
            </div>
            <h4 className="text-sm sm:text-base font-bold text-white mb-1">
              Certificate lookup
            </h4>
            <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
              Search for a certificate returned by the verification service. If no certificate is available, Argus reports that result without creating one locally.
            </p>
          </div>
        </div>

        <button
          onClick={() => setActiveTab('certificate')}
          className="btn-outline shrink-0 text-xs py-2.5 px-4"
        >
          <FileCheck2 className="w-4 h-4 text-cyan-400" />
          <span>Open certificate lookup</span>
        </button>
      </div>
    </div>
  );
};
