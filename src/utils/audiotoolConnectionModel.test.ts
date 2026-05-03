import { describe, it, expect, vi } from 'vitest';
import {
  createInitialAudiotoolConnection,
  reduceAudiotoolConnection,
  audiotoolSplashAudiotoolPhase,
} from './audiotoolConnectionModel';

describe('audiotoolConnectionModel', () => {
  it('gate disabled stays disabled', () => {
    let s = createInitialAudiotoolConnection(false);
    s = reduceAudiotoolConnection(s, { type: 'AUTH_CHECKING' });
    expect(s.phase).toBe('disabled');
  });

  it('checking → disconnected with login callbacks', () => {
    let s = createInitialAudiotoolConnection(true);
    expect(s.phase).toBe('checking');
    expect(audiotoolSplashAudiotoolPhase(s)).toBe('checking');
    const login = vi.fn();
    s = reduceAudiotoolConnection(s, {
      type: 'AUTH_UNAUTHENTICATED',
      login,
      oauthErrorDetail: null,
    });
    expect(s.phase).toBe('disconnected');
    expect(s.splashPrimaryAction).toBe(login);
    expect(s.disconnectedLogin).toBe(login);
    expect(audiotoolSplashAudiotoolPhase(s)).toBe('signin');
  });

  it('checking → connected', () => {
    let s = createInitialAudiotoolConnection(true);
    const session = { userName: 'u', logout: vi.fn() } as import('@audiotool/nexus').AuthenticatedClient;
    s = reduceAudiotoolConnection(s, { type: 'AUTH_CONNECTED', session });
    expect(s.phase).toBe('connected');
    expect(s.session).toBe(session);
    expect(s.disconnectedLogin).toBeNull();
  });

  it('logout clears session and disconnected login placeholders', () => {
    let s = createInitialAudiotoolConnection(true);
    const login = vi.fn();
    s = reduceAudiotoolConnection(s, {
      type: 'AUTH_UNAUTHENTICATED',
      login,
      oauthErrorDetail: null,
    });
    const session = { userName: 'u', logout: vi.fn() } as import('@audiotool/nexus').AuthenticatedClient;
    s = reduceAudiotoolConnection(s, { type: 'AUTH_CONNECTED', session });
    s = reduceAudiotoolConnection(s, { type: 'LOGOUT_AND_CLEAR_SESSION' });
    expect(s.session).toBeNull();
    expect(s.phase).toBe('disconnected');
    expect(s.disconnectedLogin).toBeNull();
  });

  it('restores disconnected login after refresh', () => {
    let s = createInitialAudiotoolConnection(true);
    s = reduceAudiotoolConnection(s, { type: 'LOGOUT_AND_CLEAR_SESSION' });
    const restored = vi.fn();
    s = reduceAudiotoolConnection(s, { type: 'DISCONNECTED_LOGIN_RESTORED', login: restored });
    expect(s.disconnectedLogin).toBe(restored);
  });

  it('bootstrap in flight toggles flag without changing phase', () => {
    let s = createInitialAudiotoolConnection(true);
    s = reduceAudiotoolConnection(s, { type: 'BOOTSTRAP_IN_FLIGHT', inFlight: true });
    expect(s.editorBootstrapInFlight).toBe(true);
    s = reduceAudiotoolConnection(s, { type: 'BOOTSTRAP_IN_FLIGHT', inFlight: false });
    expect(s.editorBootstrapInFlight).toBe(false);
  });
});
