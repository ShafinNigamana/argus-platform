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
    <header className="sticky top-0 z-50 bg-[#0B0D10]/85 backdrop-blur-md border-b border-white/[0.08]">
      <div className="container-max flex items-center justify-between h-16">
        {/* Brand & Logo */}
        <div 
          className="flex items-center gap-3 cursor-pointer select-none"
          onClick={() => setActiveTab('overview')}
        >
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#00F2FE]/20 to-[#6366F1]/20 border border-[#00F2FE]/30 shadow-[0_0_15px_rgba(0,242,254,0.15)]">
            <svg className="w-6 h-6" viewBox="0 0 48 48" fill="none">
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
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-lg tracking-wider text-white">ARGUS</span>
              <span className="text-[10px] uppercase font-mono font-semibold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                2026 Core
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Digital Trust & Liveness Platform</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1">
          <button 
            className={`nav-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`nav-tab-btn ${activeTab === 'verify' ? 'active' : ''}`}
            onClick={() => setActiveTab('verify')}
          >
            <Activity className="w-3.5 h-3.5" />
            Verification
          </button>
          <button 
            className={`nav-tab-btn ${activeTab === 'certificate' ? 'active' : ''}`}
            onClick={() => setActiveTab('certificate')}
          >
            <KeyRound className="w-3.5 h-3.5" />
            Trust Ledger
          </button>
          <button 
            className={`nav-tab-btn ${activeTab === 'policies' ? 'active' : ''}`}
            onClick={() => setActiveTab('policies')}
          >
            Policies
          </button>
          <button 
            className={`nav-tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            Audit Trail
          </button>
          <button 
            className={`nav-tab-btn ${activeTab === 'architecture' ? 'active' : ''}`}
            onClick={() => setActiveTab('architecture')}
          >
            Architecture
          </button>
        </nav>

        {/* Right Section: Status Indicator & Start Button */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-white/[0.08] text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-indicator" />
            <span className="text-slate-300">
              {systemStatus.backendOnline ? 'Cloud Run v1.0' : 'Edge Verified'}
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-cyan-400">KMS SHA-256</span>
          </div>

          <button 
            onClick={onStartVerification}
            className="btn-primary text-xs sm:text-sm py-2 px-3.5 sm:px-4"
          >
            <ShieldCheck className="w-4 h-4" />
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
