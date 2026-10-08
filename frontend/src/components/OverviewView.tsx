import React from 'react';
import type { SystemStatus, VerificationHistoryItem } from '../types';

interface OverviewViewProps {
  onStartVerification: () => void;
  systemStatus: SystemStatus;
  recentRecords: VerificationHistoryItem[];
  onSelectRecord?: (id: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  onStartVerification,
  systemStatus,
  recentRecords,
  onSelectRecord,
}) => {
  return (
    <section className="view-content" id="ov">
      <div className="eyebrow">01 · System Overview & Telemetry</div>
      <h1 className="view-title">
        Proof of a <i>live human</i>, on the record.
      </h1>
      <p className="lede">
        Every verification combines physiological rPPG micro-vascular sensing, behavioural analysis, interactive challenge execution, and ONNX anti-spoofing to issue tamper-evident certificates.
      </p>

      {/* Real System Status Grid from GET /api/v1/verify/health-check */}
      <div className="g g4 mb-6">
        <div className="box-card pad">
          <div className="stat-label">Core Engine</div>
          <div className="text-xl font-bold font-mono text-[var(--ink)] mt-1 flex items-center gap-2">
            <span className={`status-dot ${systemStatus.backendOnline ? '' : 'offline'}`} />
            {systemStatus.backendOnline ? 'OPERATIONAL' : 'OFFLINE'}
          </div>
          <div className="text-[11px] font-mono text-[var(--mut)] mt-1">
            Spring Boot REST :8080
          </div>
        </div>

        <div className="box-card pad">
          <div className="stat-label">Biometric ML Engine</div>
          <div className="text-xl font-bold font-mono text-[var(--ok)] mt-1">
            {systemStatus.modelReady ? 'ACTIVE' : 'STANDBY'}
          </div>
          <div className="text-[11px] font-mono text-[var(--mut)] mt-1 truncate" title={systemStatus.modelName}>
            MiniFASNetV2-SE
          </div>
        </div>

        <div className="box-card pad">
          <div className="stat-label">Cloud KMS Trust Layer</div>
          <div className="text-xl font-bold font-mono text-[var(--ok)] mt-1">
            {systemStatus.kmsTrustReady ? 'CONNECTED' : 'DISCONNECTED'}
          </div>
          <div className="text-[11px] font-mono text-[var(--mut)] mt-1">
            ECDSA / SHA-256 Key Ring
          </div>
        </div>

        <div className="box-card pad">
          <div className="stat-label">Session Verifications</div>
          <div className="stat-num">
            {recentRecords.length}
            <small>runs</small>
          </div>
          <div className="text-[11px] font-mono text-[var(--mut)] mt-1">
            Local session audit log
          </div>
        </div>
      </div>

      {/* Grid: Recent Verifications Outcome Strip & Operational Status */}
      <div className="g g2">
        <div className="box-card">
          <h2 className="section-header">Recent Session Outcomes</h2>
          {recentRecords.length > 0 ? (
            <div>
              <div className="strip-grid" aria-label="Recent outcomes">
                {recentRecords.map((r, idx) => {
                  const isFail = r.verdict === 'FAIL' || r.verdict === 'PRESENCE_NOT_CONFIRMED';
                  const isRev = r.verdict === 'UNCERTAIN' || r.verdict === 'INCONCLUSIVE' || r.verdict === 'INCOMPLETE';
                  return (
                    <i
                      key={idx}
                      className={`cursor-pointer ${isFail ? 'f' : isRev ? 'r' : ''}`}
                      title={`${r.verificationId}: ${r.verdict} (Click to open certificate)`}
                      onClick={() => onSelectRecord?.(r.verificationId)}
                    />
                  );
                })}
              </div>
              <div className="pad m border-t border-[var(--soft)] text-[var(--mut)] flex gap-4 text-xs font-mono">
                <div><span className="pass">■</span> CONFIRMED ({recentRecords.filter(r => r.verdict === 'PASS' || r.verdict === 'PRESENCE_CONFIRMED').length})</div>
                <div><span className="rev">■</span> INCONCLUSIVE ({recentRecords.filter(r => r.verdict === 'UNCERTAIN' || r.verdict === 'INCONCLUSIVE' || r.verdict === 'INCOMPLETE').length})</div>
                <div><span className="fail">■</span> NOT CONFIRMED ({recentRecords.filter(r => r.verdict === 'FAIL' || r.verdict === 'PRESENCE_NOT_CONFIRMED').length})</div>
              </div>
            </div>
          ) : (
            <div className="pad py-8 text-center font-mono text-xs text-[var(--mut)]">
              <p>No verifications completed in this session yet.</p>
              <p className="mt-1 text-[11px]">Initiate a verification run below to populate live telemetry.</p>
            </div>
          )}
        </div>

        <div className="box-card">
          <h2 className="section-header">Operational Security Notice</h2>
          <div className="pad space-y-3 font-mono text-xs">
            <div className="flex items-start gap-2">
              <span className="text-[var(--ok)] font-bold">✓</span>
              <span>
                <strong>Zero Permanent Raw Video Storage:</strong> Optical frames are transiently evaluated in-memory and discarded.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[var(--ok)] font-bold">✓</span>
              <span>
                <strong>Multi-Modal Fusion:</strong> Decisions require simultaneous physiological, behavioral, and anti-spoof alignment.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[var(--acc)] font-bold">ℹ</span>
              <span>
                <strong>Cryptographic Nonce Attestation:</strong> Certificates are signed with Google Cloud KMS keys and verifiable offline.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary CTA */}
      <div style={{ marginTop: '24px' }}>
        <button
          type="button"
          className="btn"
          onClick={onStartVerification}
          disabled={!systemStatus.backendOnline}
        >
          {systemStatus.backendOnline ? 'Start a verification →' : 'Backend Connecting (:8080)...'}
        </button>
      </div>
    </section>
  );
};
