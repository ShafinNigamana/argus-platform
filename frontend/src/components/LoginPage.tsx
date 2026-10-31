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
      <div className="box-card p-6 sm:p-7 max-w-xl w-full shadow-[8px_8px_0_var(--ink)] bg-[var(--card)] border-2 border-[var(--line)]">
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
            className="px-2.5 py-1 text-xs font-mono font-bold tab-btn-inactive cursor-pointer"
            aria-label="Close dialog"
          >
            ✕ Close
          </button>
        </div>

        {/* Tab switch between Sign In and Create Account */}
        <div className="grid grid-cols-2 gap-3 mb-5 font-mono text-xs" role="tablist" aria-label="Access Mode">
          <button
            type="button"
            role="tab"
            aria-selected={!isRegisterMode}
            onClick={() => {
              setIsRegisterMode(false);
              setErrorMsg(null);
            }}
            className={`py-2.5 px-4 text-center font-bold tracking-wide transition-all cursor-pointer ${
              !isRegisterMode ? 'tab-btn-active' : 'tab-btn-inactive'
            }`}
            style={{
              backgroundColor: !isRegisterMode ? 'var(--ink)' : 'var(--card)',
              color: !isRegisterMode ? 'var(--bg)' : 'var(--ink)',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isRegisterMode}
            onClick={() => {
              setIsRegisterMode(true);
              setRegStep(1);
              setErrorMsg(null);
            }}
            className={`py-2.5 px-4 text-center font-bold tracking-wide transition-all cursor-pointer ${
              isRegisterMode ? 'tab-btn-active' : 'tab-btn-inactive'
            }`}
            style={{
              backgroundColor: isRegisterMode ? 'var(--ink)' : 'var(--card)',
              color: isRegisterMode ? 'var(--bg)' : 'var(--ink)',
            }}
          >
            Create Account
          </button>
        </div>

        {/* Context Banner */}
        <p className="text-xs text-[var(--mut)] mb-5 font-mono leading-relaxed">
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
          <div className="mb-5 p-3.5 bg-[var(--bg)] border-2 border-[var(--line)] text-xs font-mono">
            <span className="stat-label block mb-2 font-bold text-[var(--ink)]">Pre-configured evaluation identities:</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('admin', 'strongPassword123')}
                className="px-2.5 py-1.5 font-bold transition-all cursor-pointer font-mono text-[11px] tab-btn-inactive"
              >
                Admin (Full Access)
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('user', 'userPassword123')}
                className="px-2.5 py-1.5 font-bold transition-all cursor-pointer font-mono text-[11px] tab-btn-inactive"
              >
                User (Standard Operator)
              </button>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {errorMsg && (
          <div className="p-2 mb-3 bg-[var(--card)] border-2 border-[var(--bad)] text-xs font-mono text-[var(--bad)] font-semibold">
            ✕ {errorMsg}
          </div>
        )}

        {successNotice && (
          <div className="p-2 mb-3 bg-[var(--card)] border-2 border-[var(--ok)] text-xs font-mono text-[var(--ok)] font-semibold">
            ✓ {successNotice}
          </div>
        )}

        {/* --- SIGN IN FORM --- */}
        {!isRegisterMode && (
          <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
            <div>
              <label className="stat-label block mb-1.5 font-bold text-[var(--ink)]">Username or Work Email</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="operator_id or name@organization.org"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono border-2 border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] focus:outline-none focus:border-[var(--acc)] focus:ring-1 focus:ring-[var(--acc)]"
              />
            </div>

            <div>
              <div className="flex justify-between items-baseline mb-1.5">
                <label className="stat-label font-bold text-[var(--ink)]">Password</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] font-bold text-[var(--mut)] hover:text-[var(--ink)] flex items-center gap-1 cursor-pointer"
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
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono border-2 border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] focus:outline-none focus:border-[var(--acc)] focus:ring-1 focus:ring-[var(--acc)]"
              />
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="submit"
                className="btn w-full py-2.5 shadow-[4px_4px_0_var(--acc)] text-xs font-mono font-bold tracking-wider uppercase"
                disabled={isLoading}
              >
                {isLoading ? 'Authenticating...' : 'Sign In to Argus'}
              </button>

              <div className="pt-2 text-center text-xs font-mono text-[var(--ink)] border-t border-[var(--soft)] mt-1">
                Don't have an operator account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisterMode(true);
                    setRegStep(1);
                    setErrorMsg(null);
                  }}
                  className="font-bold text-[var(--acc)] hover:underline ml-1 cursor-pointer"
                >
                  Create Account →
                </button>
              </div>
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
              <form onSubmit={handleNextStep} className="space-y-4 font-mono text-xs">
                <div>
                  <label className="stat-label block mb-1.5 font-bold text-[var(--ink)]">Full Name (optional)</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Jane Doe"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono border-2 border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] focus:outline-none focus:border-[var(--acc)] focus:ring-1 focus:ring-[var(--acc)]"
                  />
                </div>

                <div>
                  <label className="stat-label block mb-1.5 font-bold text-[var(--ink)]">Username (required, unique)</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. jdoe_operator"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono border-2 border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] focus:outline-none focus:border-[var(--acc)] focus:ring-1 focus:ring-[var(--acc)]"
                  />
                </div>

                <div>
                  <label className="stat-label block mb-1.5 font-bold text-[var(--ink)]">Work Email (required, unique)</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jdoe@organization.org"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono border-2 border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] focus:outline-none focus:border-[var(--acc)] focus:ring-1 focus:ring-[var(--acc)]"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-baseline mb-1.5">
                    <label className="stat-label font-bold text-[var(--ink)]">Password (min. 8 characters)</label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[11px] font-bold text-[var(--mut)] hover:text-[var(--ink)] flex items-center gap-1 cursor-pointer"
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
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono border-2 border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] focus:outline-none focus:border-[var(--acc)] focus:ring-1 focus:ring-[var(--acc)]"
                  />
                </div>

                <div>
                  <label className="stat-label block mb-1.5 font-bold text-[var(--ink)]">Confirm Password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono border-2 border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] focus:outline-none focus:border-[var(--acc)] focus:ring-1 focus:ring-[var(--acc)]"
                  />
                </div>

                <div className="pt-2 flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="terms-checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5"
                  />
                  <label htmlFor="terms-checkbox" className="text-xs text-[var(--ink)] leading-relaxed cursor-pointer select-none">
                    I acknowledge that Argus evaluates point-in-time human physical presence and does not provide legal identity verification or KYC.
                  </label>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button type="submit" className="btn flex items-center gap-1 shadow-[3px_3px_0_var(--acc)]">
                    Continue to Organization Details <ArrowRight size={12} />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: Organization Details */}
            {regStep === 2 && (
              <form onSubmit={handleNextStep} className="space-y-4 font-mono text-xs">
                <div>
                  <label className="stat-label block mb-1.5 font-bold text-[var(--ink)]">Organization / Institution Name</label>
                  <input
                    type="text"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder="e.g. Apex Financial Systems"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono border-2 border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] focus:outline-none focus:border-[var(--acc)] focus:ring-1 focus:ring-[var(--acc)]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="stat-label block mb-1.5 font-bold text-[var(--ink)]">Organization Type</label>
                    <select
                      value={organizationType}
                      onChange={(e) => setOrganizationType(e.target.value as OrganizationType)}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono border-2 border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] focus:outline-none focus:border-[var(--acc)] focus:ring-1 focus:ring-[var(--acc)]"
                    >
                      <option value="COMPANY">Company / Enterprise</option>
                      <option value="EDUCATIONAL">Educational Institution</option>
                      <option value="GOVERNMENT">Government Agency</option>
                      <option value="NONPROFIT">Nonprofit / Research</option>
                      <option value="INDIVIDUAL">Individual / Independent</option>
                    </select>
                  </div>

                  <div>
                    <label className="stat-label block mb-1.5 font-bold text-[var(--ink)]">Team Size</label>
                    <select
                      value={teamSize}
                      onChange={(e) => setTeamSize(e.target.value)}
                      disabled={organizationType === 'INDIVIDUAL'}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono border-2 border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] focus:outline-none focus:border-[var(--acc)] focus:ring-1 focus:ring-[var(--acc)] disabled:opacity-50"
                    >
                      <option value="1-10">1 – 10</option>
                      <option value="11-50">11 – 50</option>
                      <option value="51-250">51 – 250</option>
                      <option value="250+">250+</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="stat-label block mb-1.5 font-bold text-[var(--ink)]">Job Title (optional)</label>
                    <input
                      type="text"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="e.g. Security Lead"
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono border-2 border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] focus:outline-none focus:border-[var(--acc)] focus:ring-1 focus:ring-[var(--acc)]"
                    />
                  </div>

                  <div>
                    <label className="stat-label block mb-1.5 font-bold text-[var(--ink)]">Industry (optional)</label>
                    <input
                      type="text"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      placeholder="e.g. FinTech, EdTech"
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono border-2 border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] focus:outline-none focus:border-[var(--acc)] focus:ring-1 focus:ring-[var(--acc)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="stat-label block mb-1.5 font-bold text-[var(--ink)]">Website (optional)</label>
                  <input
                    type="url"
                    value={organizationWebsite}
                    onChange={(e) => setOrganizationWebsite(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono border-2 border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] focus:outline-none focus:border-[var(--acc)] focus:ring-1 focus:ring-[var(--acc)]"
                  />
                </div>

                <div className="p-3.5 bg-[var(--bg)] border-2 border-[var(--line)] text-xs text-[var(--ink)] leading-relaxed font-mono">
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
                  <button type="submit" className="btn flex items-center gap-1 shadow-[3px_3px_0_var(--acc)]">
                    Review Registration <ArrowRight size={12} />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Review and Submit */}
            {regStep === 3 && (
              <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
                <div className="p-3 bg-[var(--bg)] border-2 border-[var(--line)] space-y-2">
                  <div className="stat-label pb-1 border-b border-[var(--soft)] font-bold text-[var(--ink)]">Registration Summary</div>
                  <div className="flex justify-between">
                    <span className="text-[var(--mut)]">Username:</span>
                    <span className="font-semibold text-[var(--ink)]">{username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--mut)]">Work Email:</span>
                    <span className="text-[var(--ink)]">{email}</span>
                  </div>
                  {fullName && (
                    <div className="flex justify-between">
                      <span className="text-[var(--mut)]">Full Name:</span>
                      <span className="text-[var(--ink)]">{fullName}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[var(--mut)]">Organization:</span>
                    <span className="text-[var(--ink)]">{organizationName || 'Individual / Independent'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--mut)]">Organization Type:</span>
                    <span className="text-[var(--ink)]">{organizationType}</span>
                  </div>
                  {jobTitle && (
                    <div className="flex justify-between">
                      <span className="text-[var(--mut)]">Role / Title:</span>
                      <span className="text-[var(--ink)]">{jobTitle}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 border-t border-[var(--soft)] text-[var(--acc)]">
                    <span className="font-bold">Assigned Access Role:</span>
                    <span className="font-bold">USER (Standard Operator)</span>
                  </div>
                </div>

                <div className="text-xs text-[var(--mut)] leading-relaxed">
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
                    className="btn flex items-center gap-1 shadow-[3px_3px_0_var(--acc)]"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Creating Account...' : 'Complete & Sign In'}
                  </button>
                </div>
              </form>
            )}

            {/* Back to Sign In Link */}
            <div className="pt-3 text-center text-xs font-mono text-[var(--ink)] border-t border-[var(--soft)] mt-4">
              Already have an operator account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(false);
                  setErrorMsg(null);
                }}
                className="font-bold text-[var(--acc)] hover:underline ml-1 cursor-pointer"
              >
                Sign In here →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
