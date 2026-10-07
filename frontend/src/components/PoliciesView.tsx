import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Power } from 'lucide-react';
import { apiService } from '../services/api';
import type { Policy } from '../types';

export const PoliciesView: React.FC = () => {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [policyFilter, setPolicyFilter] = useState<'ALL' | 'ACTIVE' | 'DISABLED'>('ALL');
  const [newPolicy, setNewPolicy] = useState<Policy>({
    name: '',
    organisation: '',
    confidenceThreshold: 85.0,
    challengeTypes: ['BLINK', 'HEAD_LEFT'],
    maxDurationSeconds: 45,
    active: true,
  });

  useEffect(() => {
    apiService.getPolicies().then(setPolicies);
  }, []);

  const visiblePolicies = useMemo(
    () => policies.filter((policy) => policyFilter === 'ALL' || (policyFilter === 'ACTIVE' ? policy.active : !policy.active)),
    [policies, policyFilter],
  );

  const togglePolicy = async (policy: Policy) => {
    const updated = await apiService.savePolicy({ ...policy, active: !policy.active });
    setPolicies((current) => current.map((item) =>
      policy.id ? item.id === policy.id ? updated : item : item.name === policy.name && item.organisation === policy.organisation ? updated : item,
    ));
  };

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPolicy.name || !newPolicy.organisation) return;

    const saved = await apiService.savePolicy(newPolicy);
    setPolicies((prev) => [...prev, saved]);
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
    <div className="argus-page">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold">
              Policy & Compliance Administration
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
            Active Verification Policies
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
            Configure risk-adaptive confidence thresholds, mandatory challenge sets, and session validity constraints per organization.
          </p>
        </div>

        <button 
          onClick={() => setShowAddModal(true)}
          className="btn-primary text-xs sm:text-sm py-2.5 px-4 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Policy</span>
        </button>
      </div>

      {/* Policies Grid */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter policies">
          {(['ALL', 'ACTIVE', 'DISABLED'] as const).map((filter) => (
            <button key={filter} type="button" onClick={() => setPolicyFilter(filter)} className={policyFilter === filter ? 'btn-primary py-2 px-3 text-xs' : 'btn-outline py-2 px-3 text-xs'}>
              {filter === 'ALL' ? `All (${policies.length})` : `${filter === 'ACTIVE' ? 'Active' : 'Disabled'} (${policies.filter((policy) => policy.active === (filter === 'ACTIVE')).length})`}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-500 font-mono">Changes are saved in this browser</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visiblePolicies.length === 0 ? (
          <div className="card-glass rounded-2xl p-8 md:col-span-2 text-center">
            <h3 className="text-lg font-bold text-white mb-2">No policies in this view</h3>
            <p className="text-sm text-slate-400">Create a policy or choose another filter to see your verification rules.</p>
          </div>
        ) : visiblePolicies.map((pol) => (
          <div 
            key={pol.id || pol.name}
            className="card-glass p-5 rounded-2xl flex flex-col justify-between border border-white/[0.08]"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold">
                  {pol.organisation}
                </span>
                <span className={`badge-status text-[10px] ${pol.active ? 'badge-green' : 'badge-amber'}`}>
                  {pol.active ? 'ACTIVE' : 'DISABLED'}
                </span>
              </div>

              <h3 className="text-base font-bold text-white font-display mb-2">{pol.name}</h3>

              <div className="space-y-2 text-xs font-mono text-slate-300 my-4 p-3 rounded-xl bg-black/40 border border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Min Confidence:</span>
                  <span className="text-emerald-400 font-semibold">{pol.confidenceThreshold}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Max Duration:</span>
                  <span>{pol.maxDurationSeconds}s</span>
                </div>
                <div className="flex items-start justify-between">
                  <span className="text-slate-500">Challenges:</span>
                  <span className="text-cyan-300 text-right">{pol.challengeTypes.join(', ')}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
              <span className="font-mono text-[11px]">ID: {pol.id || 'pol-sys'}</span>
              <button type="button" onClick={() => togglePolicy(pol)} className="btn-outline py-1.5 px-2.5 text-[11px]" aria-label={`${pol.active ? 'Disable' : 'Activate'} ${pol.name}`}>
                <Power className={`w-3.5 h-3.5 ${pol.active ? 'text-emerald-400' : 'text-amber-400'}`} />
                {pol.active ? 'Disable policy' : 'Activate policy'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Policy Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card-glass p-6 rounded-2xl max-w-md w-full border border-cyan-500/30">
            <h3 className="text-lg font-bold text-white font-display mb-4">Create Enterprise Policy</h3>
            <form onSubmit={handleCreatePolicy} className="space-y-4 text-xs font-mono">
              <div>
                <label className="text-slate-400 block mb-1">Policy Name</label>
                <input 
                  type="text"
                  required
                  value={newPolicy.name}
                  onChange={(e) => setNewPolicy({ ...newPolicy, name: e.target.value })}
                  placeholder="e.g. Critical API Key Rotation"
                  className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-white text-xs font-sans focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Organisation</label>
                <input 
                  type="text"
                  required
                  value={newPolicy.organisation}
                  onChange={(e) => setNewPolicy({ ...newPolicy, organisation: e.target.value })}
                  placeholder="e.g. Acme FinTech"
                  className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-white text-xs font-sans focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Confidence Threshold: {newPolicy.confidenceThreshold}%</label>
                <input 
                  type="range"
                  min="60"
                  max="98"
                  value={newPolicy.confidenceThreshold}
                  onChange={(e) => setNewPolicy({ ...newPolicy, confidenceThreshold: Number(e.target.value) })}
                  className="w-full accent-cyan-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="btn-outline py-2 px-3.5 text-xs"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary py-2 px-4 text-xs"
                >
                  Save Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
