import React, { useState, useEffect, useCallback } from 'react';
import { Navigation } from './components/Navigation';
import { OverviewView } from './components/OverviewView';
import { VerificationStudio } from './components/VerificationStudio';
import { ResultView } from './components/ResultView';
import { HistoryView } from './components/HistoryView';
import { CertificateView } from './components/CertificateView';
import { AuditTrailView } from './components/AuditTrailView';
import { TrustCenterView } from './components/TrustCenterView';
import { AssessmentDemoView } from './components/AssessmentDemoView';
import { PoliciesView } from './components/PoliciesView';
import { LoginPage } from './components/LoginPage';
import { PublicLanding } from './components/PublicLanding';
import { apiService } from './services/api';
import { authService } from './services/auth';
import type { ActiveTab, AuthState, SystemStatus, VerifyResponse, VerificationHistoryItem } from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    backendOnline: false,
    modelReady: true,
    kmsTrustReady: true,
    modelName: 'MiniFASNetV2-SE + UltraFace Slim 320',
    activePort: 8080,
    environment: 'development',
  });

  const [authState, setAuthState] = useState<AuthState>(authService.getAuthState());
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [pendingDemoIntent, setPendingDemoIntent] = useState<boolean>(false);
  const [activeResult, setActiveResult] = useState<VerifyResponse | null>(null);
  const [selectedCertId, setSelectedCertId] = useState<string>('');
  const [records, setRecords] = useState<VerificationHistoryItem[]>(apiService.getStoredRecords());
  const [demoVerificationResult, setDemoVerificationResult] = useState<VerifyResponse | null>(null);
  const [isDemoOrigin, setIsDemoOrigin] = useState<boolean>(false);

  // Subscribe to auth state updates; honour pendingDemoIntent after login
  useEffect(() => {
    const unsub = authService.subscribe((state) => {
      setAuthState(state);
      if (state.isAuthenticated && pendingDemoIntent) {
        setActiveTab('demo');
        setPendingDemoIntent(false);
      }
    });
    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingDemoIntent]);

  // Health probe polling
  const checkHealth = useCallback(() => {
    apiService.checkSystemStatus().then((status) => {
      setSystemStatus(status);
    });
  }, []);

  useEffect(() => {
    checkHealth();
    const timer = setInterval(checkHealth, 15000);
    return () => clearInterval(timer);
  }, [checkHealth]);

  const handleStartVerification = () => {
    setIsDemoOrigin(false);
    setActiveResult(null);
    setActiveTab('verify');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartVerificationFromDemo = () => {
    setIsDemoOrigin(true);
    setActiveResult(null);
    setActiveTab('verify');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleVerificationComplete = (result: VerifyResponse) => {
    setActiveResult(result);
    if (isDemoOrigin) {
      setDemoVerificationResult(result);
    }
    setRecords(apiService.getStoredRecords());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenCertificate = (id: string) => {
    setSelectedCertId(id);
    setActiveResult(null);
    setActiveTab('certificate');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTabChange = (tab: ActiveTab) => {
    setActiveResult(null);
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // RBAC checks
  const isAdmin = authState.role === 'ADMIN' || authState.role === 'SUPERADMIN';
  const isAudit = authState.role === 'AUDIT';
  const isUser = authState.isAuthenticated && authState.role === 'USER';

  // Automatically steer regular USER to verify tab if on overview
  useEffect(() => {
    if (authState.isAuthenticated && authState.role === 'USER' && activeTab === 'overview') {
      setActiveTab('verify');
    }
  }, [authState, activeTab]);

  // Role Gate Enforcement
  const isTabUnauthorized =
    (activeTab === 'policies' && !isAdmin) ||
    (activeTab === 'audit' && !(isAdmin || isAudit)) ||
    (activeTab === 'verify' && isAudit) ||
    (activeTab === 'overview' && isUser);

  // ── Public landing page (unauthenticated) ───────────────────────────────
  if (!authState.isAuthenticated) {
    return (
      <>
        <PublicLanding
          onEnterPlatform={() => setShowLoginModal(true)}
          onViewDemo={() => {
            setPendingDemoIntent(true);
            setShowLoginModal(true);
          }}
        />
        {showLoginModal && (
          <LoginPage
            onClose={() => {
              setShowLoginModal(false);
              setPendingDemoIntent(false);
            }}
            onSuccess={() => setShowLoginModal(false)}
          />
        )}
      </>
    );
  }

  return (
    <div className="app-shell">
      {/* Primary Sticky Sidebar Navigation */}
      <Navigation
        activeTab={activeResult ? 'verify' : activeTab}
        setActiveTab={handleTabChange}
        systemStatus={systemStatus}
        authState={authState}
        onOpenLogin={() => setShowLoginModal(true)}
        onLogout={() => authService.logout()}
        onStartVerification={handleStartVerification}
      />

      {/* Main Viewport Content Area */}
      <main className="main-viewport">
        {activeResult ? (
          <ResultView
            result={activeResult}
            onVerifyAgain={() => {
              setActiveResult(null);
              setActiveTab('verify');
            }}
            onOpenCertificate={handleOpenCertificate}
            onViewHistory={() => {
              setActiveResult(null);
              setActiveTab('history');
            }}
            onReturnOverview={() => {
              setActiveResult(null);
              setIsDemoOrigin(false);
              setActiveTab(isUser ? 'history' : 'overview');
            }}
            onReturnToDemo={isDemoOrigin ? () => {
              setActiveResult(null);
              setIsDemoOrigin(false);
              setActiveTab('demo');
            } : undefined}
          />
        ) : isTabUnauthorized ? (
          <div className="box-card pad py-12 text-center max-w-xl mx-auto my-12">
            <div className="stat-label text-[var(--bad)]">403 · Access Restricted</div>
            <h2 style={{ font: '400 32px var(--ser)', margin: '8px 0 12px' }}>
              Unauthorized for Role [{authState.role}]
            </h2>
            <p className="text-xs text-[var(--mut)] mb-6 font-mono leading-relaxed">
              Your active account role ({authState.role}) does not hold security privileges to access this area. Authenticate with an elevated operator identity to proceed.
            </p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                className="btn text-xs"
                onClick={() => setShowLoginModal(true)}
              >
                Sign In with Different Identity
              </button>
              <button
                type="button"
                className="btn ghost text-xs"
                onClick={() => setActiveTab(isUser ? 'verify' : 'overview')}
              >
                {isUser ? 'Return to Verification' : 'Return to Overview'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <OverviewView
                onStartVerification={handleStartVerification}
                systemStatus={systemStatus}
                onSelectRecord={handleOpenCertificate}
                onNavigateHistory={() => handleTabChange('history')}
                canVerify={!isAudit}
              />
            )}

            {activeTab === 'verify' && (
              <VerificationStudio
                onVerificationComplete={handleVerificationComplete}
                onCancel={() => setActiveTab(isUser ? 'history' : 'overview')}
                onOpenLogin={() => setShowLoginModal(true)}
              />
            )}

            {activeTab === 'history' && (
              <HistoryView
                records={records}
                onSelectCertificate={handleOpenCertificate}
                onStartVerification={handleStartVerification}
                isUserView={isUser}
              />
            )}

            {activeTab === 'certificate' && (
              <CertificateView
                initialVerificationId={selectedCertId}
                onNavigateHistory={() => handleTabChange('history')}
              />
            )}

            {activeTab === 'audit' && (
              <AuditTrailView />
            )}

            {(activeTab === 'architecture' || activeTab === 'trust') && (
              <TrustCenterView />
            )}

            {activeTab === 'policies' && (
              <PoliciesView />
            )}

            {activeTab === 'demo' && (
              <AssessmentDemoView
                lastResult={demoVerificationResult}
                onLaunchVerification={handleStartVerificationFromDemo}
                onResetGate={() => setDemoVerificationResult(null)}
                onOpenCertificate={handleOpenCertificate}
              />
            )}
          </>
        )}
      </main>

      {/* Authentication Modal */}
      {showLoginModal && (
        <LoginPage
          onClose={() => setShowLoginModal(false)}
          onSuccess={() => {
            setShowLoginModal(false);
          }}
        />
      )}
    </div>
  );
};

export default App;
