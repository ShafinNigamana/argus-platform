import React, { useState } from 'react';
import { authService } from '../services/auth';

interface LoginPageProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onClose, onSuccess }) => {
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('admin');
  const [password, setPassword] = useState<string>('strongPassword123');
  const [email, setEmail] = useState<string>('admin@argus-platform.app');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessNotice(null);
    setIsLoading(true);

    try {
      if (isRegisterMode) {
        await authService.register(username, email, password);
        setSuccessNotice('Account created! Authenticating...');
        await authService.login(username, password);
      } else {
        await authService.login(username, password);
      }

      setIsLoading(false);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setIsLoading(false);
      setErrorMsg(err instanceof Error ? err.message : 'Authentication failed');
    }
  };

  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="box-card pad max-w-md w-full shadow-[8px_8px_0_var(--ink)]">
        <div className="flex justify-between items-baseline mb-4">
          <div className="logo-header p-0 border-0">
            Argus
            <small>SECURITY AUTH</small>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-mono text-[var(--mut)] hover:text-[var(--ink)]"
          >
            [Close ✕]
          </button>
        </div>

        <p className="text-xs text-[var(--mut)] mb-4">
          {isRegisterMode
            ? 'Register a new operator identity for audit and access.'
            : 'Sign in to access role-gated administration and audit trails.'}
        </p>

        {/* Quick fill presets */}
        {!isRegisterMode && (
          <div className="mb-4 p-2.5 bg-[var(--bg)] border border-[var(--soft)] text-xs font-mono">
            <span className="stat-label block mb-1">Pre-configured accounts:</span>
            <div className="flex gap-2">
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
                User (Standard)
              </button>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="p-2 mb-3 bg-[var(--card)] border-2 border-[var(--bad)] text-xs font-mono text-[var(--bad)]">
            {errorMsg}
          </div>
        )}

        {successNotice && (
          <div className="p-2 mb-3 bg-[var(--card)] border-2 border-[var(--ok)] text-xs font-mono text-[var(--ok)]">
            {successNotice}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 font-mono text-xs">
          <div>
            <label className="stat-label block mb-1">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border-2 border-[var(--line)] bg-[var(--card)] text-[var(--ink)] focus:outline-none"
            />
          </div>

          {isRegisterMode && (
            <div>
              <label className="stat-label block mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border-2 border-[var(--line)] bg-[var(--card)] text-[var(--ink)] focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="stat-label block mb-1">Password</label>
            <input
              type="password"
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
              {isLoading
                ? 'Authenticating...'
                : isRegisterMode
                ? 'Create Account & Sign In'
                : 'Sign In to Argus'}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setErrorMsg(null);
              }}
              className="text-[11px] text-[var(--mut)] hover:text-[var(--acc)] text-center py-1 underline"
            >
              {isRegisterMode
                ? 'Already have an account? Sign in'
                : "Don't have an account? Register new user"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
