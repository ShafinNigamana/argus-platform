import React, { useState, useEffect } from 'react';
import { Lock, RefreshCw } from 'lucide-react';
import { apiService } from '../services/api';
import type { AuditLog } from '../types';

export const AuditTrailView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadLogs = async () => {
    setLoading(true);
    const data = await apiService.getAuditLogs();
    setLogs(data);
    setLoading(false);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold">
              Compliance & Non-Repudiation
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-display">
            Immutable Audit Trail
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5 max-w-xl leading-relaxed">
            Append-only structured audit logs capturing all initiation, verification, and certificate lifecycle events for enterprise regulatory audits.
          </p>
        </div>

        <button 
          onClick={loadLogs}
          className="btn-secondary text-xs py-2 px-3.5 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Audit Log Table */}
      <div className="card-glass rounded-2xl overflow-hidden border border-white/[0.08]">
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
              {logs.map((log) => (
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
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-slate-900/40 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-500 font-mono">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Write-Once Append-Only Log Store • Tamper Evident</span>
          </div>
          <span>Showing {logs.length} logged events</span>
        </div>
      </div>
    </div>
  );
};
