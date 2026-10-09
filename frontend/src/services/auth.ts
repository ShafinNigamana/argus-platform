// Argus Platform — Authentication Service
// Manages real JWT authentication, token persistence, role extraction, and session state.

import type { AuthState, UserRole, RegisterPayload } from '../types';

const ACCESS_TOKEN_KEY = 'argus_access_token';
const REFRESH_TOKEN_KEY = 'argus_refresh_token';
const USERNAME_KEY = 'argus_username';
const ROLE_KEY = 'argus_role';

const API_BASE = '/api/v1';

class AuthService {
  private listeners: Array<(state: AuthState) => void> = [];

  constructor() {
    // Initial check from localStorage
  }

  public getAuthState(): AuthState {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    const username = localStorage.getItem(USERNAME_KEY) || '';
    const storedRole = localStorage.getItem(ROLE_KEY) as UserRole | null;

    const role: UserRole = storedRole && ['USER', 'ADMIN', 'SUPERADMIN', 'AUDIT'].includes(storedRole)
      ? storedRole
      : 'USER';

    return {
      isAuthenticated: Boolean(accessToken),
      username,
      role,
      accessToken,
      refreshToken,
    };
  }

  public subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners() {
    const state = this.getAuthState();
    for (const listener of this.listeners) {
      listener(state);
    }
  }

  public async login(username: string, password: string): Promise<AuthState> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 400) {
        throw new Error('Invalid username or password');
      }
      throw new Error(`Authentication failed with status HTTP ${res.status}`);
    }

    const data = await res.json();
    const accessToken = data.accessToken || '';
    const refreshToken = data.refreshToken || '';
    const rawRole = (data.role || 'USER').replace('ROLE_', '') as UserRole;
    const cleanRole: UserRole = ['USER', 'ADMIN', 'SUPERADMIN', 'AUDIT'].includes(rawRole)
      ? rawRole
      : 'USER';

    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
    localStorage.setItem(USERNAME_KEY, data.username || username);
    localStorage.setItem(ROLE_KEY, cleanRole);

    this.notifyListeners();
    return this.getAuthState();
  }

  public async register(
    param1: RegisterPayload | string,
    email?: string,
    password?: string
  ): Promise<void> {
    const payload = typeof param1 === 'object'
      ? param1
      : { username: param1, email: email || '', password: password || '' };

    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Registration failed: HTTP ${res.status}`);
    }
  }

  public logout(): void {
    const currentUsername = localStorage.getItem(USERNAME_KEY);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USERNAME_KEY);
    localStorage.removeItem(ROLE_KEY);

    // Security fix: Flush all cached verification records on logout to prevent cross-account history leakage
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('argus_verification_records_') || key === 'argus_verification_records')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      // Fallback if iteration fails
      localStorage.removeItem('argus_verification_records');
      if (currentUsername) {
        localStorage.removeItem(`argus_verification_records_${currentUsername}`);
      }
    }

    this.notifyListeners();
  }

  public async refresh(): Promise<string | null> {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      this.logout();
      return null;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.accessToken) {
          localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
          if (data.refreshToken) {
            localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
          }
          this.notifyListeners();
          return data.accessToken;
        }
      }
    } catch {
      // Refresh failed
    }

    this.logout();
    return null;
  }
}

export const authService = new AuthService();
