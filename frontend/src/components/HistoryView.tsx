import React, { useState, useEffect, useCallback } from 'react';
import type { VerificationHistoryItem, PagedResponse } from '../types';
import { formatVerdictLabel, formatReasonCodeLabel } from '../types';
import { apiService } from '../services/api';

interface HistoryViewProps {
  records?: VerificationHistoryItem[];
  onSelectCertificate: (verificationId: string) => void;
  onStartVerification: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  onSelectCertificate,
  onStartVerification,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(0);
  const pageSize = 10;
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [pagedData, setPagedData] = useState<PagedResponse<VerificationHistoryItem> | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<VerificationHistoryItem | null>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getVerifications({
        page,
        size: pageSize,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      setPagedData(data);
    } catch (err: any) {
      console.error('Failed to load verification history:', err);
      setError(err?.message || 'Failed to retrieve verification history from ledger.');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleFilterChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    setPage(0);
  };

  const recordsList = pagedData?.content || [];

  // Client-side quick filter on current page results
  const filteredRecords = recordsList.filter((r) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.verificationId.toLowerCase().includes(term) ||
      r.userId.toLowerCase().includes(term) ||
      (r.operationType && r.operationType.toLowerCase().includes(term)) ||
      (r.reasonCode && r.reasonCode.toLowerCase().includes(term))
    );
  });

  const getVerdictTag = (verdict?: string) => {
    if (verdict === 'PRESENCE_CONFIRMED' || verdict === 'PASS') {
      return <span className="tag-badge pass">CONFIRMED</span>;
    }
    if (verdict === 'PRESENCE_NOT_CONFIRMED' || verdict === 'FAIL') {
      return <span className="tag-badge fail">NOT CONFIRMED</span>;
    }
    if (verdict === 'INCONCLUSIVE' || verdict === 'UNCERTAIN') {
      return <span className="tag-badge rev">INCONCLUSIVE</span>;
    }
    return <span className="tag-badge rev">INCOMPLETE</span>;
  };

  return (
    <section className="view-content" id="rc">
      <div className="eyebrow">03 · Authoritative Verification Ledger</div>
      <h1 className="view-title">
        Audit-Proof <i>History.</i>
      </h1>
      <p className="lede">
        Authoritative cryptographic history backed by PostgreSQL ledger with explainable decision codes and role-scoped access.
      </p>

      {/* Search & Filter Bar */}
      <div className="box-card pad mb-4 flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search current page by ID, user, or reason code..."
            className="w-full px-3 py-2 border-2 border-[var(--line)] bg-[var(--card)] font-mono text-xs text-[var(--ink)] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 font-mono text-xs">
          {['ALL', 'COMPLETED', 'FAILED', 'IN_PROGRESS', 'INITIATED'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => handleFilterChange(status)}
              className={`px-3 py-1.5 border border-[var(--line)] text-xs font-semibold ${
                statusFilter === status
                  ? 'bg-[var(--ink)] text-[var(--bg)]'
                  : 'bg-[var(--card)] text-[var(--ink)] hover:bg-[var(--soft)]'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="box-card pad text-center py-10 font-mono text-xs text-[var(--mut)]">
          <div className="animate-pulse">Loading verification records from ledger...</div>
        </div>
      )}

      {error && !loading && (
        <div className="box-card pad mb-4 border-2 border-[var(--bad)] text-center py-6">
          <div className="stat-label text-[var(--bad)]">Ledger Query Error</div>
          <p className="text-xs text-[var(--bad)] my-2 font-mono">{error}</p>
          <button type="button" className="btn text-xs" onClick={() => fetchRecords()}>
            Retry Connection ⟳
          </button>
        </div>
      )}

      {/* Main Content */}
      {!loading && !error && (
        <>
          {recordsList.length === 0 ? (
            <div className="box-card pad text-center py-12">
              <div className="stat-label">Empty Ledger</div>
              <h3 style={{ font: '400 24px var(--ser)', margin: '8px 0' }}>
                No verification sessions found
              </h3>
              <p className="text-xs text-[var(--mut)] max-w-md mx-auto mb-4 font-mono">
                {statusFilter !== 'ALL'
                  ? `No verifications match status [${statusFilter}].`
                  : 'No verifications recorded for your account. Start a verification session to generate an authoritative record.'}
              </p>
              <button type="button" className="btn" onClick={onStartVerification}>
                Start First Verification →
              </button>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="box-card pad text-center py-8">
              <div className="stat-label">No Search Matches</div>
              <p className="text-xs text-[var(--mut)] mt-1 font-mono">
                No records on this page match "{searchTerm}".
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
                    <th className="proto-th">Reason / Details</th>
                    <th className="proto-th">Score</th>
                    <th className="proto-th">Operation</th>
                    <th className="proto-th">Certificate</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((r) => {
                    const isConfirmed = r.verdict === 'PRESENCE_CONFIRMED' || r.verdict === 'PASS';
                    const formattedTime = r.timestamp.includes('T')
                      ? new Date(r.timestamp).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : r.timestamp;

                    const scoreDisplay =
                      r.confidenceScore !== null && r.confidenceScore !== undefined
                        ? (r.confidenceScore > 1 ? r.confidenceScore / 100 : r.confidenceScore).toFixed(2)
                        : '—';

                    return (
                      <tr
                        key={r.verificationId}
                        className="proto-row cursor-pointer"
                        tabIndex={0}
                        onClick={() => setSelectedRecord(r)}
                      >
                        <td className="proto-td m font-semibold text-[var(--acc)]">
                          {r.verificationId.substring(0, 13)}...
                        </td>
                        <td className="proto-td m">{formattedTime}</td>
                        <td className="proto-td">{getVerdictTag(r.verdict)}</td>
                        <td className="proto-td text-xs font-mono">
                          {r.reasonCode ? (
                            <span className="font-semibold text-[var(--ink)]">
                              {formatReasonCodeLabel(r.reasonCode)}
                            </span>
                          ) : (
                            <span className="text-[var(--mut)]">—</span>
                          )}
                        </td>
                        <td className="proto-td m">{scoreDisplay}</td>
                        <td className="proto-td font-mono text-xs">{r.operationType}</td>
                        <td className="proto-td m">
                          {isConfirmed ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectCertificate(r.verificationId);
                              }}
                              className="text-[var(--acc)] hover:underline font-semibold"
                            >
                              Certificate ↗
                            </button>
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

          {/* Pagination Controls */}
          {pagedData && pagedData.totalPages > 1 && (
            <div className="flex justify-between items-center mt-4 px-2 font-mono text-xs text-[var(--mut)]">
              <div>
                Page <span className="font-bold text-[var(--ink)]">{page + 1}</span> of{' '}
                <span className="font-bold text-[var(--ink)]">{pagedData.totalPages}</span>{' '}
                ({pagedData.totalElements} records total)
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page === 0 || pagedData.first}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="px-3 py-1 border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--soft)]"
                >
                  ← Previous
                </button>
                <button
                  type="button"
                  disabled={pagedData.last || page >= pagedData.totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--soft)]"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Record Details Modal */}
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

            <h3 style={{ font: '400 22px var(--ser)' }} className="truncate" title={selectedRecord.verificationId}>
              {selectedRecord.verificationId}
            </h3>

            <div className="my-3 py-2 border-y border-[var(--soft)] space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center">
                <span className="text-[var(--mut)]">Semantic Verdict:</span>
                <span>{getVerdictTag(selectedRecord.verdict)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--mut)]">Verdict Label:</span>
                <span className="font-bold">{formatVerdictLabel(selectedRecord.verdict)}</span>
              </div>
              {selectedRecord.reasonCode && (
                <div className="flex justify-between">
                  <span className="text-[var(--mut)]">Reason Code:</span>
                  <span className="font-bold text-[var(--acc)]">
                    {selectedRecord.reasonCode} ({formatReasonCodeLabel(selectedRecord.reasonCode)})
                  </span>
                </div>
              )}
              {selectedRecord.reason && (
                <div className="flex flex-col gap-1 pt-1 border-t border-[var(--soft)]">
                  <span className="text-[var(--mut)]">Explanation:</span>
                  <span className="text-[var(--ink)] bg-[var(--soft)] p-2 leading-relaxed">
                    {selectedRecord.reason}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[var(--mut)]">Session Status:</span>
                <span className="font-semibold">{selectedRecord.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--mut)]">Confidence Score:</span>
                <span className="font-bold">
                  {selectedRecord.confidenceScore !== null
                    ? (selectedRecord.confidenceScore > 1
                        ? selectedRecord.confidenceScore / 100
                        : selectedRecord.confidenceScore
                      ).toFixed(4)
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
              {(selectedRecord.verdict === 'PRESENCE_CONFIRMED' ||
                selectedRecord.verdict === 'PASS' ||
                selectedRecord.status === 'COMPLETED') && (
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

