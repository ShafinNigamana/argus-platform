import React from 'react';
import type { ActiveTab, AuthState, SystemStatus } from '../types';

interface NavigationProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  systemStatus: SystemStatus;
  authState: AuthState;
  onOpenLogin: () => void;
  onLogout: () => void;
  onStartVerification: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  authState,
  onOpenLogin,
  onLogout,
}) => {
  const isAdmin = authState.role === 'ADMIN' || authState.role === 'SUPERADMIN';
  const isAudit = authState.role === 'AUDIT';
  const isOperator = isAdmin || isAudit;
  const isUser = authState.isAuthenticated && authState.role === 'USER';
  const canVerify = !isAudit; // AUDIT role cannot perform verification per matrix
  const canViewAudit = isAdmin || isAudit;

  // Role-aware numbering helper
  let counter = 1;
  const nextNum = () => String(counter++).padStart(2, '0');

  return (
    <nav className="sidebar" aria-label="Primary Navigation">
      <div className="logo-header">
        Argus
        <small>PLATFORM</small>
      </div>

      {/* Overview Console: Operators and Guest visitors */}
      {!isUser && (
        <button
          type="button"
          className="nav-btn"
          data-v="overview"
          aria-current={activeTab === 'overview'}
          onClick={() => setActiveTab('overview')}
        >
          <span className="num">{nextNum()}</span>
          {isOperator ? 'Console Overview' : 'Overview'}
        </button>
      )}

      {/* Verify Human: USER, ADMIN, SUPERADMIN */}
      {canVerify && (
        <button
          type="button"
          className="nav-btn"
          data-v="verify"
          aria-current={activeTab === 'verify'}
          onClick={() => setActiveTab('verify')}
        >
          <span className="num">{nextNum()}</span>
          Verify Human
        </button>
      )}

      {/* Assessment Demo: All roles */}
      <button
        type="button"
        className="nav-btn"
        data-v="demo"
        aria-current={activeTab === 'demo'}
        onClick={() => setActiveTab('demo')}
      >
        <span className="num">{nextNum()}</span>
        Assessment Demo
      </button>

      {/* Sessions / History: All roles */}
      <button
        type="button"
        className="nav-btn"
        data-v="history"
        aria-current={activeTab === 'history'}
        onClick={() => setActiveTab('history')}
      >
        <span className="num">{nextNum()}</span>
        {isUser ? 'My Sessions' : 'Sessions Ledger'}
      </button>

      {/* Verification Records / Attestation: All roles */}
      <button
        type="button"
        className="nav-btn"
        data-v="certificate"
        aria-current={activeTab === 'certificate'}
        onClick={() => setActiveTab('certificate')}
      >
        <span className="num">{nextNum()}</span>
        Verification Records
      </button>

      {/* Audit Trail: ADMIN, SUPERADMIN, AUDIT only */}
      {canViewAudit && (
        <button
          type="button"
          className="nav-btn"
          data-v="audit"
          aria-current={activeTab === 'audit'}
          onClick={() => setActiveTab('audit')}
        >
          <span className="num">{nextNum()}</span>
          Audit Trail
        </button>
      )}

      {/* Policies: ADMIN, SUPERADMIN only */}
      {isAdmin && (
        <button
          type="button"
          className="nav-btn"
          data-v="policies"
          aria-current={activeTab === 'policies'}
          onClick={() => setActiveTab('policies')}
        >
          <span className="num">{nextNum()}</span>
          Policy Config
        </button>
      )}

      {/* Trust & Privacy: All roles */}
      <button
        type="button"
        className="nav-btn"
        data-v="trust"
        aria-current={activeTab === 'trust' || activeTab === 'architecture'}
        onClick={() => setActiveTab('trust')}
      >
        <span className="num">{nextNum()}</span>
        Trust &amp; Privacy
      </button>

      {/* Operator Session & RBAC info */}
      <div className="p-4 border-t border-[var(--soft)] mt-4">
        {authState.isAuthenticated ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-[var(--ink)] font-semibold truncate max-w-[110px]">
                {authState.username}
              </span>
              <span className="tag-badge text-[10px] py-0 px-1.5 border-[var(--ink)]">
                {authState.role}
              </span>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="text-xs text-[var(--mut)] hover:text-[var(--bad)] transition-colors underline block text-left font-mono"
            >
              Sign out
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenLogin}
            className="w-full text-left font-mono text-xs font-semibold text-[var(--acc)] hover:underline flex items-center justify-between"
          >
            <span>Sign In</span>
            <span className="text-[10px] text-[var(--mut)]">RBAC</span>
          </button>
        )}
      </div>
    </nav>
  );
};
