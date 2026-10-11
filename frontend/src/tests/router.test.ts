import { describe, it, expect } from 'vitest';
import { router } from '../services/router';

describe('Router Service (URL Routing, Deep Linking & History)', () => {
  it('parses standard tab routes accurately from pathname', () => {
    expect(router.parseUrl('/overview', '', '').tab).toBe('overview');
    expect(router.parseUrl('/verify', '', '').tab).toBe('verify');
    expect(router.parseUrl('/demo', '', '').tab).toBe('demo');
    expect(router.parseUrl('/history', '', '').tab).toBe('history');
    expect(router.parseUrl('/records', '', '').tab).toBe('history');
    expect(router.parseUrl('/policies', '', '').tab).toBe('policies');
    expect(router.parseUrl('/audit', '', '').tab).toBe('audit');
    expect(router.parseUrl('/trust', '', '').tab).toBe('trust');
    expect(router.parseUrl('/architecture', '', '').tab).toBe('trust');
    expect(router.parseUrl('/profile', '', '').tab).toBe('profile');
    expect(router.parseUrl('/account', '', '').tab).toBe('profile');
  });

  it('extracts certificate IDs from path parameters and query strings', () => {
    const routeWithPath = router.parseUrl('/certificate/ARG-CERT-2026-99', '', '');
    expect(routeWithPath.tab).toBe('certificate');
    expect(routeWithPath.certId).toBe('ARG-CERT-2026-99');

    const routeWithQuery = router.parseUrl('/certificate', '', '?cert=ARG-QUERY-123');
    expect(routeWithQuery.tab).toBe('certificate');
    expect(routeWithQuery.certId).toBe('ARG-QUERY-123');
  });

  it('handles login and register modal routes with redirect targets', () => {
    const loginRoute = router.parseUrl('/login', '', '?target=demo');
    expect(loginRoute.isLoginModal).toBe(true);
    expect(loginRoute.loginMode).toBe('login');
    expect(loginRoute.redirectTarget).toBe('demo');

    const registerRoute = router.parseUrl('/register', '', '?target=verify');
    expect(registerRoute.isLoginModal).toBe(true);
    expect(registerRoute.loginMode).toBe('register');
    expect(registerRoute.redirectTarget).toBe('verify');
  });

  it('supports hash-based routing seamlessly for single-page environments', () => {
    expect(router.parseUrl('/', '#/verify', '').tab).toBe('verify');
    expect(router.parseUrl('/', '#/demo', '').tab).toBe('demo');
    expect(router.parseUrl('/', '#/certificate/ARG-HASH-77', '').tab).toBe('certificate');
    expect(router.parseUrl('/', '#/certificate/ARG-HASH-77', '').certId).toBe('ARG-HASH-77');
  });

  it('parses landing page section anchors', () => {
    expect(router.parseUrl('/', '#how-it-works', '').sectionAnchor).toBe('how-it-works');
    expect(router.parseUrl('/', '#privacy', '').sectionAnchor).toBe('privacy');
    expect(router.parseUrl('/', '#limits', '').sectionAnchor).toBe('limits');
    expect(router.parseUrl('/', '#capabilities', '').sectionAnchor).toBe('capabilities');
  });

  it('subscribes to route changes and notifies listeners on navigation', () => {
    let capturedRoute: any = null;
    const unsub = router.subscribe((r) => {
      capturedRoute = r;
    });

    router.navigate('verify');
    expect(capturedRoute).not.toBeNull();
    expect(capturedRoute.tab).toBe('verify');

    router.navigate('demo');
    expect(capturedRoute.tab).toBe('demo');

    router.navigate('certificate', { certId: 'CERT-007' });
    expect(capturedRoute.tab).toBe('certificate');
    expect(capturedRoute.certId).toBe('CERT-007');

    unsub();
  });
});
