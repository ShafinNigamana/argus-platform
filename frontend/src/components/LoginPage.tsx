import React, { useState } from 'react';
import { Eye, EyeOff, ArrowRight, ArrowLeft } from 'lucide-react';
import { authService } from '../services/auth';
import type { OrganizationType, RegisterPayload } from '../types';

interface LoginPageProps {
  onClose: () => void;
  onSuccess: (redirectTarget?: string) => void;
  initialMode?: 'login' | 'register';
  redirectTarget?: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onClose,
  onSuccess,
  initialMode = 'login',
  redirectTarget,
}) => {
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(initialMode === 'register');
  const [regStep, setRegStep] = useState<1 | 2 | 3>(1);

  // Form Fields
  const [username, setUsername] = useState<string>('admin');
  const [password, setPassword] = useState<string>('strongPassword123');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [email, setEmail] = useState<string>('admin@argus-platform.app');
  const [fullName, setFullName] = useState<string>('');
  const [organizationName, setOrganizationName] = useState<string>('');
  const [organizationType, setOrganizationType] = useState<OrganizationType>('COMPANY');
  const [organizationWebsite, setOrganizationWebsite] = useState<string>('');
  const [industry, setIndustry] = useState<string>('');
  const [teamSize, setTeamSize] = useState<string>('1-10');
  const [jobTitle, setJobTitle] = useState<string>('');
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);

  // UI States
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setErrorMsg(null);
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (regStep === 1) {
      if (!username || username.trim().length < 3) {
        setErrorMsg('Username must be at least 3 characters.');
        return;
      }
      if (!email || !email.includes('@')) {
        setErrorMsg('A valid email address is required.');
        return;
      }
      if (!password || password.length < 8) {
        setErrorMsg('Password must be at least 8 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match.');
        return;
      }
      if (!termsAccepted) {
        setErrorMsg('Please acknowledge the terms of evaluation and privacy policy.');
        return;
      }
      setRegStep(2);
    } else if (regStep === 2) {
      if (organizationType !== 'INDIVIDUAL' && (!organizationName || organizationName.trim().length < 2)) {
        setErrorMsg('Please enter an organization or institution name.');
        return;
      }
      setRegStep(3);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessNotice(null);
    setIsLoading(true);

    try {
      if (isRegisterMode) {
        const payload: RegisterPayload = {
          username: username.trim(),
          email: email.trim(),
          password,
          fullName: fullName.trim() || undefined,
          organizationName: organizationName.trim() || undefined,
          organizationType,
          organizationWebsite: organizationWebsite.trim() || undefined,
          industry: industry.trim() || undefined,
          teamSize: organizationType !== 'INDIVIDUAL' ? teamSize : undefined,
          jobTitle: jobTitle.trim() || undefined,
        };

        await authService.register(payload);
        setSuccessNotice('Account created with default role USER. Authenticating...');
        await authService.login(username.trim(), password);
      } else {
        await authService.login(username.trim(), password);
      }

      setIsLoading(false);
      onSuccess(redirectTarget);
      onClose();
    } catch (err: unknown) {
      setIsLoading(false);
      setErrorMsg(err instanceof Error ? err.message : 'Authentication failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-[2px]">
      <div className="box-card pad max-w-lg w-full shadow-[8px_8px_0_var(--ink)] bg-[var(--card)] border-2 border-[var(--line)]">
        {/* Top Header */}
        <div className="flex justify-between items-baseline mb-4 border-b-2 border-[var(--line)] pb-3">
          <div className="logo-header p-0 border-0 flex items-baseline gap-2">
            <span style={{ font: '400 28px var(--ser)' }}>Argus</span>
            <small style={{ font: '500 10px var(--mono)', color: 'var(--mut)', letterSpacing: '.08em' }}>
              {isRegisterMode ? `ONBOARDING [STEP ${regStep}/3]` : 'OPERATOR ACCESS'}
            </small>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-mono text-[var(--mut)] hover:text-[var(--ink)] cursor-pointer"
            aria-label="Close dialog"
          >
            [Close ✕]
          </button>
        </div>

        {/* Tab switch between Sign In and Register */}
        <div className="flex border-b-2 border-[var(--line)] mb-4 font-mono text-xs">
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(false);
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 text-center transition-colors ${
              !isRegisterMode
                ? 'bg-[var(--ink)] text-[var(--bg)] font-semibold'
                : 'bg-[var(--card)] text-[var(--mut)] hover:text-[var(--ink)]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(true);
              setRegStep(1);
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 text-center transition-colors ${
              isRegisterMode
                ? 'bg-[var(--ink)] text-[var(--bg)] font-semibold'
                : 'bg-[var(--card)] text-[var(--mut)] hover:text-[var(--ink)]'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Context Banner */}
        <p className="text-xs text-[var(--mut)] mb-4 font-mono leading-relaxed">
          {isRegisterMode
            ? regStep === 1
              ? 'Step 1: Set up credentials and personal operator identity.'
              : regStep === 2
              ? 'Step 2: Provide organization metadata for attestation attribution.'
              : 'Step 3: Review details and confirm operator account registration.'
            : 'Authenticate to access the verification studio, audit trail, and cryptographic records.'}
        </p>

        {/* Quick Fill for evaluation (Sign In mode only) */}
        {!isRegisterMode && (
          <div className="mb-4 p-2.5 bg-[var(--bg)] border border-[var(--soft)] text-xs font-mono">
            <span className="stat-label block mb-1">Pre-configured evaluation identities:</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('admin', 'strongPassword123')}
                className="px-2 py-1 border border-[var(--line)] bg-[var(--card)] hover:bg-[var(--soft)] font-mono text-[11px]"
              >
                Admin (Full Access)
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('user', 'userPassword123')}
                className="px-2 py-1 border border-[var(--line)] bg-[var(--card)] hover:bg-[var(--soft)] font-mono text-[11px]"
              >
                User (Standard Operator)
              </button>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {errorMsg && (
          <div className="p-2 mb-3 bg-[var(--card)] border-2 border-[var(--bad)] text-xs font-mono text-[var(--bad)]">
            ✕ {errorMsg}
          </div>
        )}

        {successNotice && (
          <div className="p-2 mb-3 bg-[var(--card)] border-2 border-[var(--ok)] text-xs font-mono text-[var(--ok)]">
            ✓ {successNotice}
          </div>
        )}

        {/* --- SIGN IN FORM --- */}
        {!isRegisterMode && (
          <form onSubmit={handleSubmit} className="space-y-3 font-mono text-xs">
            <div>
              <label className="stat-label block mb-1">Username or Work Email</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="operator_id or name@organization.org"
                className="w-full px-3 py-2 border-2 border-[var(--line)] bg-[var(--card)] text-[var(--ink)] focus:outline-none"
              />
            </div>

            <div>
              <div className="flex justify-between items-baseline mb-1">
                <label className="stat-label">Password</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[10px] text-[var(--mut)] hover:text-[var(--ink)] flex items-center gap-1"
                >
                  {showPassword ? <EyeOff size={11} /> : <Eye size={11} />}
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border-2 border-[var(--line)] bg-[var(--card)] text-[var(--ink)] focus:outline-none"
              />
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="submit"
                className="btn w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Authenticating...' : 'Sign In to Argus'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(true);
                  setRegStep(1);
                  setErrorMsg(null);
                }}
                className="text-[11px] text-[var(--mut)] hover:text-[var(--acc)] text-center py-1 underline"
              >
                Don't have an account? Register new user
              </button>
            </div>
          </form>
        )}

        {/* --- MULTI-STEP REGISTRATION FORM --- */}
        {isRegisterMode && (
          <div>
            {/* Step Indicators */}
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[var(--soft)] font-mono text-[10px]">
              <span className={`flex items-center gap-1 ${regStep === 1 ? 'font-bold text-[var(--acc)]' : 'text-[var(--mut)]'}`}>
                1. Credentials
              </span>
              <span className="text-[var(--soft)]">→</span>
              <span className={`flex items-center gap-1 ${regStep === 2 ? 'font-bold text-[var(--acc)]' : 'text-[var(--mut)]'}`}>
                2. Organization
              </span>
              <span className="text-[var(--soft)]">→</span>
              <span className={`flex items-center gap-1 ${regStep === 3 ? 'font-bold text-[var(--acc)]' : 'text-[var(--mut)]'}`}>
                3. Review
              </span>
            </div>

            {/* STEP 1: Account Credentials */}
            {regStep === 1 && (
              <form onSubmit={handleNextStep} className="space-y-3 font-mono text-xs">
                <div>
                  <label className="stat-label block mb-1">Full Name (optional)</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Jane Doe"
                    className="w-full px-3 py-2 border-2 border-[var(--line)] bg-[var(--card)] text-[var(--ink)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="stat-label block mb-1">Username (required, unique)</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. jdoe_operator"
                    className="w-full px-3 py-2 border-2 border-[var(--line)] bg-[var(--card)] text-[var(--ink)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="stat-label block mb-1">Work Email (required, unique)</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jdoe@organization.org"
                    className="w-full px-3 py-2 border-2 border-[var(--line)] bg-[var(--card)] text-[var(--ink)] focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-baseline mb-1">
                    <label className="stat-label">Password (min. 8 characters)</label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[10px] text-[var(--mut)] hover:text-[var(--ink)] flex items-center gap-1"
                    >
                      {showPassword ? <EyeOff size={11} /> : <Eye size={11} />}
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-[var(--line)] bg-[var(--card)] text-[var(--ink)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="stat-label block mb-1">Confirm Password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-[var(--line)] bg-[var(--card)] text-[var(--ink)] focus:outline-none"
                  />
                </div>

                <div className="pt-1 flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="terms-checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5"
                  />
                  <label htmlFor="terms-checkbox" className="text-[11px] text-[var(--mut)] leading-tight cursor-pointer">
                    I acknowledge that Argus evaluates point-in-time human physical presence and does not provide legal identity verification or KYC.
                  </label>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button type="submit" className="btn flex items-center gap-1">
                    Continue to Organization Details <ArrowRight size={12} />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: Organization Details */}
            {regStep === 2 && (
              <form onSubmit={handleNextStep} className="space-y-3 font-mono text-xs">
                <div>
                  <label className="stat-label block mb-1">Organization / Institution Name</label>
                  <input
                    type="text"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder="e.g. Apex Financial Systems"
                    className="w-full px-3 py-2 border-2 border-[var(--line)] bg-[var(--card)] text-[var(--ink)] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="stat-label block mb-1">Organization Type</label>
                    <select
                      value={organizationType}
                      onChange={(e) => setOrganizationType(e.target.value as OrganizationType)}
                      className="w-full px-3 py-2 border-2 border-[var(--line)] bg-[var(--card)] text-[var(--ink)] focus:outline-none"
                    >
                      <option value="COMPANY">Company / Enterprise</option>
                      <option value="EDUCATIONAL">Educational Institution</option>
                      <option value="GOVERNMENT">Government Agency</option>
                      <option value="NONPROFIT">Nonprofit / Research</option>
                      <option value="INDIVIDUAL">Individual / Independent</option>
                    </select>
                  </div>

                  <div>
                    <label className="stat-label block mb-1">Team Size</label>
                    <select
                      value={teamSize}
                      onChange={(e) => setTeamSize(e.target.value)}
                      disabled={organizationType === 'INDIVIDUAL'}
                      className="w-full px-3 py-2 border-2 border-[var(--line)] bg-[var(--card)] text-[var(--ink)] focus:outline-none disabled:opacity-50"
                    >
                      <option value="1-10">1 – 10</option>
                      <option value="11-50">11 – 50</option>
                      <option value="51-250">51 – 250</option>
                      <option value="250+">250+</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="stat-label block mb-1">Job Title (optional)</label>
                    <input
                      type="text"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="e.g. Security Lead"
                      className="w-full px-3 py-2 border-2 border-[var(--line)] bg-[var(--card)] text-[var(--ink)] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="stat-label block mb-1">Industry (optional)</label>
                    <input
                      type="text"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      placeholder="e.g. FinTech, EdTech"
                      className="w-full px-3 py-2 border-2 border-[var(--line)] bg-[var(--card)] text-[var(--ink)] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="stat-label block mb-1">Website (optional)</label>
                  <input
                    type="url"
                    value={organizationWebsite}
                    onChange={(e) => setOrganizationWebsite(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-3 py-2 border-2 border-[var(--line)] bg-[var(--card)] text-[var(--ink)] focus:outline-none"
                  />
                </div>

                <div className="p-2 bg-[var(--bg)] border border-[var(--soft)] text-[11px] text-[var(--mut)] leading-relaxed">
                  <strong>Notice:</strong> Organization metadata is recorded with your operator profile for attestation clarity. Argus provides account-level organization scoping, not enterprise tenant isolation.
                </div>

                <div className="pt-2 flex justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setRegStep(1)}
                    className="btn ghost flex items-center gap-1"
                  >
                    <ArrowLeft size={12} /> Back
                  </button>
                  <button type="submit" className="btn flex items-center gap-1">
                    Review Registration <ArrowRight size={12} />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Review and Submit */}
            {regStep === 3 && (
              <form onSubmit={handleSubmit} className="space-y-3 font-mono text-xs">
                <div className="p-3 bg-[var(--bg)] border-2 border-[var(--line)] space-y-2">
                  <div className="stat-label pb-1 border-b border-[var(--soft)]">Registration Summary</div>
                  <div className="flex justify-between">
                    <span className="text-[var(--mut)]">Username:</span>
                    <span className="font-semibold">{username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--mut)]">Work Email:</span>
                    <span>{email}</span>
                  </div>
                  {fullName && (
                    <div className="flex justify-between">
                      <span className="text-[var(--mut)]">Full Name:</span>
                      <span>{fullName}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[var(--mut)]">Organization:</span>
                    <span>{organizationName || 'Individual / Independent'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--mut)]">Organization Type:</span>
                    <span>{organizationType}</span>
                  </div>
                  {jobTitle && (
                    <div className="flex justify-between">
                      <span className="text-[var(--mut)]">Role / Title:</span>
                      <span>{jobTitle}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 border-t border-[var(--soft)] text-[var(--acc)]">
                    <span>Assigned Access Role:</span>
                    <span className="font-bold">USER (Standard Operator)</span>
                  </div>
                </div>

                <div className="text-[11px] text-[var(--mut)] leading-relaxed">
                  By completing registration, your operator identity is issued standard verification rights. Privileged administrative or audit roles are managed by backend policy.
                </div>

                <div className="pt-2 flex justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setRegStep(2)}
                    className="btn ghost flex items-center gap-1"
                  >
                    <ArrowLeft size={12} /> Edit Details
                  </button>
                  <button
                    type="submit"
                    className="btn flex items-center gap-1"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Creating Account...' : 'Complete & Sign In'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
