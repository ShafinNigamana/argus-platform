import React from 'react';
import { ShieldCheck, KeyRound, Activity } from 'lucide-react';
import type { ActiveTab, SystemStatus } from '../types';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  systemStatus: SystemStatus;
  onStartVerification: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  systemStatus,
  onStartVerification,
}) => {
  return (
    <header className="sticky top-0 z-50 bg-[#0B0D10]/80 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="container-max flex items-center justify-between h-16">
        {/* Brand & Logo */}
        <div 
          className="flex items-center gap-3 cursor-pointer select-none group"
          onClick={() => setActiveTab('overview')}
        >
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/15 to-indigo-500/15 border border-cyan-500/30 group-hover:border-cyan-400/50 transition-colors">
            <svg className="w-5 h-5" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="20" stroke="#00F2FE" strokeWidth="2" strokeOpacity="0.4" />
              <circle cx="24" cy="24" r="14" stroke="#00F2FE" strokeWidth="1.5" strokeDasharray="3 3" />
              <path 
                d="M12 24C12 24 16.5 16 24 16C31.5 16 36 24 36 24C36 24 31.5 32 24 32C16.5 32 12 24 12 24Z" 
                stroke="#F8FAFC" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
              <circle cx="24" cy="24" r="4.5" fill="#00F2FE" />
              <circle cx="24" cy="24" r="2" fill="#0B0D10" />
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-display font-semibold text-base tracking-wider text-white">ARGUS</span>
            <span className="text-[10px] uppercase font-mono font-medium px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              SGP 2026
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-white/[0.02] p-1 rounded-xl border border-white/[0.04]">
          <button 
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'overview' 
                ? 'bg-white/[0.08] text-white shadow-sm' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
            }`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'verify' 
                ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
            }`}
            onClick={() => setActiveTab('verify')}
          >
            <Activity className="w-3 h-3 text-cyan-400" />
            Verification
          </button>
          <button 
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'certificate' 
                ? 'bg-white/[0.08] text-white shadow-sm' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
            }`}
            onClick={() => setActiveTab('certificate')}
          >
            <KeyRound className="w-3 h-3 text-slate-400" />
            Trust Ledger
          </button>
          <button 
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'policies' 
                ? 'bg-white/[0.08] text-white shadow-sm' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
            }`}
            onClick={() => setActiveTab('policies')}
          >
            Policies
          </button>
          <button 
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'audit' 
                ? 'bg-white/[0.08] text-white shadow-sm' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
            }`}
            onClick={() => setActiveTab('audit')}
          >
            Audit Trail
          </button>
          <button 
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'architecture' 
                ? 'bg-white/[0.08] text-white shadow-sm' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
            }`}
            onClick={() => setActiveTab('architecture')}
          >
            Architecture
          </button>
        </nav>

        {/* Right Section: Status Indicator & Start Button */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-[11px] font-mono text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-indicator" />
            <span>{systemStatus.backendOnline ? 'Cloud Run v1.0' : 'Edge Verified'}</span>
            <span className="text-slate-600">·</span>
            <span className="text-cyan-400">KMS SHA-256</span>
          </div>

          <button 
            onClick={onStartVerification}
            className="btn-primary text-xs py-1.5 px-3.5 rounded-lg"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Start Verify</span>
          </button>
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="md:hidden flex items-center justify-around border-t border-white/[0.05] bg-[#0E1116] px-2 py-1.5 overflow-x-auto text-xs">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`px-2.5 py-1 rounded ${activeTab === 'overview' ? 'text-cyan-400 font-semibold' : 'text-slate-400'}`}
        >
          Overview
        </button>
        <button 
          onClick={() => setActiveTab('verify')}
          className={`px-2.5 py-1 rounded ${activeTab === 'verify' ? 'text-cyan-400 font-semibold' : 'text-slate-400'}`}
        >
          Verify
        </button>
        <button 
          onClick={() => setActiveTab('certificate')}
          className={`px-2.5 py-1 rounded ${activeTab === 'certificate' ? 'text-cyan-400 font-semibold' : 'text-slate-400'}`}
        >
          Ledger
        </button>
        <button 
          onClick={() => setActiveTab('policies')}
          className={`px-2.5 py-1 rounded ${activeTab === 'policies' ? 'text-cyan-400 font-semibold' : 'text-slate-400'}`}
        >
          Policies
        </button>
        <button 
          onClick={() => setActiveTab('audit')}
          className={`px-2.5 py-1 rounded ${activeTab === 'audit' ? 'text-cyan-400 font-semibold' : 'text-slate-400'}`}
        >
          Audit
        </button>
        <button 
          onClick={() => setActiveTab('architecture')}
          className={`px-2.5 py-1 rounded ${activeTab === 'architecture' ? 'text-cyan-400 font-semibold' : 'text-slate-400'}`}
        >
          Docs
        </button>
      </div>
    </header>
  );
};
