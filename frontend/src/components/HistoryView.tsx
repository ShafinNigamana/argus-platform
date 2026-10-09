import React, { useState } from 'react';
import type { VerificationHistoryItem } from '../types';

interface HistoryViewProps {
  records: VerificationHistoryItem[];
  onSelectCertificate: (verificationId: string) => void;
  onStartVerification: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  records,
  onSelectCertificate,
  onStartVerification,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterVerdict, setFilterVerdict] = useState<string>('ALL');
  const [selectedRecord, setSelectedRecord] = useState<VerificationHistoryItem | null>(null);

  // Filter records
  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.verificationId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.operationType.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesVerdict =
      filterVerdict === 'ALL' || r.verdict === filterVerdict;

    return matchesSearch && matchesVerdict;
  });

  const getVerdictTag = (verdict: string) => {
    if (verdict === 'PASS') return <span className="tag-badge pass">PASS</span>;
    if (verdict === 'FAIL') return <span className="tag-badge fail">FAIL</span>;
    return <span className="tag-badge rev">UNCERTAIN</span>;
  };

  return (
    <section className="view-content" id="rc">
      <div className="eyebrow">03 · Verification History</div>
      <h1 className="view-title">
        Audit-Proof <i>History.</i>
      </h1>
      <p className="lede">
        Search and filter all past verification events, component scores, and attestation status.
      </p>

      {/* Search & Filter Bar */}
      <div className="box-card pad mb-4 flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Verification ID, User, or Operation..."
            className="w-full px-3 py-2 border-2 border-[var(--line)] bg-[var(--card)] font-mono text-xs text-[var(--ink)] focus:outline-none"
          />
        </div>

        <div className="flex gap-1.5 font-mono text-xs">
          {['ALL', 'PASS', 'FAIL', 'UNCERTAIN'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilterVerdict(status)}
              className={`px-3 py-1.5 border border-[var(--line)] text-xs font-semibold ${
                filterVerdict === status
                  ? 'bg-[var(--ink)] text-[var(--bg)]'
                  : 'bg-[var(--card)] text-[var(--ink)] hover:bg-[var(--soft)]'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table / Empty State */}
      {records.length === 0 ? (
        <div className="box-card pad text-center py-12">
          <div className="stat-label">Empty Ledger</div>
          <h3 style={{ font: '400 24px var(--ser)', margin: '8px 0' }}>
            No verifications recorded in this session
          </h3>
          <p className="text-xs text-[var(--mut)] max-w-md mx-auto mb-4">
            Perform a biometric verification to populate real-time physiological scores and cryptographic certificates.
          </p>
          <button type="button" className="btn" onClick={onStartVerification}>
            Start First Verification →
          </button>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="box-card pad text-center py-8">
          <div className="stat-label">No Results</div>
          <p className="text-xs text-[var(--mut)] mt-1">
            No verification records match your query "{searchTerm}".
          </p>
        </div>
      ) : (
        <div className="box-card scroll-x">
          <table className="proto-table">
            <thead>
              <tr>
                <th className="proto-th">Verification ID</th>
                <th className="proto-th">Timestamp</th>
                <th className="proto-th">Verdict</th>
                <th className="proto-th">Confidence</th>
                <th className="proto-th">Operation</th>
                <th className="proto-th">Certificate</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((r) => {
                const isPass = r.verdict === 'PASS';
                const formattedTime = r.timestamp.includes('T')
                  ? new Date(r.timestamp).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })
                  : r.timestamp;

                const confidenceDisplay =
                  r.confidenceScore !== null && r.confidenceScore !== undefined
                    ? (r.confidenceScore > 1
                        ? r.confidenceScore / 100
                        : r.confidenceScore
                      ).toFixed(2)
                    : '—';

                return (
                  <tr
                    key={r.verificationId}
                    className="proto-row"
                    tabIndex={0}
                    onClick={() => setSelectedRecord(r)}
                  >
                    <td className="proto-td m font-semibold text-[var(--acc)]">
                      {r.verificationId}
                    </td>
                    <td className="proto-td m">{formattedTime}</td>
                    <td className="proto-td">{getVerdictTag(r.verdict)}</td>
                    <td className="proto-td m">{confidenceDisplay}</td>
                    <td className="proto-td font-mono text-xs">{r.operationType}</td>
                    <td className="proto-td m">
                      {isPass ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectCertificate(r.verificationId);
                          }}
                          className="text-[var(--acc)] hover:underline font-semibold"
                        >
                          View Certificate ↗
                        </button>
                      ) : (
                        <span className="text-[var(--mut)]">None Issued</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Record Details Modal / Drawer */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="box-card pad max-w-lg w-full shadow-[8px_8px_0_var(--ink)]">
            <div className="flex justify-between items-baseline mb-3">
              <span className="stat-label">Verification Record Details</span>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="text-xs font-mono text-[var(--mut)] hover:text-[var(--ink)]"
              >
                [Close ✕]
              </button>
            </div>

            <h3 style={{ font: '400 28px var(--ser)' }}>
              {selectedRecord.verificationId}
            </h3>

            <div className="my-3 py-2 border-y border-[var(--soft)] space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-[var(--mut)]">Verdict:</span>
                <span>{getVerdictTag(selectedRecord.verdict)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--mut)]">Confidence Score:</span>
                <span className="font-bold">
                  {selectedRecord.confidenceScore !== null
                    ? selectedRecord.confidenceScore
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--mut)]">Subject User ID:</span>
                <span>{selectedRecord.userId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--mut)]">Operation Type:</span>
                <span>{selectedRecord.operationType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--mut)]">Timestamp:</span>
                <span>{new Date(selectedRecord.timestamp).toUTCString()}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              {selectedRecord.verdict === 'PASS' && (
                <button
                  type="button"
                  className="btn text-xs"
                  onClick={() => {
                    onSelectCertificate(selectedRecord.verificationId);
                    setSelectedRecord(null);
                  }}
                >
                  Open Certificate ↗
                </button>
              )}
              <button
                type="button"
                className="btn ghost text-xs"
                onClick={() => setSelectedRecord(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
