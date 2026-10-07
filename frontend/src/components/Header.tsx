import React, { useState, useEffect } from 'react';
import { KeyRound, Activity, BookOpen, ClipboardList, Cpu, Menu, X } from 'lucide-react';
import type { ActiveTab, SystemStatus } from '../types';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  systemStatus: SystemStatus;
  onStartVerification: () => void;
}

const navItems: { id: ActiveTab; label: string; icon?: React.FC<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'verify', label: 'Verification', icon: Activity },
  { id: 'certificate', label: 'Trust Ledger', icon: KeyRound },
  { id: 'policies', label: 'Policies', icon: ClipboardList },
  { id: 'audit', label: 'Audit Trail', icon: BookOpen },
  { id: 'architecture', label: 'Architecture', icon: Cpu },
];

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  systemStatus,
  onStartVerification,
}) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleNav = (tab: ActiveTab) => {
    setActiveTab(tab);
    setMobileOpen(false);
  };

  return (
    <>
      <header
        className="sticky top-0 z-50 transition-all duration-300"
        style={{
          background: scrolled
            ? 'rgba(5,7,9,0.92)'
            : 'rgba(5,7,9,0.75)',
          backdropFilter: 'blur(28px) saturate(200%)',
          WebkitBackdropFilter: 'blur(28px) saturate(200%)',
          borderBottom: scrolled
            ? '1px solid rgba(255,255,255,0.08)'
            : '1px solid rgba(255,255,255,0.04)',
          boxShadow: scrolled ? '0 4px 40px rgba(0,0,0,0.5)' : 'none',
        }}
      >
        <div className="container-max flex items-center justify-between h-[66px]">

          {/* ── BRAND ── */}
          <button
            type="button"
            className="flex items-center gap-3 cursor-pointer select-none group text-left"
            aria-label="Argus overview"
            onClick={() => handleNav('overview')}
          >
            {/* Logo mark */}
            <div
              className="relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 group-hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, rgba(0,242,254,0.15) 0%, rgba(99,102,241,0.15) 100%)',
                border: '1px solid rgba(0,242,254,0.25)',
                boxShadow: '0 0 20px rgba(0,242,254,0.12)',
              }}
            >
              <svg className="w-5 h-5" viewBox="0 0 48 48" fill="none">
                <defs>
                  <linearGradient id="eyeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00F2FE" />
                    <stop offset="100%" stopColor="#6366F1" />
                  </linearGradient>
                </defs>
                <circle cx="24" cy="24" r="19" stroke="url(#eyeGrad)" strokeWidth="1" strokeOpacity="0.45" />
                <path d="M11 24C11 24 16.5 17 24 17C31.5 17 37 24 37 24C37 24 31.5 31 24 31C16.5 31 11 24 11 24Z"
                  stroke="#F0F6FF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <circle cx="24" cy="24" r="6.5" stroke="url(#eyeGrad)" strokeWidth="1" />
                <circle cx="24" cy="24" r="3.5" fill="url(#eyeGrad)" />
                <circle cx="24" cy="24" r="1.8" fill="#050709" />
                <circle cx="22.2" cy="22.5" r="1.2" fill="rgba(255,255,255,0.85)" />
              </svg>

              {/* Pulse ring */}
              <div
                className="absolute inset-0 rounded-xl"
                style={{
                  border: '1px solid rgba(0,242,254,0.3)',
                  animation: 'ovalPulse 3s ease-in-out infinite',
                }}
              />
            </div>

            {/* Word mark */}
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="font-display font-extrabold text-xl tracking-[0.12em] text-white"
                  style={{ textShadow: '0 0 20px rgba(0,242,254,0.3)' }}
                >
                  ARGUS
                </span>
              </div>
              <p className="text-[10.5px] text-slate-500 hidden sm:block tracking-wide font-mono">
                Digital Trust &amp; Liveness Platform
              </p>
            </div>
          </button>

          {/* ── NAV TABS (Desktop) ── */}
          <nav className="hidden lg:flex items-center gap-0.5" aria-label="Main navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className="nav-tab-btn"
                  aria-current={isActive ? 'page' : undefined}
                  style={isActive ? {
                    color: '#00F2FE',
                    background: 'rgba(0,242,254,0.07)',
                    border: '1px solid rgba(0,242,254,0.2)',
                    boxShadow: '0 0 16px rgba(0,242,254,0.1)',
                    fontWeight: 600,
                  } : {}}
                >
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* ── RIGHT SECTION ── */}
          <div className="flex items-center gap-3">
            {/* Status pill */}
            <div
              className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <span className={`w-2 h-2 rounded-full pulse-indicator ${systemStatus.backendOnline ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className="text-slate-300">
                {systemStatus.backendOnline ? 'Service connected' : 'Service offline'}
              </span>
              <span className="text-slate-600">|</span>
              <span className={systemStatus.kmsTrustReady ? 'text-cyan-400' : systemStatus.backendOnline ? 'text-amber-400' : 'text-rose-400'}>
                {systemStatus.kmsTrustReady ? 'Trust ready' : 'Trust unverified'}
              </span>
            </div>

            {/* Verify CTA */}
            <button
              onClick={onStartVerification}
              className="btn-primary text-xs sm:text-sm py-2.5 px-4"
            >
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Start Verify</span>
              <span className="sm:hidden">Verify</span>
            </button>

            {/* Mobile menu toggle */}
            <button
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
              aria-controls="mobile-navigation"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* ── MOBILE MENU ── */}
        {mobileOpen && (
          <div
            id="mobile-navigation"
            className="lg:hidden border-t"
            style={{
              background: 'rgba(5,7,9,0.97)',
              borderColor: 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(24px)',
            }}
          >
            <nav className="container-max py-4 grid grid-cols-2 gap-2" aria-label="Main navigation">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium transition-all"
                    aria-current={isActive ? 'page' : undefined}
                    style={isActive ? {
                      color: '#00F2FE',
                      background: 'rgba(0,242,254,0.07)',
                      border: '1px solid rgba(0,242,254,0.2)',
                    } : {
                      color: '#94A3B8',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    {Icon && <Icon className="w-4 h-4" />}
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
        )}
      </header>
    </>
  );
};
