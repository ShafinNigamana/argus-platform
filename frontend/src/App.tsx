import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { PipelineVisual } from './components/PipelineVisual';
import { VerificationStudio } from './components/VerificationStudio';
import { ResultModal } from './components/ResultModal';
import { TrustLedgerView } from './components/TrustLedgerView';
import { PoliciesView } from './components/PoliciesView';
import { AuditTrailView } from './components/AuditTrailView';
import { ArchitectureView } from './components/ArchitectureView';
import { apiService } from './services/api';
import type { ActiveTab, SystemStatus, VerifyResponse } from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    backendOnline: false,
    modelReady: false,
    kmsTrustReady: false,
    modelName: 'Checking verification service…',
    activePort: 5173,
    environment: 'development',
  });
  const [activeResult, setActiveResult] = useState<VerifyResponse | null>(null);

  useEffect(() => {
    apiService.checkSystemStatus().then(setSystemStatus);
    const interval = setInterval(() => {
      apiService.checkSystemStatus().then(setSystemStatus);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleStartVerification = () => {
    setActiveResult(null);
    setActiveTab('verify');
  };

  return (
    <div className="argus-app-shell min-h-screen flex flex-col relative">
      {/* ── FLOATING ORB BACKGROUNDS ── */}
      {/* ── HEADER ── */}
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveResult(null);
          setActiveTab(tab);
        }}
        systemStatus={systemStatus}
        onStartVerification={handleStartVerification}
      />

      {/* ── MAIN CONTENT ── */}
      <main className="argus-main flex-1 container-max py-10 relative z-10">
        {activeResult ? (
          <ResultModal
            result={activeResult}
            onVerifyAgain={() => {
              setActiveResult(null);
              setActiveTab('verify');
            }}
            onClose={() => {
              setActiveResult(null);
              setActiveTab('overview');
            }}
          />
        ) : (
          <>
            {activeTab === 'overview' && (
              <div className="space-y-14">
                <HeroSection
                  onStartVerification={handleStartVerification}
                  setActiveTab={setActiveTab}
                />
                <PipelineVisual />
              </div>
            )}

            {activeTab === 'verify' && (
              <VerificationStudio
                onVerificationComplete={(result) => setActiveResult(result)}
                onCancel={() => setActiveTab('overview')}
              />
            )}

            {activeTab === 'certificate' && <TrustLedgerView />}
            {activeTab === 'policies' && <PoliciesView />}
            {activeTab === 'audit' && <AuditTrailView />}
            {activeTab === 'architecture' && <ArchitectureView />}
          </>
        )}
      </main>

      {/* ── FOOTER ── */}
      <footer
        className="relative z-10 py-8 argus-footer"
      >
        <div className="container-max flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600 font-mono">
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full bg-cyan-400"
            />
            <span className="text-slate-400 font-display font-bold tracking-widest text-sm">ARGUS</span>
            <span>—</span>
            <span>Human verification &amp; digital trust</span>
          </div>

          <div className="flex items-center gap-3 text-slate-500">
            {['Vertex AI', 'Cloud KMS', 'Cloud Run', 'Firestore'].map((tech, i, arr) => (
              <React.Fragment key={tech}>
                <span className="hover:text-slate-300 transition-colors cursor-default">{tech}</span>
                {i < arr.length - 1 && <span className="text-slate-700">•</span>}
              </React.Fragment>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
