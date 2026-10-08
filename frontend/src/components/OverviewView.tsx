import React, { useState, useEffect, useCallback } from 'react';
import type { SystemStatus, VerificationHistoryItem } from '../types';
import { formatVerdictLabel, formatReasonCodeLabel } from '../types';
import { apiService } from '../services/api';

interface OverviewViewProps {
  onStartVerification: () => void;
  systemStatus: SystemStatus;
  onSelectRecord?: (id: string) => void;
  onNavigateHistory?: () => void;
  canVerify?: boolean;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  onStartVerification,
  systemStatus,
  onSelectRecord,
  onNavigateHistory,
  canVerify = true,
}) => {
  const [recentRecords, setRecentRecords] = useState<VerificationHistoryItem[]>([]);
  const [totalLedgerCount, setTotalLedgerCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchRecentLedger = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const paged = await apiService.getVerifications({ page: 0, size: 10 });
      setRecentRecords(paged.content || []);
      setTotalLedgerCount(paged.totalElements || 0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to query verification ledger';
      setLoadError(msg);
      setRecentRecords([]);
      setTotalLedgerCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecentLedger();
  }, [fetchRecentLedger]);

  const confirmedCount = recentRecords.filter(
    (r) => r.verdict === 'PRESENCE_CONFIRMED' || r.verdict === 'PASS'
  ).length;

  const notConfirmedCount = recentRecords.filter(
    (r) => r.verdict === 'PRESENCE_NOT_CONFIRMED' || r.verdict === 'FAIL'
  ).length;

  const inconclusiveCount = recentRecords.filter(
    (r) => r.verdict === 'INCONCLUSIVE' || r.verdict === 'UNCERTAIN'
  ).length;

  const incompleteCount = recentRecords.filter(
    (r) => r.verdict === 'INCOMPLETE' || r.status === 'INITIATED' || r.status === 'IN_PROGRESS'
  ).length;

  return (
    <section className="view-content" id="ov">
      <div className="eyebrow">01 · Operator Console & Telemetry</div>
      <h1 className="view-title">
        Operational <i>Overview.</i>
      </h1>
      <p className="lede">
        Real-time telemetry and verified human presence events recorded in the authoritative PostgreSQL ledger.
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
          <div className="stat-label">Biometric Pipeline</div>
          <div className="text-xl font-bold font-mono text-[var(--ok)] mt-1">
            {systemStatus.modelReady ? 'ACTIVE' : 'STANDBY'}
          </div>
          <div className="text-[11px] font-mono text-[var(--mut)] mt-1 truncate" title={systemStatus.modelName}>
            MiniFASNetV2 + UltraFace
          </div>
        </div>

        <div className="box-card pad">
          <div className="stat-label">Cryptographic Trust Layer</div>
          <div className="text-xl font-bold font-mono text-[var(--ok)] mt-1">
            {systemStatus.kmsTrustReady ? 'CONNECTED' : 'STANDBY'}
          </div>
          <div className="text-[11px] font-mono text-[var(--mut)] mt-1">
            KMS Asymmetric / SHA-256
          </div>
        </div>

        <div className="box-card pad">
          <div className="stat-label">Recorded Sessions</div>
          <div className="stat-num">
            {isLoading ? '…' : totalLedgerCount}
            <small>total</small>
          </div>
          <div className="text-[11px] font-mono text-[var(--mut)] mt-1">
            PostgreSQL ledger entries
          </div>
        </div>
      </div>

      {/* Outcome Metric Breakdown (Real records from active ledger query) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="p-3 border border-[var(--line)] bg-[var(--card)]">
          <div className="stat-label">Presence Confirmed</div>
          <div className="text-xl font-bold font-mono text-[var(--ok)] mt-1">
            {confirmedCount}
          </div>
          <div className="text-[10px] font-mono text-[var(--mut)] mt-0.5">In recent batch</div>
        </div>
        <div className="p-3 border border-[var(--line)] bg-[var(--card)]">
          <div className="stat-label">Not Confirmed</div>
          <div className="text-xl font-bold font-mono text-[var(--bad)] mt-1">
            {notConfirmedCount}
          </div>
          <div className="text-[10px] font-mono text-[var(--mut)] mt-0.5">Rejected or spoof</div>
        </div>
        <div className="p-3 border border-[var(--line)] bg-[var(--card)]">
          <div className="stat-label">Inconclusive</div>
          <div className="text-xl font-bold font-mono text-[var(--acc)] mt-1">
            {inconclusiveCount}
          </div>
          <div className="text-[10px] font-mono text-[var(--mut)] mt-0.5">Below confidence threshold</div>
        </div>
        <div className="p-3 border border-[var(--line)] bg-[var(--card)]">
          <div className="stat-label">Incomplete</div>
          <div className="text-xl font-bold font-mono text-[var(--mut)] mt-1">
            {incompleteCount}
          </div>
          <div className="text-[10px] font-mono text-[var(--mut)] mt-0.5">Aborted or timed out</div>
        </div>
      </div>

      {/* Recent Verification Events Table */}
      <div className="box-card mb-6">
        <div className="p-4 border-b border-[var(--line)] flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold font-mono">Recent Verification Events</h2>
            <p className="text-xs text-[var(--mut)] font-mono mt-0.5">
              Authoritative PostgreSQL records retrieved via GET /api/v1/verify
            </p>
          </div>
          {onNavigateHistory && (
            <button
              type="button"
              onClick={onNavigateHistory}
              className="text-xs font-mono text-[var(--acc)] hover:underline"
            >
              View Full Ledger →
            </button>
          )}
        </div>

        {loadError && (
          <div className="p-4 text-xs font-mono text-[var(--bad)] border-b border-[var(--line)] bg-[var(--card)]">
            Error loading recent verification events: {loadError}
          </div>
        )}

        {isLoading ? (
          <div className="p-8 text-center text-xs font-mono text-[var(--mut)]">
            Loading recent records from PostgreSQL ledger...
          </div>
        ) : recentRecords.length === 0 ? (
          <div className="p-8 text-center font-mono text-xs text-[var(--mut)]">
            <p>No verification activity recorded yet for this account.</p>
            {canVerify && (
              <p className="mt-1 text-[11px]">
                Initiate a verification session to generate an authoritative presence record.
              </p>
            )}
          </div>
        ) : (
          <div className="scroll-x">
            <table className="proto-table">
              <thead>
                <tr>
                  <th className="proto-th">Verification ID</th>
                  <th className="proto-th">Timestamp</th>
                  <th className="proto-th">Subject</th>
                  <th className="proto-th">Outcome</th>
                  <th className="proto-th">Reason / Details</th>
                  <th className="proto-th">Certificate</th>
                </tr>
              </thead>
              <tbody>
                {recentRecords.map((r) => {
                  const isConfirmed =
                    r.verdict === 'PRESENCE_CONFIRMED' || r.verdict === 'PASS';
                  const formattedTime = r.timestamp?.includes('T')
                    ? new Date(r.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })
                    : r.timestamp;

                  return (
                    <tr
                      key={r.verificationId}
                      className="proto-row cursor-pointer"
                      onClick={() => onSelectRecord?.(r.verificationId)}
                    >
                      <td className="proto-td m font-semibold text-[var(--acc)]">
                        {r.verificationId.substring(0, 14)}...
                      </td>
                      <td className="proto-td m">{formattedTime}</td>
                      <td className="proto-td font-mono text-xs">{r.userId}</td>
                      <td className="proto-td">
                        <span
                          className={`tag-badge ${
                            isConfirmed
                              ? 'pass'
                              : r.verdict === 'PRESENCE_NOT_CONFIRMED' || r.verdict === 'FAIL'
                              ? 'fail'
                              : 'rev'
                          }`}
                        >
                          {formatVerdictLabel(r.verdict)}
                        </span>
                      </td>
                      <td className="proto-td text-xs font-mono text-[var(--mut)] max-w-xs truncate">
                        {r.reasonCode ? formatReasonCodeLabel(r.reasonCode) : r.reason || '—'}
                      </td>
                      <td className="proto-td m">
                        {isConfirmed ? (
                          <span className="text-[var(--ok)] font-semibold">Available ↗</span>
                        ) : (
                          <span className="text-[var(--mut)]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Operational Security Notice */}
      <div className="box-card mb-6">
        <h2 className="section-header">Operational Principles & Data Boundaries</h2>
        <div className="pad space-y-3 font-mono text-xs">
          <div className="flex items-start gap-2">
            <span className="text-[var(--ok)] font-bold">✓</span>
            <span>
              <strong>Zero Raw Video Frame Retention:</strong> Video frames are transiently evaluated in volatile memory and discarded immediately following analysis.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[var(--ok)] font-bold">✓</span>
            <span>
              <strong>Multi-Signal Presence Verification:</strong> Verification requires combined physiological micro-vascular, behavioral dynamic, and presentation attack alignment.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[var(--acc)] font-bold">ℹ</span>
            <span>
              <strong>Cryptographic Attestation Records:</strong> Successful verification sessions generate signed records anchored via Google Cloud KMS or SHA-256 fallback digest. Access is strictly authenticated.
            </span>
          </div>
        </div>
      </div>

      {/* Primary Action Button */}
      {canVerify && (
        <div>
          <button
            type="button"
            className="btn"
            onClick={onStartVerification}
            disabled={!systemStatus.backendOnline}
          >
            {systemStatus.backendOnline ? 'Start a Verification →' : 'Connecting to Core Engine (:8080)...'}
          </button>
        </div>
      )}
    </section>
  );
};
