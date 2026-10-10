import React, { useState, useEffect, useCallback } from 'react';
import { Building2, Shield, CheckCircle, Save, LogOut } from 'lucide-react';
import { apiService } from '../services/api';
import { authService } from '../services/auth';
import type { UserProfile, OrganizationType } from '../types';

export const AccountProfileView: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Editable fields
  const [fullName, setFullName] = useState<string>('');
  const [organizationName, setOrganizationName] = useState<string>('');
  const [organizationType, setOrganizationType] = useState<OrganizationType>('COMPANY');
  const [organizationWebsite, setOrganizationWebsite] = useState<string>('');
  const [industry, setIndustry] = useState<string>('');
  const [teamSize, setTeamSize] = useState<string>('1-10');
  const [jobTitle, setJobTitle] = useState<string>('');

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await apiService.getAccountProfile();
      setProfile(data);
      setFullName(data.fullName || '');
      setOrganizationName(data.organizationName || '');
      setOrganizationType((data.organizationType as OrganizationType) || 'COMPANY');
      setOrganizationWebsite(data.organizationWebsite || '');
      setIndustry(data.industry || '');
      setTeamSize(data.teamSize || '1-10');
      setJobTitle(data.jobTitle || '');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not fetch profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const updated = await apiService.updateAccountProfile({
        fullName: fullName.trim() || undefined,
        organizationName: organizationName.trim() || undefined,
        organizationType,
        organizationWebsite: organizationWebsite.trim() || undefined,
        industry: industry.trim() || undefined,
        teamSize: organizationType !== 'INDIVIDUAL' ? teamSize : undefined,
        jobTitle: jobTitle.trim() || undefined,
      });

      setProfile(updated);
      setSuccessMsg('Account profile and organization metadata updated successfully.');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="pad max-w-4xl mx-auto font-mono text-xs text-[var(--mut)]">
        Loading authenticated account profile...
      </div>
    );
  }

  return (
    <div className="pad max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b-2 border-[var(--line)] pb-4 flex flex-wrap justify-between items-baseline gap-4">
        <div>
          <div className="stat-label">OPERATOR PROFILE & ORGANIZATION</div>
          <h1 style={{ font: '400 clamp(24px, 3.5vw, 36px) var(--ser)' }}>
            Account Settings
          </h1>
        </div>
        <button
          type="button"
          onClick={() => authService.logout()}
          className="btn ghost text-xs flex items-center gap-1.5"
        >
          <LogOut size={13} /> Sign Out
        </button>
      </div>

      {/* Role and Identity Card */}
      <div className="box-card pad grid grid-cols-1 md:grid-cols-3 gap-4 border-2 border-[var(--line)] bg-[var(--card)]">
        <div className="border-b md:border-b-0 md:border-r border-[var(--soft)] pr-4 pb-4 md:pb-0">
          <div className="stat-label mb-1">Authenticated Identity</div>
          <div className="font-mono text-base font-bold text-[var(--ink)]">{profile?.username}</div>
          <div className="font-mono text-xs text-[var(--mut)] mt-1">{profile?.email}</div>
          <div className="font-mono text-[10px] text-[var(--mut)] mt-3">
            ID: <span className="text-[var(--ink)]">{profile?.id}</span>
          </div>
        </div>

        <div className="border-b md:border-b-0 md:border-r border-[var(--soft)] pr-4 pb-4 md:pb-0">
          <div className="stat-label mb-1">Assigned Security Role</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-mono text-sm font-bold px-2 py-0.5 bg-[var(--ink)] text-[var(--bg)]">
              {profile?.role}
            </span>
            <Shield size={16} className="text-[var(--acc)]" />
          </div>
          <p className="font-mono text-[11px] text-[var(--mut)] mt-2 leading-relaxed">
            {profile?.role === 'SUPERADMIN'
              ? 'Unrestricted administrative control and policy enforcement.'
              : profile?.role === 'ADMIN'
              ? 'Authorized for policy management and broad verification ledger queries.'
              : profile?.role === 'AUDIT'
              ? 'Strictly read-only compliance access to audit logs and verification records.'
              : 'Standard verification operator rights. Owner-scoped resource access.'}
          </p>
        </div>

        <div>
          <div className="stat-label mb-1">Account Status</div>
          <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-[var(--ok)] mt-1">
            <CheckCircle size={14} /> Active & Verified
          </div>
          <div className="font-mono text-[10px] text-[var(--mut)] mt-3">
            Registered: {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
          </div>
        </div>
      </div>

      {/* Status Notifications */}
      {errorMsg && (
        <div className="p-3 bg-[var(--card)] border-2 border-[var(--bad)] text-xs font-mono text-[var(--bad)]">
          ✕ {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-[var(--card)] border-2 border-[var(--ok)] text-xs font-mono text-[var(--ok)]">
          ✓ {successMsg}
        </div>
      )}

      {/* Profile & Organization Metadata Form */}
      <div className="box-card pad border-2 border-[var(--line)] bg-[var(--card)]">
        <div className="stat-label mb-2 border-b border-[var(--soft)] pb-2 flex items-center gap-2">
          <Building2 size={14} /> EDITABLE OPERATOR & ORGANIZATION METADATA
        </div>

        <form onSubmit={handleSave} className="space-y-4 font-mono text-xs pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="stat-label block mb-1">Full Operator Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Jane Doe"
                className="w-full px-3 py-2 border-2 border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] focus:outline-none"
              />
            </div>

            <div>
              <label className="stat-label block mb-1">Job Title / Functional Role</label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Lead Identity Architect"
                className="w-full px-3 py-2 border-2 border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="stat-label block mb-1">Organization / Institution Name</label>
              <input
                type="text"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="e.g. Apex Security Consortium"
                className="w-full px-3 py-2 border-2 border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] focus:outline-none"
              />
            </div>

            <div>
              <label className="stat-label block mb-1">Organization Type</label>
              <select
                value={organizationType}
                onChange={(e) => setOrganizationType(e.target.value as OrganizationType)}
                className="w-full px-3 py-2 border-2 border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] focus:outline-none"
              >
                <option value="COMPANY">Company / Enterprise</option>
                <option value="EDUCATIONAL">Educational Institution</option>
                <option value="GOVERNMENT">Government Agency</option>
                <option value="NONPROFIT">Nonprofit / Research</option>
                <option value="INDIVIDUAL">Individual / Independent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="stat-label block mb-1">Website</label>
              <input
                type="url"
                value={organizationWebsite}
                onChange={(e) => setOrganizationWebsite(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-3 py-2 border-2 border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] focus:outline-none"
              />
            </div>

            <div>
              <label className="stat-label block mb-1">Industry / Sector</label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g. FinTech, Healthcare"
                className="w-full px-3 py-2 border-2 border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] focus:outline-none"
              />
            </div>

            <div>
              <label className="stat-label block mb-1">Team Size</label>
              <select
                value={teamSize}
                onChange={(e) => setTeamSize(e.target.value)}
                disabled={organizationType === 'INDIVIDUAL'}
                className="w-full px-3 py-2 border-2 border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] focus:outline-none disabled:opacity-50"
              >
                <option value="1-10">1 – 10</option>
                <option value="11-50">11 – 50</option>
                <option value="51-250">51 – 250</option>
                <option value="250+">250+</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-[var(--bg)] border border-[var(--soft)] text-[11px] text-[var(--mut)] leading-relaxed">
            <strong>Architecture Notice:</strong> Organization metadata is recorded as account-level profile context and displayed on attestation certificates. Argus does not provide multi-tenant database isolation, organization switching, or team administration.
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="btn flex items-center gap-1.5"
              disabled={saving}
            >
              <Save size={13} /> {saving ? 'Saving Changes...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
