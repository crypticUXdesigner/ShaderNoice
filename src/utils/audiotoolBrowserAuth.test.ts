import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearAudiotoolOAuthCallbackParamsFromUrl } from './audiotoolBrowserAuth';

describe('clearAudiotoolOAuthCallbackParamsFromUrl', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('strips OAuth callback params and preserves unrelated query keys', () => {
    const replaceState = vi.fn();
    vi.stubGlobal('window', {
      location: {
        href: 'http://127.0.0.1:3000/ShaderNoice/?code=dead&state=x&splash=1#hash',
      },
      history: { replaceState },
    });
    vi.stubGlobal('document', { title: 'ShaderNoice' });

    clearAudiotoolOAuthCallbackParamsFromUrl();

    expect(replaceState).toHaveBeenCalledTimes(1);
    expect(replaceState.mock.calls[0]?.[2]).toBe('/ShaderNoice/?splash=1#hash');
  });

  it('no-ops when there are no callback params', () => {
    const replaceState = vi.fn();
    vi.stubGlobal('window', {
      location: { href: 'http://127.0.0.1:3000/ShaderNoice/?splash=1' },
      history: { replaceState },
    });
    vi.stubGlobal('document', { title: 'ShaderNoice' });

    clearAudiotoolOAuthCallbackParamsFromUrl();

    expect(replaceState).not.toHaveBeenCalled();
  });
});
