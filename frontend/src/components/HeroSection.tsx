import React from 'react';
import { ShieldCheck, ArrowRight, Lock, Eye, Activity, Key, Globe2, FileCheck2 } from 'lucide-react';
import type { ActiveTab } from '../types';

interface HeroSectionProps {
  onStartVerification: () => void;
  setActiveTab: (tab: ActiveTab) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onStartVerification,
  setActiveTab,
}) => {
  return (
    <div className="space-y-12">
      {/* Primary Hero */}
      <div className="relative text-center max-w-3xl mx-auto pt-6 pb-2">
        {/* Subtle pill tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-cyan-500/30 text-xs font-mono text-cyan-400 mb-6 shadow-[0_0_15px_rgba(0,242,254,0.1)]">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 pulse-indicator" />
          <span>ARGUS DIGITAL TRUST PLATFORM 2026</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">GOOGLE SOLUTION CHALLENGE SGP</span>
        </div>

        {/* Main Display Title */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.1] mb-6">
          Real Human Verification. <br />
          <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
            Cryptographic Proof.
          </span>
        </h1>

        {/* Human-readable explanation */}
        <p className="text-base sm:text-lg text-slate-300 leading-relaxed mb-8 max-w-2xl mx-auto">
          Argus answers the critical zero-trust question: <strong className="text-white font-medium">“Is a genuine, living human actively present right now?”</strong> Combining physiological vascular signals, reflex challenges, and hardware-secured KMS certificates to defeat deepfakes and replay fraud.
        </p>

        {/* Hero Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button 
            onClick={onStartVerification}
            className="btn-primary w-full sm:w-auto text-base py-3.5 px-7"
          >
            <ShieldCheck className="w-5 h-5" />
            <span>Start Live Verification</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button 
            onClick={() => setActiveTab('architecture')}
            className="btn-secondary w-full sm:w-auto text-base py-3.5 px-6"
          >
            <Lock className="w-4 h-4 text-slate-400" />
            <span>Technical Specifications</span>
          </button>
        </div>

        {/* Live Metrics / Capability Pill */}
        <div className="mt-10 pt-6 border-t border-white/[0.08] flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>&gt;90% Target Accuracy</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>rPPG Pulse Sensing</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            <span>SHA-256 KMS Certificate</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <span>Zero Video Storage</span>
          </div>
        </div>
      </div>

      {/* Bento Grid: Core Technical Modules from PRD & TDD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Module 1: Physiological Liveness */}
        <div className="card-glass p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4 text-cyan-400">
              <Activity className="w-5 h-5" />
            </div>
            <div className="text-[11px] font-mono uppercase font-semibold text-cyan-400 tracking-wider mb-1">
              MODULE 1 • PHYSIOLOGICAL SENSING
            </div>
            <h3 className="text-lg font-bold text-white mb-2">rPPG Pulse Extraction</h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Detects microscopic volumetric skin capillary expansion caused by systolic cardiac cycles. Uses the green optical spectrum (520–560nm) to calculate genuine heart-rate variability without wearable sensors.
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Spectrum: 520–560nm</span>
            <span className="text-emerald-400 font-semibold">Active Engine</span>
          </div>
        </div>

        {/* Module 2: Anti-Replay Challenge */}
        <div className="card-glass p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4 text-indigo-400">
              <Eye className="w-5 h-5" />
            </div>
            <div className="text-[11px] font-mono uppercase font-semibold text-indigo-400 tracking-wider mb-1">
              MODULE 2 • BEHAVIORAL REFLEX
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Dynamic Anti-Replay Defense</h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Issues randomized, millisecond-bounded challenges (natural blink cycles, head turns, and gaze tracking). Microsecond response evaluation prevents bot scripts, virtual camera injection, and video loops.
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Response Latency: &lt;3000ms</span>
            <span className="text-indigo-400 font-semibold">Dynamic Nonce</span>
          </div>
        </div>

        {/* Module 3: Digital Trust Ledger */}
        <div className="card-glass p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4 text-purple-400">
              <Key className="w-5 h-5" />
            </div>
            <div className="text-[11px] font-mono uppercase font-semibold text-purple-400 tracking-wider mb-1">
              MODULE 3 • CRYPTOGRAPHIC TRUST
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Hardware-Signed Certificates</h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Every verification generates a canonical JSON attestation signed via Google Cloud KMS asymmetric keys. Mathematically verifiable by downstream banking, examination, or access gateways.
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Signature: SHA-256 / RSA</span>
            <span className="text-purple-400 font-semibold">Immutable Chain</span>
          </div>
        </div>
      </div>

      {/* Trust & Impact Banner */}
      <div className="card-glass p-6 rounded-2xl bg-gradient-to-r from-slate-900/80 via-[#10141C] to-slate-900/80 border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Globe2 className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-bold text-white mb-1">
              Aligned with UN Sustainable Development Goals & National Priorities
            </h4>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Supporting <strong>SDG 9</strong> (Resilient Digital Infrastructure) and <strong>SDG 16.9</strong> (Legal Identity for All). Built to run efficiently on low-end edge devices to defend digital banking, UPI, and public benefit schemes against AI deepfake fraud.
            </p>
          </div>
        </div>

        <button 
          onClick={() => setActiveTab('certificate')}
          className="btn-outline shrink-0 text-xs py-2 px-3.5"
        >
          <FileCheck2 className="w-4 h-4 text-cyan-400" />
          <span>Validate Certificate</span>
        </button>
      </div>
    </div>
  );
};
