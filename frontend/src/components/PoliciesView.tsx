import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import type { Policy } from '../types';

export const PoliciesView: React.FC = () => {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [newPolicy, setNewPolicy] = useState<Policy>({
    name: '',
    organisation: '',
    confidenceThreshold: 85.0,
    challengeTypes: ['BLINK', 'HEAD_LEFT'],
    maxDurationSeconds: 45,
    active: true,
  });

  useEffect(() => {
    apiService.getPolicies()
      .then((data) => {
        if (data && data.length > 0) {
          setPolicies(data);
        } else {
          // Default seed policy
          setPolicies([
            {
              id: 'pol-default-01',
              name: 'High-Value Financial Clearance',
              organisation: 'Argus Global Finance',
              confidenceThreshold: 85.0,
              challengeTypes: ['BLINK', 'HEAD_LEFT'],
              maxDurationSeconds: 30,
              active: true,
            },
            {
              id: 'pol-default-02',
              name: 'Standard Operational Access',
              organisation: 'Argus Core Ops',
              confidenceThreshold: 75.0,
              challengeTypes: ['HOLD_STILL'],
              maxDurationSeconds: 20,
              active: true,
            },
          ]);
        }
      })
      .catch(() => {
        // Fallback
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPolicy.name || !newPolicy.organisation) return;

    try {
      const saved = await apiService.savePolicy(newPolicy);
      setPolicies((prev) => [...prev, saved]);
    } catch {
      // Local fallback
      setPolicies((prev) => [...prev, { ...newPolicy, id: `pol-${Date.now()}` }]);
    }

    setShowAddModal(false);
    setNewPolicy({
      name: '',
      organisation: '',
      confidenceThreshold: 85.0,
      challengeTypes: ['BLINK', 'HEAD_LEFT'],
      maxDurationSeconds: 45,
      active: true,
    });
  };

  return (
    <section className="view-content" id="po">
      <div className="eyebrow">07 · Administration</div>
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 mb-4">
        <div>
          <h1 className="view-title">
            Verification <i>Policies.</i>
          </h1>
          <p className="lede">
            Configure risk thresholds, challenge requirements, and validation constraints.
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

      {isLoading ? (
        <div className="box-card pad text-center text-xs font-mono text-[var(--mut)]">
          Loading active verification policies...
        </div>
      ) : (
        <div className="g g2">
          {policies.map((pol) => (
            <div key={pol.id || pol.name} className="box-card pad flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="stat-label">{pol.organisation}</span>
                  <span className={`tag-badge ${pol.active ? 'pass' : 'rev'}`}>
                    {pol.active ? 'ACTIVE' : 'DISABLED'}
                  </span>
                </div>

                <h3 style={{ font: '400 24px var(--ser)', margin: '4px 0 12px' }}>{pol.name}</h3>

                <div className="space-y-1.5 text-xs font-mono text-[var(--ink)] my-3 pt-3 border-t border-[var(--soft)]">
                  <div className="flex justify-between">
                    <span className="text-[var(--mut)]">Min Confidence:</span>
                    <span className="font-bold text-[var(--ok)]">{pol.confidenceThreshold}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--mut)]">Max Duration:</span>
                    <span>{pol.maxDurationSeconds}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--mut)]">Required Challenges:</span>
                    <span className="text-[var(--acc)]">{pol.challengeTypes.join(', ')}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--soft)] flex justify-between text-[11px] font-mono text-[var(--mut)]">
                <span>ID: {pol.id || 'pol-sys'}</span>
                <span>REST /api/v1/admin/policies</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="box-card pad max-w-md w-full shadow-[8px_8px_0_var(--ink)]">
            <h3 style={{ font: '400 28px var(--ser)', marginBottom: '16px' }}>
              Create Verification Policy
            </h3>
            <form onSubmit={handleCreatePolicy} className="space-y-4 text-xs font-mono">
              <div>
                <label className="stat-label block mb-1">Policy Name</label>
                <input
                  type="text"
                  required
                  value={newPolicy.name}
                  onChange={(e) => setNewPolicy({ ...newPolicy, name: e.target.value })}
                  placeholder="e.g. Critical API Key Rotation"
                  className="w-full px-3 py-2 border-2 border-[var(--line)] bg-[var(--card)] text-[var(--ink)] focus:outline-none"
                />
              </div>

              <div>
                <label className="stat-label block mb-1">Organisation</label>
                <input
                  type="text"
                  required
                  value={newPolicy.organisation}
                  onChange={(e) => setNewPolicy({ ...newPolicy, organisation: e.target.value })}
                  placeholder="e.g. Acme FinTech"
                  className="w-full px-3 py-2 border-2 border-[var(--line)] bg-[var(--card)] text-[var(--ink)] focus:outline-none"
                />
              </div>

              <div>
                <label className="stat-label block mb-1">
                  Confidence Threshold: {newPolicy.confidenceThreshold}%
                </label>
                <input
                  type="range"
                  min="60"
                  max="98"
                  value={newPolicy.confidenceThreshold}
                  onChange={(e) =>
                    setNewPolicy({ ...newPolicy, confidenceThreshold: Number(e.target.value) })
                  }
                  className="w-full accent-[var(--acc)]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn ghost"
                >
                  Cancel
                </button>
                <button type="submit" className="btn">
                  Save Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
