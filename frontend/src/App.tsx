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
import { AccountProfileView } from './components/AccountProfileView';
import { apiService } from './services/api';
import { authService } from './services/auth';
import { router } from './services/router';
import type { ActiveTab, AuthState, SystemStatus, VerifyResponse, VerificationHistoryItem } from './types';

const ALLOWED_TABS: readonly ActiveTab[] = [
  'overview',
  'verify',
  'history',
  'certificate',
  'policies',
  'audit',
  'trust',
  'demo',
  'profile',
] as const;

export function sanitizeTargetTab(target?: string, userRole?: string): ActiveTab {
  if (!target || typeof target !== 'string') {
    return userRole === 'USER' ? 'verify' : 'overview';
  }
  // Disallow absolute URLs, protocol-relative URLs, script execution vectors
  if (target.includes('://') || target.startsWith('//') || target.includes('\\')) {
    return userRole === 'USER' ? 'verify' : 'overview';
  }
  const clean = target.replace(/^[/#]+/, '').trim() as ActiveTab;
  if (ALLOWED_TABS.includes(clean)) {
    // If role is USER and target is overview, fallback to verify
    if (userRole === 'USER' && clean === 'overview') return 'verify';
    // If role is AUDIT and target is verify, fallback to history
    if (userRole === 'AUDIT' && clean === 'verify') return 'history';
    // If regular USER and target is policies or audit, fallback to verify
    if (userRole === 'USER' && (clean === 'policies' || clean === 'audit')) return 'verify';
    // If AUDIT and target is policies, fallback to audit
    if (userRole === 'AUDIT' && clean === 'policies') return 'audit';
    return clean;
  }
  return userRole === 'USER' ? 'verify' : 'overview';
}

export const App: React.FC = () => {
  const initialRoute = router.getCurrentRoute();
  const initialAuthState = authService.getAuthState();

  const [activeTab, setActiveTab] = useState<ActiveTab>(
    sanitizeTargetTab(initialRoute.tab, initialAuthState.role || undefined)
  );
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    backendOnline: false,
    modelReady: true,
    kmsTrustReady: true,
    modelName: 'MiniFASNetV2-SE + UltraFace Slim 320',
    activePort: 8090,
    environment: 'development',
  });

  const [authState, setAuthState] = useState<AuthState>(initialAuthState);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(
    initialRoute.isLoginModal ||
    (!initialAuthState.isAuthenticated && (initialRoute.tab === 'demo' || initialRoute.tab === 'verify' || initialRoute.tab === 'profile'))
  );
  const [loginModalMode, setLoginModalMode] = useState<'login' | 'register'>(initialRoute.loginMode);
  const [loginRedirectTarget, setLoginRedirectTarget] = useState<string | undefined>(
    initialRoute.redirectTarget || (initialRoute.tab !== 'overview' ? initialRoute.tab : undefined)
  );
  const [pendingDemoIntent, setPendingDemoIntent] = useState<boolean>(initialRoute.tab === 'demo');
  const [activeResult, setActiveResult] = useState<VerifyResponse | null>(null);
  const [selectedCertId, setSelectedCertId] = useState<string>(initialRoute.certId || '');
  const [records, setRecords] = useState<VerificationHistoryItem[]>(apiService.getStoredRecords());
  const [demoVerificationResult, setDemoVerificationResult] = useState<VerifyResponse | null>(null);
  const [isDemoOrigin, setIsDemoOrigin] = useState<boolean>(false);

  // Subscribe to router changes (e.g., Browser Back/Forward buttons, direct hash/path updates)
  useEffect(() => {
    const unsub = router.subscribe((route) => {
      const currentRole = authService.getAuthState().role || undefined;
      const resolvedTab = sanitizeTargetTab(route.tab, currentRole);
      setActiveTab(resolvedTab);

      if (route.certId !== undefined) {
        setSelectedCertId(route.certId);
      }
      if (route.isLoginModal) {
        setShowLoginModal(true);
        setLoginModalMode(route.loginMode);
        setLoginRedirectTarget(route.redirectTarget);
      }
      if (route.sectionAnchor) {
        const el = document.getElementById(route.sectionAnchor);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
    return unsub;
  }, []);

  // Subscribe to auth state updates; strictly purge in-memory state on signout and honour pendingDemoIntent after login
  useEffect(() => {
    const unsub = authService.subscribe((state) => {
      setAuthState(state);
      if (!state.isAuthenticated) {
        apiService.clearInMemoryData();
        setRecords([]);
        setActiveResult(null);
        setSelectedCertId('');
        setDemoVerificationResult(null);
      } else {
        apiService.fetchUserVerifications().then((items) => setRecords(items));
      }
      if (state.isAuthenticated && pendingDemoIntent) {
        setActiveTab('demo');
        router.navigate('demo');
        setPendingDemoIntent(false);
      }
      if (!state.isAuthenticated) {
        setActiveResult(null);
        setActiveTab('overview');
        setSelectedCertId('');
        setShowLoginModal(false);
        setPendingDemoIntent(false);
        router.navigate('overview');
      }
    });
    return unsub;
  }, [pendingDemoIntent]);

  // Attempt silent refresh once on initial mount only if a refresh token is stored
  useEffect(() => {
    const current = authService.getAuthState();
    if (!current.isAuthenticated && current.refreshToken) {
      authService.ensureAuthenticated().catch(() => {});
    }
  }, []);

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
    router.navigate('verify');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartVerificationFromDemo = () => {
    setIsDemoOrigin(true);
    setActiveResult(null);
    setActiveTab('verify');
    router.navigate('verify');
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
    router.navigate('certificate', { certId: id });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTabChange = (tab: ActiveTab) => {
    setActiveResult(null);
    setActiveTab(tab);
    router.navigate(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenLogin = (mode: 'login' | 'register' = 'login', target?: string) => {
    setLoginModalMode(mode);
    setLoginRedirectTarget(target);
    setShowLoginModal(true);
    router.navigate(mode, { mode, target });
  };

  const handleCloseLogin = () => {
    setShowLoginModal(false);
    setPendingDemoIntent(false);
    setLoginRedirectTarget(undefined);
    // Revert URL to current tab without login modal query
    router.navigate(activeTab, { replace: true });
  };

  const handleLoginSuccess = (target?: string) => {
    setShowLoginModal(false);
    const resolvedTarget = target || loginRedirectTarget;
    const currentRole = authService.getAuthState().role;
    const dest = sanitizeTargetTab(resolvedTarget, currentRole || undefined);
    setActiveTab(dest);
    setLoginRedirectTarget(undefined);
    setPendingDemoIntent(false);
    apiService.fetchUserVerifications().then((items) => setRecords(items));
    router.navigate(dest);
  };

  const handleLogout = async () => {
    setActiveResult(null);
    setActiveTab('overview');
    setSelectedCertId('');
    setShowLoginModal(false);
    setPendingDemoIntent(false);
    apiService.clearInMemoryData();
    setRecords([]);
    setDemoVerificationResult(null);
    await authService.logout();
    router.navigate('overview');
  };

  // RBAC checks
  const isAdmin = authState.role === 'ADMIN' || authState.role === 'SUPERADMIN';
  const isAudit = authState.role === 'AUDIT';
  const isUser = authState.isAuthenticated && authState.role === 'USER';

  // Automatically steer regular USER to verify tab if on overview
  useEffect(() => {
    if (authState.isAuthenticated && authState.role === 'USER' && activeTab === 'overview') {
      setActiveTab('verify');
      router.navigate('verify', { replace: true });
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
          onEnterPlatform={(mode, target) => handleOpenLogin(mode || 'login', target)}
          onViewDemo={() => {
            setPendingDemoIntent(true);
            handleOpenLogin('login', 'demo');
          }}
        />
        {showLoginModal && (
          <LoginPage
            initialMode={loginModalMode}
            redirectTarget={loginRedirectTarget}
            onClose={handleCloseLogin}
            onSuccess={handleLoginSuccess}
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
        onOpenLogin={() => handleOpenLogin('login')}
        onLogout={handleLogout}
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
                onClick={() => handleOpenLogin('login')}
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
                onOpenLogin={() => handleOpenLogin('login')}
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

            {activeTab === 'profile' && (
              <AccountProfileView />
            )}
          </>
        )}
      </main>

      {/* Authentication Modal */}
      {showLoginModal && (
        <LoginPage
          initialMode={loginModalMode}
          redirectTarget={loginRedirectTarget}
          onClose={() => {
            setShowLoginModal(false);
            setLoginRedirectTarget(undefined);
          }}
          onSuccess={handleLoginSuccess}
        />
      )}
    </div>
  );
};

export default App;
