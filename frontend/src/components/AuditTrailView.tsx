import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import type { AuditLog } from '../types';

export const AuditTrailView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [userQuery, setUserQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const data = await apiService.getAuditLogs({
        userId: userQuery.trim() ? userQuery.trim() : undefined,
        limit: 100,
      });
      setLogs(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve audit trail';
      setFetchError(msg);
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [userQuery]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = logs.filter((l) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const actor = (l.userId || '').toLowerCase();
    const evt = (l.eventType || '').toLowerCase();
    const res = (l.resourceId || '').toLowerCase();
    const type = (l.resourceType || '').toLowerCase();
    const det = (l.details || l.actionDetails || '').toLowerCase();
    return (
      actor.includes(term) ||
      evt.includes(term) ||
      res.includes(term) ||
      type.includes(term) ||
      det.includes(term)
    );
  });

  return (
    <section className="view-content" id="au">
      <div className="eyebrow">05 · Operational Compliance</div>
      <h1 className="view-title">
        Audit <i>Trail.</i>
      </h1>
      <p className="lede">
        Authoritative event records documenting verification activity, authentication, certificate issuance, and administrative updates.
      </p>

      {/* Filter / Search input bar */}
      <div className="box-card pad mb-4 flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter current view by actor, event type, or details..."
            className="w-full px-3 py-2 border-2 border-[var(--line)] bg-[var(--card)] font-mono text-xs text-[var(--ink)] focus:outline-none"
          />
        </div>

        <div className="flex gap-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchLogs();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="Query by User ID..."
              className="px-3 py-1.5 border border-[var(--line)] bg-[var(--card)] font-mono text-xs text-[var(--ink)] focus:outline-none w-40"
            />
            <button type="submit" className="btn text-xs py-1.5 px-3">
              Filter
            </button>
          </form>
          <button
            type="button"
            className="btn ghost text-xs py-1.5 px-3"
            onClick={() => {
              setUserQuery('');
              fetchLogs();
            }}
          >
            Refresh ⟳
          </button>
        </div>
      </div>

      {fetchError && (
        <div className="box-card pad border-2 border-[var(--bad)] mb-4">
          <div className="stat-label text-[var(--bad)]">Audit Access Notice</div>
          <p className="text-xs text-[var(--bad)] font-mono mt-1">{fetchError}</p>
          <p className="text-xs text-[var(--mut)] font-mono mt-1">
            Access to the audit trail is restricted to AUDIT, ADMIN, and SUPERADMIN roles. Ensure your authenticated session holds sufficient permissions.
          </p>
        </div>
      )}

      <div className="box-card scroll-x">
        <table className="proto-table">
          <thead>
            <tr>
              <th className="proto-th">Timestamp (UTC)</th>
              <th className="proto-th">Actor / Identity</th>
              <th className="proto-th">Event Type</th>
              <th className="proto-th">Target Resource</th>
              <th className="proto-th">Details</th>
              <th className="proto-th">Client IP</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="proto-td m text-center py-8 text-[var(--mut)]">
                  Loading audit trail from PostgreSQL...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="proto-td m text-center py-8 text-[var(--mut)]">
                  No audit events recorded yet in the database.
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="proto-td m text-center py-8 text-[var(--mut)]">
                  No audit events match the filter query "{searchTerm}".
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} className="proto-row">
                  <td className="proto-td m whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </td>
                  <td className="proto-td font-mono font-semibold">
                    {log.userId || <span className="text-[var(--mut)]">system</span>}
                  </td>
                  <td className="proto-td">
                    <span className="tag-badge text-[10px]">{log.eventType}</span>
                  </td>
                  <td className="proto-td m text-[var(--acc)]">
                    {log.resourceType ? `${log.resourceType}: ` : ''}
                    {log.resourceId ? log.resourceId.substring(0, 16) + '...' : '—'}
                  </td>
                  <td
                    className="proto-td text-xs text-[var(--mut)] max-w-sm truncate"
                    title={log.actionDetails || log.details}
                  >
                    {log.actionDetails || log.details || '—'}
                  </td>
                  <td className="proto-td font-mono text-[11px] text-[var(--mut)]">
                    {log.ipAddress || '—'}
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
