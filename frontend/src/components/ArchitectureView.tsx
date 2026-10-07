import React from 'react';
import { Server, Globe } from 'lucide-react';

export const ArchitectureView: React.FC = () => {
  return (
    <div className="argus-page">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold">
            System overview
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
          How the current frontend works
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
          A practical view of camera sampling, user interaction, and backend requests implemented in this frontend.
        </p>
      </div>

      {/* Architecture Style Card */}
      <div className="card-glass p-6 rounded-2xl space-y-4">
        <h3 className="text-lg font-bold text-white font-display flex items-center gap-2">
          <Server className="w-5 h-5 text-cyan-400" />
          Browser and service responsibilities
        </h3>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          Camera frames are sampled locally. Verification and certificate results are requested from the configured API.
        </p>
        <div className="p-4 rounded-xl bg-black/40 border border-white/5 font-mono text-xs text-cyan-300">
          Camera access → local optical estimate → timed action prompt → verification API → optional certificate lookup
        </div>
      </div>

      {/* 4 Core Modules Bento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Module 1 */}
        <div className="card-glass p-5 rounded-xl border border-white/[0.08]">
          <span className="text-[10px] font-mono uppercase font-bold text-cyan-400 block mb-1">PRD §5.1.1</span>
          <h4 className="text-base font-bold text-white mb-2">Optical signal estimate</h4>
          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            Samples color changes from a forehead region in the local camera feed and estimates a pulse when the signal is usable. This browser-side estimate is not, by itself, proof of identity or liveness.
          </p>
          <span className="text-[11px] font-mono text-slate-400">Local camera sampling • No video upload in this flow</span>
        </div>

        {/* Module 2 */}
        <div className="card-glass p-5 rounded-xl border border-white/[0.08]">
          <span className="text-[10px] font-mono uppercase font-bold text-indigo-400 block mb-1">PRD §5.1.2</span>
          <h4 className="text-base font-bold text-white mb-2">Timed action prompt</h4>
          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            The user confirms the prompted action. Blink and head movement are not detected by the camera; the response and timestamp are submitted for backend validation.
          </p>
          <span className="text-[11px] font-mono text-slate-400">No browser-side behavior detection</span>
        </div>

        {/* Module 3 */}
        <div className="card-glass p-5 rounded-xl border border-white/[0.08]">
          <span className="text-[10px] font-mono uppercase font-bold text-purple-400 block mb-1">PRD §5.1.3</span>
          <h4 className="text-base font-bold text-white mb-2">Verification session</h4>
          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            Presents a timed action prompt and sends the response and timestamp to the backend. A successful response depends on backend validation; the browser does not independently detect the action.
          </p>
          <span className="text-[11px] font-mono text-slate-400">Timed prompt • Backend response required</span>
        </div>

        {/* Module 4 */}
        <div className="card-glass p-5 rounded-xl border border-white/[0.08]">
          <span className="text-[10px] font-mono uppercase font-bold text-amber-400 block mb-1">PRD §5.1.4</span>
          <h4 className="text-base font-bold text-white mb-2">Service-provided result</h4>
          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            Displays confidence and component scores only when the verification service returns them. This frontend does not calculate a substitute score.
          </p>
          <span className="text-[11px] font-mono text-slate-400">Service-returned result only</span>
        </div>
      </div>

      {/* Sustainable Development Goals Section */}
      <div className="card-glass p-6 rounded-2xl bg-gradient-to-br from-emerald-950/20 via-[#10151C] to-slate-900 border-emerald-500/20">
        <div className="flex items-center gap-3 mb-3">
          <Globe className="w-5 h-5 text-emerald-400" />
          <h3 className="text-lg font-bold text-white font-display">
            Implementation boundaries
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-xs text-slate-300 leading-relaxed">
          <div className="p-4 rounded-xl bg-black/40 border border-white/5">
            <span className="text-emerald-400 font-bold block mb-1">Local processing</span>
            Camera frame sampling and pulse estimation run in the browser in this flow.
          </div>
          <div className="p-4 rounded-xl bg-black/40 border border-white/5">
            <span className="text-emerald-400 font-bold block mb-1">Service dependency</span>
            Final verification results and certificates depend on responses from the configured backend.
          </div>
        </div>
      </div>
    </div>
  );
};
