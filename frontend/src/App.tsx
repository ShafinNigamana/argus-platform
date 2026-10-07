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
    modelReady: true,
    kmsTrustReady: true,
    modelName: 'Argus Multi-Modal Engine',
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

  const handleVerificationComplete = (result: VerifyResponse) => {
    setActiveResult(result);
  };

  return (
    <div className="min-h-screen bg-[#0B0D10] text-[#F8FAFC] flex flex-col relative bg-grid-pattern selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* Ambient Top Glow */}
      <div className="ambient-glow-top" />

      {/* Main Navigation Header */}
      <Header 
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveResult(null);
          setActiveTab(tab);
        }}
        systemStatus={systemStatus}
        onStartVerification={handleStartVerification}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 container-max py-10 sm:py-16 relative z-10">
        {/* If a verification result is active, show the result modal */}
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
              <div className="space-y-24 sm:space-y-36">
                <HeroSection 
                  onStartVerification={handleStartVerification}
                  setActiveTab={setActiveTab}
                />
                <PipelineVisual />
              </div>
            )}

            {activeTab === 'verify' && (
              <VerificationStudio 
                onVerificationComplete={handleVerificationComplete}
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

      {/* Product Footer */}
      <footer className="border-t border-white/[0.08] bg-[#0E1116] py-8 text-xs text-slate-500 font-mono relative z-10">
        <div className="container-max flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="text-slate-300 font-semibold font-display">ARGUS PLATFORM</span>
            <span>—</span>
            <span>Google Solution Challenge 2026</span>
          </div>

          <div className="flex items-center gap-6 text-slate-400">
            <span>Vertex AI (Gemini 2.5)</span>
            <span>•</span>
            <span>Cloud KMS</span>
            <span>•</span>
            <span>Cloud Run</span>
            <span>•</span>
            <span>Firestore</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
