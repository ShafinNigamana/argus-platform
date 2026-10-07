import React from 'react';
import { Server, Globe } from 'lucide-react';

export const ArchitectureView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-10">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold">
            System Specifications & Architecture
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-display">
          Argus Technical Architecture & Design Document
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1.5 max-w-2xl leading-relaxed">
          Sourced directly from PRD §5–7, TDD §1–4, and Vision Document. Argus serves as an additional zero-trust verification layer for enterprise authentication.
        </p>
      </div>

      {/* Architecture Style Card */}
      <div className="card-glass p-6 rounded-2xl space-y-4">
        <h3 className="text-lg font-bold text-white font-display flex items-center gap-2">
          <Server className="w-5 h-5 text-cyan-400" />
          Modular Monolithic Architecture with Event-Driven Pipeline
        </h3>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          Argus employs a layered design pattern with discrete verification event stages:
        </p>
        <div className="p-4 rounded-xl bg-black/40 border border-white/5 font-mono text-xs text-cyan-300">
          Camera Ingestion (Edge) → Physiological Analysis (rPPG) → Behavioral Analysis → Dynamic Challenge → AI Confidence Fusion → Cryptographic KMS Certificate
        </div>
      </div>

      {/* 4 Core Modules Bento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Module 1 */}
        <div className="card-glass p-5 rounded-xl border border-white/[0.08]">
          <span className="text-[10px] font-mono uppercase font-bold text-cyan-400 block mb-1">PRD §5.1.1</span>
          <h4 className="text-base font-bold text-white mb-2">Physiological Human Verification</h4>
          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            Extracts photoplethysmographic (rPPG) signals from the facial forehead capillary bed in the green optical spectrum (520–560nm). Measures volumetric blood pulse variation to distinguish living skin from high-resolution silicone masks and screens.
          </p>
          <span className="text-[11px] font-mono text-slate-400">FPS: &ge;15 FPS • Zero Video Storage</span>
        </div>

        {/* Module 2 */}
        <div className="card-glass p-5 rounded-xl border border-white/[0.08]">
          <span className="text-[10px] font-mono uppercase font-bold text-indigo-400 block mb-1">PRD §5.1.2</span>
          <h4 className="text-base font-bold text-white mb-2">Behavioral Analysis</h4>
          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            Monitors eye blink dynamics, inter-blink intervals, and micro-movements. Tracks consistent head orientation to prevent delegation attacks and passive session hijacking.
          </p>
          <span className="text-[11px] font-mono text-slate-400">Metrics: Gaze Direction, Blink Latency</span>
        </div>

        {/* Module 3 */}
        <div className="card-glass p-5 rounded-xl border border-white/[0.08]">
          <span className="text-[10px] font-mono uppercase font-bold text-purple-400 block mb-1">PRD §5.1.3</span>
          <h4 className="text-base font-bold text-white mb-2">Challenge-Response Engine</h4>
          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            Issues randomized, time-limited directives (e.g. blink sequence, head turn) verified in real-time. Dynamic nonces and millisecond timestamps prevent challenge playback attacks.
          </p>
          <span className="text-[11px] font-mono text-slate-400">Timing: &lt;5000ms • Dynamic Nonces</span>
        </div>

        {/* Module 4 */}
        <div className="card-glass p-5 rounded-xl border border-white/[0.08]">
          <span className="text-[10px] font-mono uppercase font-bold text-amber-400 block mb-1">PRD §5.1.4</span>
          <h4 className="text-base font-bold text-white mb-2">AI Confidence Engine (Gemini 2.5)</h4>
          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            Synthesizes raw physiological waveforms and behavioral metrics using Google Gemini 2.5 Flash-Lite thinking mode reasoning. Applies weighted scoring to generate an authoritative 0–100% confidence attestation.
          </p>
          <span className="text-[11px] font-mono text-slate-400">Scoring: Weighted Multi-Modal Fusion</span>
        </div>
      </div>

      {/* Sustainable Development Goals Section */}
      <div className="card-glass p-6 rounded-2xl bg-gradient-to-br from-emerald-950/20 via-[#10151C] to-slate-900 border-emerald-500/20">
        <div className="flex items-center gap-3 mb-3">
          <Globe className="w-5 h-5 text-emerald-400" />
          <h3 className="text-lg font-bold text-white font-display">
            UN Sustainable Development Goals (SDGs) & Social Impact
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-xs text-slate-300 leading-relaxed">
          <div className="p-4 rounded-xl bg-black/40 border border-white/5">
            <span className="text-emerald-400 font-bold block mb-1">SDG 9: Industry, Innovation & Infrastructure</span>
            Provides affordable, edge-computed digital identity security without requiring expensive specialized hardware, democratizing fraud protection for digital services.
          </div>
          <div className="p-4 rounded-xl bg-black/40 border border-white/5">
            <span className="text-emerald-400 font-bold block mb-1">SDG 16.9: Legal Identity & Institutional Trust</span>
            Strengthens trust in digital systems, protecting banking, UPI, and public benefit schemes against impersonation and identity theft.
          </div>
        </div>
      </div>
    </div>
  );
};
