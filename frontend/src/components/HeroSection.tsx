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
    <div className="space-y-24 sm:space-y-32">
      {/* Primary Hero Section */}
      <section className="relative text-center max-w-3xl mx-auto pt-12 sm:pt-20 pb-4">
        {/* Subtle pill tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-cyan-500/30 text-xs font-mono text-cyan-400 mb-8 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 pulse-indicator" />
          <span>ARGUS DIGITAL TRUST PLATFORM</span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-400">SGP 2026</span>
        </div>

        {/* Main Display Title */}
        <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-bold text-white tracking-[-0.03em] leading-[1.14] mb-6">
          Real Human Verification. <br />
          <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
            Cryptographic Proof.
          </span>
        </h1>

        {/* Human-readable explanation */}
        <p className="text-base sm:text-lg text-slate-400 leading-relaxed mb-10 max-w-2xl mx-auto font-normal">
          Argus answers the zero-trust question: <span className="text-slate-200">“Is a genuine human actively present right now?”</span> Combining real-time vascular rPPG optics, reflex challenges, and hardware-secured KMS certificates to defeat deepfakes and injection replay attacks.
        </p>

        {/* Hero Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button 
            onClick={onStartVerification}
            className="btn-primary w-full sm:w-auto text-sm py-3 px-6 rounded-xl shadow-lg shadow-cyan-500/20"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Start Live Verification</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button 
            onClick={() => setActiveTab('architecture')}
            className="btn-secondary w-full sm:w-auto text-sm py-3 px-5 rounded-xl"
          >
            <Lock className="w-4 h-4 text-slate-400" />
            <span>Technical Specifications</span>
          </button>
        </div>

        {/* Live Metrics / Capability Pill */}
        <div className="mt-14 pt-8 border-t border-white/[0.06] flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>&gt;90% Target Accuracy</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>rPPG Pulse Sensing</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            <span>SHA-256 KMS Certificate</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            <span>Zero Video Storage</span>
          </div>
        </div>
      </section>

      {/* Bento Grid: Core Technical Modules from PRD & TDD */}
      <section className="space-y-10">
        <div className="text-center max-w-xl mx-auto">
          <div className="text-[11px] font-mono uppercase tracking-widest text-cyan-400 font-semibold mb-2">
            THREE VERIFICATION SIGNALS
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-3">
            Multi-Modal Liveness Architecture
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-normal">
            Independent physical, behavioral, and cryptographic layers fused into a tamper-proof digital attestation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Module 1: Physiological Liveness */}
          <div className="card-glass p-7 rounded-2xl flex flex-col justify-between hover:border-cyan-500/30 transition-all">
            <div>
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-5 text-cyan-400">
                <Activity className="w-4 h-4" />
              </div>
              <div className="text-[10px] font-mono uppercase font-semibold text-cyan-400 tracking-wider mb-1.5">
                SIGNAL 01 · PHYSIOLOGICAL
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-2">rPPG Pulse Extraction</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-normal">
                Detects microscopic volumetric skin capillary expansion caused by systolic cardiac cycles. Uses the green optical spectrum (520–560nm) to calculate genuine heart-rate variability without wearable sensors.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/[0.04] flex items-center justify-between text-xs font-mono text-slate-500">
              <span>Spectrum: 520–560nm</span>
              <span className="text-emerald-400 font-medium">Active Engine</span>
            </div>
          </div>

          {/* Module 2: Anti-Replay Challenge */}
          <div className="card-glass p-7 rounded-2xl flex flex-col justify-between hover:border-indigo-500/30 transition-all">
            <div>
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-5 text-indigo-400">
                <Eye className="w-4 h-4" />
              </div>
              <div className="text-[10px] font-mono uppercase font-semibold text-indigo-400 tracking-wider mb-1.5">
                SIGNAL 02 · BEHAVIORAL
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-2">Dynamic Reflex Defense</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-normal">
                Issues randomized, millisecond-bounded challenges (natural blink cycles, head turns, and gaze tracking). Microsecond response evaluation prevents bot scripts, virtual camera injection, and video loops.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/[0.04] flex items-center justify-between text-xs font-mono text-slate-500">
              <span>Latency: &lt;3000ms</span>
              <span className="text-indigo-400 font-medium">Dynamic Nonce</span>
            </div>
          </div>

          {/* Module 3: Digital Trust Ledger */}
          <div className="card-glass p-7 rounded-2xl flex flex-col justify-between hover:border-purple-500/30 transition-all">
            <div>
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-5 text-purple-400">
                <Key className="w-4 h-4" />
              </div>
              <div className="text-[10px] font-mono uppercase font-semibold text-purple-400 tracking-wider mb-1.5">
                SIGNAL 03 · CRYPTOGRAPHIC
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-2">KMS-Signed Certificates</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-normal">
                Every verification generates a canonical JSON attestation signed via Google Cloud KMS asymmetric keys. Mathematically verifiable by downstream banking, examination, or access gateways.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/[0.04] flex items-center justify-between text-xs font-mono text-slate-500">
              <span>Signature: Cloud KMS / ECDSA</span>
              <span className="text-purple-400 font-medium">Cryptographic Chain</span>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Impact Banner */}
      <section className="card-glass p-6 sm:p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Globe2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-semibold text-white mb-1">
              Aligned with UN Sustainable Development Goals (SDG 9 &amp; SDG 16.9)
            </h4>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed font-normal">
              Designed for privacy-first, on-device edge execution with zero raw video storage. Defends digital banking, UPI, and public benefit schemes against AI deepfake identity fraud.
            </p>
          </div>
        </div>

        <button 
          onClick={() => setActiveTab('certificate')}
          className="btn-outline shrink-0 text-xs py-2 px-3.5 rounded-lg"
        >
          <FileCheck2 className="w-4 h-4 text-cyan-400" />
          <span>Validate Certificate</span>
        </button>
      </section>
    </div>
  );
};
