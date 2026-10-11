import type { ActiveTab } from '../types';

export interface RouteState {
  path: string;
  tab: ActiveTab;
  certId?: string;
  isLoginModal: boolean;
  loginMode: 'login' | 'register';
  redirectTarget?: string;
  sectionAnchor?: string;
}

export type RouteChangeListener = (route: RouteState) => void;

const TAB_PATH_MAP: Record<ActiveTab, string> = {
  overview: '/overview',
  verify: '/verify',
  history: '/history',
  certificate: '/certificate',
  policies: '/policies',
  audit: '/audit',
  trust: '/trust',
  architecture: '/trust',
  demo: '/demo',
  profile: '/profile',
};

class RouterService {
  private listeners: Set<RouteChangeListener> = new Set();
  private memoryLocation = { pathname: '/overview', hash: '', search: '' };

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', () => this.notify());
      window.addEventListener('hashchange', () => this.notify());
    }
  }

  public subscribe(listener: RouteChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const route = this.getCurrentRoute();
    this.listeners.forEach((listener) => {
      try {
        listener(route);
      } catch (err) {
        console.error('Error in route listener:', err);
      }
    });
  }

  /**
   * Parses current browser or memory location (supports both HTML5 pathname and hash routing)
   */
  public getCurrentRoute(): RouteState {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname || '/';
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      return this.parseUrl(pathname, hash, search);
    }

    return this.parseUrl(this.memoryLocation.pathname, this.memoryLocation.hash, this.memoryLocation.search);
  }

  /**
   * Pure parsing logic for URL components
   */
  public parseUrl(pathname: string, hash: string, search: string): RouteState {
    // If hash routing is used (e.g. #/verify or #/certificate/123), extract from hash
    let effectivePath = pathname;
    if (hash.startsWith('#/')) {
      effectivePath = hash.slice(1); // remove '#' -> '/verify'
    }

    // Extract query parameters
    let searchParams: URLSearchParams;
    try {
      searchParams = new URLSearchParams(search);
      // Also check hash query params if any (e.g. #/login?target=demo)
      if (hash.includes('?')) {
        const hashQuery = hash.split('?')[1];
        const hashParams = new URLSearchParams(hashQuery);
        hashParams.forEach((val, key) => searchParams.set(key, val));
      }
    } catch {
      searchParams = new URLSearchParams();
    }

    const redirectTarget = searchParams.get('target') || undefined;
    const certParam = searchParams.get('cert') || searchParams.get('id') || undefined;

    // Normalize path by stripping trailing slashes
    const cleanPath = effectivePath.replace(/\/+$/, '') || '/';
    const segments = cleanPath.split('/').filter(Boolean);
    const firstSegment = segments[0]?.toLowerCase() || '';

    // Check modal routes
    if (firstSegment === 'login') {
      return {
        path: '/login',
        tab: 'overview',
        isLoginModal: true,
        loginMode: 'login',
        redirectTarget,
      };
    }

    if (firstSegment === 'register' || firstSegment === 'signup') {
      return {
        path: '/register',
        tab: 'overview',
        isLoginModal: true,
        loginMode: 'register',
        redirectTarget,
      };
    }

    // Check certificate routes with optional ID (e.g., /certificate/argus-2026-xyz)
    if (firstSegment === 'certificate') {
      const certId = segments[1] || certParam || undefined;
      return {
        path: certId ? `/certificate/${certId}` : '/certificate',
        tab: 'certificate',
        certId,
        isLoginModal: false,
        loginMode: 'login',
      };
    }

    // Check landing page section anchors
    const anchor = hash.startsWith('#') && !hash.startsWith('#/') ? hash.slice(1).toLowerCase() : undefined;
    if (anchor && ['how-it-works', 'privacy', 'limits', 'capabilities'].includes(anchor)) {
      return {
        path: `/#${anchor}`,
        tab: 'overview',
        isLoginModal: false,
        loginMode: 'login',
        sectionAnchor: anchor,
      };
    }

    // Map segments to ActiveTab
    switch (firstSegment) {
      case 'verify':
        return { path: '/verify', tab: 'verify', isLoginModal: false, loginMode: 'login' };
      case 'demo':
        return { path: '/demo', tab: 'demo', isLoginModal: false, loginMode: 'login' };
      case 'history':
      case 'records':
      case 'sessions':
        return { path: '/history', tab: 'history', isLoginModal: false, loginMode: 'login' };
      case 'policies':
      case 'policy':
        return { path: '/policies', tab: 'policies', isLoginModal: false, loginMode: 'login' };
      case 'audit':
      case 'audit-trail':
        return { path: '/audit', tab: 'audit', isLoginModal: false, loginMode: 'login' };
      case 'trust':
      case 'architecture':
      case 'trust-center':
        return { path: '/trust', tab: 'trust', isLoginModal: false, loginMode: 'login' };
      case 'profile':
      case 'account':
        return { path: '/profile', tab: 'profile', isLoginModal: false, loginMode: 'login' };
      case 'how-it-works':
        return { path: '/how-it-works', tab: 'overview', isLoginModal: false, loginMode: 'login', sectionAnchor: 'how-it-works' };
      case 'privacy':
        return { path: '/privacy', tab: 'overview', isLoginModal: false, loginMode: 'login', sectionAnchor: 'privacy' };
      case 'limits':
        return { path: '/limits', tab: 'overview', isLoginModal: false, loginMode: 'login', sectionAnchor: 'limits' };
      case 'capabilities':
        return { path: '/capabilities', tab: 'overview', isLoginModal: false, loginMode: 'login', sectionAnchor: 'capabilities' };
      case 'overview':
      default:
        return { path: '/overview', tab: 'overview', isLoginModal: false, loginMode: 'login' };
    }
  }

  /**
   * Programmatic navigation with browser/memory history synchronization
   */
  public navigate(
    destination: ActiveTab | string,
    options?: {
      replace?: boolean;
      certId?: string;
      mode?: 'login' | 'register';
      target?: string;
      anchor?: string;
    }
  ): void {
    let targetPath = '/overview';

    if (destination === 'certificate' && options?.certId) {
      targetPath = `/certificate/${encodeURIComponent(options.certId)}`;
    } else if (destination === 'login') {
      targetPath = options?.target ? `/login?target=${encodeURIComponent(options.target)}` : '/login';
    } else if (destination === 'register') {
      targetPath = options?.target ? `/register?target=${encodeURIComponent(options.target)}` : '/register';
    } else if (destination === 'anchor' && options?.anchor) {
      targetPath = `/#${options.anchor}`;
    } else if (typeof destination === 'string' && destination.startsWith('/')) {
      targetPath = destination;
    } else if (destination in TAB_PATH_MAP) {
      targetPath = TAB_PATH_MAP[destination as ActiveTab];
    } else {
      targetPath = `/${destination}`;
    }

    if (typeof window !== 'undefined') {
      const currentFull = window.location.pathname + window.location.search + window.location.hash;
      if (currentFull !== targetPath) {
        if (options?.replace) {
          window.history.replaceState({ path: targetPath }, '', targetPath);
        } else {
          window.history.pushState({ path: targetPath }, '', targetPath);
        }
      }
    } else {
      const [pathAndSearch, hashPart] = targetPath.split('#');
      const [pathPart, searchPart] = pathAndSearch.split('?');
      this.memoryLocation = {
        pathname: pathPart || '/',
        search: searchPart ? `?${searchPart}` : '',
        hash: hashPart ? `#${hashPart}` : '',
      };
    }

    this.notify();
  }
}

export const router = new RouterService();
