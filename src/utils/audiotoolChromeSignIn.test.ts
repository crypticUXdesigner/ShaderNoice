import { describe, it, expect, vi } from 'vitest';
import { resolveAudiotoolSignInChromeAction } from './audiotoolChromeSignIn';

describe('resolveAudiotoolSignInChromeAction', () => {
  it('returns null when Audiotool gate is off', () => {
    const login = vi.fn();
    expect(
      resolveAudiotoolSignInChromeAction({
        useAudiotoolGate: false,
        splashOverlayVisible: false,
        hasAudiotoolSession: false,
        login,
      })
    ).toBeNull();
  });

  it('returns null when splash still covers the chrome', () => {
    expect(
      resolveAudiotoolSignInChromeAction({
        useAudiotoolGate: true,
        splashOverlayVisible: true,
        hasAudiotoolSession: false,
        login: vi.fn(),
      })
    ).toBeNull();
  });

  it('returns null when a session exists', () => {
    expect(
      resolveAudiotoolSignInChromeAction({
        useAudiotoolGate: true,
        splashOverlayVisible: false,
        hasAudiotoolSession: true,
        login: vi.fn(),
      })
    ).toBeNull();
  });

  it('returns null when login callback is absent', () => {
    expect(
      resolveAudiotoolSignInChromeAction({
        useAudiotoolGate: true,
        splashOverlayVisible: false,
        hasAudiotoolSession: false,
        login: null,
      })
    ).toBeNull();
  });

  it('invokes login when actionable', () => {
    const login = vi.fn();
    const action = resolveAudiotoolSignInChromeAction({
      useAudiotoolGate: true,
      splashOverlayVisible: false,
      hasAudiotoolSession: false,
      login,
    });
    expect(action).not.toBeNull();
    action!();
    expect(login).toHaveBeenCalledTimes(1);
  });
});
