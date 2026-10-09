import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import type { Policy } from '../types';

export const PoliciesView: React.FC = () => {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [newPolicy, setNewPolicy] = useState<Policy>({
    name: '',
    organisation: '',
    confidenceThreshold: 80.0,
    challengeTypes: ['BLINK', 'HEAD_LEFT'],
    maxDurationSeconds: 45,
    active: true,
  });

  const loadPolicies = () => {
    setIsLoading(true);
    apiService
      .getPolicies()
      .then((data) => {
        setPolicies(data || []);
      })
      .catch(() => {
        setPolicies([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadPolicies();
  }, []);

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPolicy.name.trim() || !newPolicy.organisation.trim()) return;

    setSaveError(null);
    try {
      const saved = await apiService.savePolicy({
        ...newPolicy,
        name: newPolicy.name.trim(),
        organisation: newPolicy.organisation.trim(),
      });
      setPolicies((prev) => [...prev, saved]);
      setShowAddModal(false);
      setNewPolicy({
        name: '',
        organisation: '',
        confidenceThreshold: 80.0,
        challengeTypes: ['BLINK', 'HEAD_LEFT'],
        maxDurationSeconds: 45,
        active: true,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save policy to backend';
      setSaveError(msg);
    }
  };

  return (
    <section className="view-content" id="po">
      <div className="eyebrow">06 · Platform Policy Storage</div>
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 mb-4">
        <div>
          <h1 className="view-title">
            Policy <i>Configuration.</i>
          </h1>
          <p className="lede">
            Stored organization verification specifications and threshold parameters.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="btn self-start sm:self-auto"
        >
          New Policy +
        </button>
      </div>

      {/* Engine Architecture & Runtime Threshold Notice */}
      <div className="box-card pad mb-6 border-l-4 border-[var(--acc)] bg-[var(--soft)] font-mono text-xs text-[var(--ink)] space-y-1.5">
        <div className="stat-label text-[var(--acc)]">Operational Architecture Notice</div>
        <p className="leading-relaxed">
          Configuration records below are stored for platform policy management and auditing (persisted in PostgreSQL <code className="text-[var(--ink)]">policies</code> table).
        </p>
        <p className="text-[var(--mut)] text-[11px] leading-relaxed">
          Note: Active verification scoring currently executes the compiled multi-signal decision logic implemented by the verification engine (authoritative 80.0% confidence threshold with mandatory zero presentation attack and dynamic challenge completion).
        </p>
      </div>

      {isLoading ? (
        <div className="box-card pad text-center text-xs font-mono text-[var(--mut)]">
          Loading stored verification policies from database...
        </div>
      ) : policies.length === 0 ? (
        <div className="box-card pad text-center py-12">
          <div className="stat-label">Empty Policy Registry</div>
          <h3 style={{ font: '400 24px var(--ser)', margin: '8px 0' }}>
            No platform policies configured
          </h3>
          <p className="text-xs text-[var(--mut)] max-w-md mx-auto mb-4 font-mono">
            No policy records are currently stored in PostgreSQL. Create an organization policy profile to register configuration targets.
          </p>
          <button
            type="button"
            className="btn text-xs"
            onClick={() => setShowAddModal(true)}
          >
            Create Policy Profile +
          </button>
        </div>
      ) : (
        <div className="g g2">
          {policies.map((pol) => (
            <div key={pol.id || pol.name} className="box-card pad flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="stat-label">{pol.organisation}</span>
                  <span className={`tag-badge ${pol.active ? 'pass' : 'rev'}`}>
                    {pol.active ? 'ACTIVE CONFIG' : 'DISABLED'}
                  </span>
                </div>

                <h3 style={{ font: '400 24px var(--ser)', margin: '4px 0 12px' }}>
                  {pol.name}
                </h3>

                <div className="space-y-1.5 text-xs font-mono text-[var(--ink)] my-3 pt-3 border-t border-[var(--soft)]">
                  <div className="flex justify-between">
                    <span className="text-[var(--mut)]">Target Threshold:</span>
                    <span className="font-bold text-[var(--ok)]">{pol.confidenceThreshold}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--mut)]">Max Duration:</span>
                    <span>{pol.maxDurationSeconds}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--mut)]">Specified Challenges:</span>
                    <span className="text-[var(--acc)]">
                      {Array.isArray(pol.challengeTypes) && pol.challengeTypes.length > 0
                        ? pol.challengeTypes.join(', ')
                        : 'None'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--soft)] flex justify-between text-[11px] font-mono text-[var(--mut)]">
                <span>ID: {pol.id ? pol.id.substring(0, 14) + '...' : 'pol-sys'}</span>
                <span>REST /api/v1/admin/policies</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="box-card pad max-w-md w-full shadow-[8px_8px_0_var(--ink)]">
            <div className="flex justify-between items-baseline mb-3">
              <h3 style={{ font: '400 26px var(--ser)' }}>Create Policy Configuration</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-xs font-mono text-[var(--mut)] hover:text-[var(--ink)]"
              >
                [✕]
              </button>
            </div>

            {saveError && (
              <div className="p-2 mb-3 border border-[var(--bad)] text-[var(--bad)] text-xs font-mono">
                {saveError}
              </div>
            )}

            <form onSubmit={handleCreatePolicy} className="space-y-4 text-xs font-mono">
              <div>
                <label className="stat-label block mb-1">Policy Name</label>
                <input
                  type="text"
                  required
                  value={newPolicy.name}
                  onChange={(e) => setNewPolicy({ ...newPolicy, name: e.target.value })}
                  placeholder="e.g. High-Assurance Transaction"
                  className="w-full px-3 py-2 border-2 border-[var(--line)] bg-[var(--card)] text-[var(--ink)] focus:outline-none"
                />
              </div>

              <div>
                <label className="stat-label block mb-1">Organisation Identifier</label>
                <input
                  type="text"
                  required
                  value={newPolicy.organisation}
                  onChange={(e) => setNewPolicy({ ...newPolicy, organisation: e.target.value })}
                  placeholder="e.g. Argus Internal Ops"
                  className="w-full px-3 py-2 border-2 border-[var(--line)] bg-[var(--card)] text-[var(--ink)] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="stat-label block mb-1">Threshold (%)</label>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    step="0.5"
                    value={newPolicy.confidenceThreshold}
                    onChange={(e) =>
                      setNewPolicy({ ...newPolicy, confidenceThreshold: parseFloat(e.target.value) || 80 })
                    }
                    className="w-full px-3 py-2 border-2 border-[var(--line)] bg-[var(--card)] text-[var(--ink)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="stat-label block mb-1">Max Duration (s)</label>
                  <input
                    type="number"
                    min="10"
                    max="180"
                    value={newPolicy.maxDurationSeconds}
                    onChange={(e) =>
                      setNewPolicy({ ...newPolicy, maxDurationSeconds: parseInt(e.target.value, 10) || 45 })
                    }
                    className="w-full px-3 py-2 border-2 border-[var(--line)] bg-[var(--card)] text-[var(--ink)] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--soft)]">
                <button
                  type="button"
                  className="btn ghost text-xs"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn text-xs">
                  Save Policy Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
