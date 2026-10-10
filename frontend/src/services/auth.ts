// Argus Platform — Authentication Service
// 100% In-Memory State & Hardened HttpOnly Session Architecture.
// Zero persistent browser storage (localStorage, sessionStorage, IndexedDB, or Cache API).

import type { AuthState, UserRole, RegisterPayload } from '../types';

const API_BASE = '/api/v1';

class AuthService {
  private listeners: Array<(state: AuthState) => void> = [];

  // Strictly in-memory transient authentication state
  private authState: AuthState = {
    isAuthenticated: false,
    username: '',
    role: 'USER',
    accessToken: null,
    refreshToken: null,
  };

  private initPromise: Promise<AuthState> | null = null;

  constructor() {
    // Initial in-memory session check against backend
    if (typeof window !== 'undefined') {
      this.initSession();
    }
  }

  public getAuthState(): AuthState {
    return { ...this.authState };
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

  /**
   * Helper to retrieve anti-CSRF token from the browser cookie if set by backend
   */
  public getCsrfToken(): string | null {
    if (typeof document === 'undefined') {
      return null;
    }
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  /**
   * Validates active session on page reload using server-side HttpOnly cookie session.
   * Completely avoids persisting credentials or tokens to browser storage.
   */
  public async initSession(): Promise<AuthState> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          method: 'GET',
          credentials: 'same-origin',
          headers: { 'Accept': 'application/json' },
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.authenticated) {
            const rawRole = (data.role || 'USER').replace('ROLE_', '') as UserRole;
            const cleanRole: UserRole = ['USER', 'ADMIN', 'SUPERADMIN', 'AUDIT'].includes(rawRole)
              ? rawRole
              : 'USER';

            this.authState = {
              isAuthenticated: true,
              username: data.username || '',
              role: cleanRole,
              accessToken: null,
              refreshToken: null,
            };
            this.notifyListeners();
            return this.getAuthState();
          }
        }
      } catch {
        // Backend offline or unreachable
      }

      this.authState = {
        isAuthenticated: false,
        username: '',
        role: 'USER',
        accessToken: null,
        refreshToken: null,
      };
      this.notifyListeners();
      return this.getAuthState();
    })();

    return this.initPromise;
  }

  public async login(username: string, password: string): Promise<AuthState> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 400) {
        throw new Error('Invalid username or password');
      }
      if (res.status === 429) {
        throw new Error('Too many failed login attempts. Account temporarily protected.');
      }
      throw new Error(`Authentication failed with status HTTP ${res.status}`);
    }

    const data = await res.json();
    const rawRole = (data.role || 'USER').replace('ROLE_', '') as UserRole;
    const cleanRole: UserRole = ['USER', 'ADMIN', 'SUPERADMIN', 'AUDIT'].includes(rawRole)
      ? rawRole
      : 'USER';

    // Store strictly in-memory
    this.authState = {
      isAuthenticated: true,
      username: data.username || username,
      role: cleanRole,
      accessToken: data.accessToken || null,
      refreshToken: data.refreshToken || null,
    };

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
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      if (res.status === 429) {
        throw new Error('Too many registration attempts. Please retry later.');
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Registration failed: HTTP ${res.status}`);
    }
  }

  public async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'same-origin',
      });
    } catch {
      // Ignore network errors on logout
    }

    // Reset in-memory transient state
    this.authState = {
      isAuthenticated: false,
      username: '',
      role: 'USER',
      accessToken: null,
      refreshToken: null,
    };

    this.notifyListeners();
  }

  public async refresh(): Promise<string | null> {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.accessToken) {
          this.authState = {
            ...this.authState,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken || this.authState.refreshToken,
          };
          this.notifyListeners();
          return data.accessToken;
        }
      }
    } catch {
      // Refresh failed
    }

    await this.logout();
    return null;
  }
}

export const authService = new AuthService();
