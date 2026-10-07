import React, { useState, useEffect, useMemo } from 'react';
import { Download, Lock, RefreshCw, Search } from 'lucide-react';
import { apiService } from '../services/api';
import type { AuditLog } from '../types';

export const AuditTrailView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [query, setQuery] = useState('');
  const [eventFilter, setEventFilter] = useState('ALL');

  const loadLogs = async () => {
    setLoading(true);
    const data = await apiService.getAuditLogs();
    setLogs(data);
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    apiService.getAuditLogs().then((data) => {
      if (active) {
        setLogs(data);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, []);

  const eventTypes = useMemo(() => [...new Set(logs.map((log) => log.eventType))].sort(), [logs]);
  const filteredLogs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return logs.filter((log) => {
      const matchesEvent = eventFilter === 'ALL' || log.eventType === eventFilter;
      const searchable = [log.eventType, log.userId, log.resourceId, log.resourceType, log.details, log.ipAddress].join(' ').toLowerCase();
      return matchesEvent && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [eventFilter, logs, query]);

  const exportCsv = () => {
    const columns: (keyof AuditLog)[] = ['timestamp', 'eventType', 'userId', 'resourceType', 'resourceId', 'details', 'ipAddress'];
    const escapeCsv = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const rows = [columns.join(','), ...filteredLogs.map((log) => columns.map((column) => escapeCsv(log[column])).join(','))];
    const blob = new Blob([`\uFEFF${rows.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'argus-audit-trail.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="argus-page">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold">
              Compliance & Non-Repudiation
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
            Verification audit events
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
            Events returned by the service and actions recorded in this browser. Browser-local entries are not tamper-evident audit records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={exportCsv} disabled={filteredLogs.length === 0} className="btn-secondary text-xs py-2 px-3.5 shrink-0">
            <Download className="w-3.5 h-3.5" /><span>Export CSV</span>
          </button>
          <button onClick={loadLogs} disabled={loading} className="btn-secondary text-xs py-2 px-3.5 shrink-0">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /><span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="card-glass rounded-2xl overflow-hidden border border-white/[0.08]">
        <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-white/[0.07]">
          <label className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search actor, event, resource or details" className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm" aria-label="Search audit events" />
          </label>
          <select value={eventFilter} onChange={(event) => setEventFilter(event.target.value)} className="rounded-xl px-3 py-2.5 text-sm sm:w-60" aria-label="Filter by event type">
            <option value="ALL">All event types</option>
            {eventTypes.map((type) => <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-white/[0.08] uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">Actor / Subject</th>
                <th className="py-3 px-4">Resource ID</th>
                <th className="py-3 px-4">Event Details</th>
                <th className="py-3 px-4">Client IP</th>
                <th className="py-3 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-slate-300">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">Loading audit events…</td></tr>
              ) : filteredLogs.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">No events match this search. Try another term or event type.</td></tr>
              ) : filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-white/5 font-semibold">
                      {log.eventType}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-white font-semibold">{log.userId}</td>
                  <td className="py-3 px-4 text-slate-400 truncate max-w-[120px]">{log.resourceId}</td>
                  <td className="py-3 px-4 text-slate-200 max-w-xs">{log.details}</td>
                  <td className="py-3 px-4 text-slate-400">{log.ipAddress}</td>
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-slate-900/40 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-500 font-mono">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Browser-local activity is not a tamper-evident audit record.</span>
          </div>
          <span>Showing {filteredLogs.length} of {logs.length} events</span>
        </div>
      </div>
    </div>
  );
};
