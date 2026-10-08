import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import type { AuditLog } from '../types';

export const AuditTrailView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setFetchError(null);
    apiService.getAuditLogs()
      .then((data) => {
        setLogs(data);
        setIsLoading(false);
      })
      .catch((err) => {
        setFetchError(err instanceof Error ? err.message : 'Failed to fetch audit logs');
        setIsLoading(false);
      });
  }, []);

  const filteredLogs = logs.filter((l) =>
    l.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.eventType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.resourceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.details.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <section className="view-content" id="au">
      <div className="eyebrow">05 · Immutable Audit Trail</div>
      <h1 className="view-title">
        Who did what, <i>and when.</i>
      </h1>
      <p className="lede">
        Read-only cryptographic audit logs for compliance officers and security auditors. Every session initiation, challenge submission, evaluation, and certificate issuance is tamper-evidently indexed.
      </p>

      {/* Filter / Search input */}
      <div className="mb-4 max-w-md">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter by actor, event type, or resource ID..."
          className="w-full px-3 py-2 border-2 border-[var(--line)] bg-[var(--card)] font-mono text-xs text-[var(--ink)] focus:outline-none"
        />
      </div>

      {fetchError && (
        <div className="box-card pad border-2 border-[var(--bad)] mb-4">
          <div className="stat-label text-[var(--bad)]">Audit Ingress Error</div>
          <p className="text-xs text-[var(--bad)] font-mono">{fetchError}</p>
        </div>
      )}

      <div className="box-card scroll-x">
        <table className="proto-table">
          <thead>
            <tr>
              <th className="proto-th">Timestamp (UTC)</th>
              <th className="proto-th">Actor / Identity</th>
              <th className="proto-th">Event Type</th>
              <th className="proto-th">Resource ID</th>
              <th className="proto-th">Details</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="proto-td m text-center py-8 text-[var(--mut)]">
                  Connecting to PostgreSQL immutable audit store...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="proto-td m text-center py-8 text-[var(--mut)]">
                  No audit events recorded yet. Complete a verification or policy update to populate audit records.
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="proto-td m text-center py-8 text-[var(--mut)]">
                  No audit records match the filter query "{searchTerm}".
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} className="proto-row">
                  <td className="proto-td m whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </td>
                  <td className="proto-td font-mono font-semibold">{log.userId}</td>
                  <td className="proto-td">
                    <span className="tag-badge text-[10px]">{log.eventType}</span>
                  </td>
                  <td className="proto-td m text-[var(--acc)]">{log.resourceId}</td>
                  <td className="proto-td text-xs text-[var(--mut)] max-w-xs truncate" title={log.details}>
                    {log.details}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
