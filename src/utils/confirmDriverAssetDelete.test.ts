import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { confirmDeleteDriverAsset } from './confirmDriverAssetDelete';

describe('confirmDeleteDriverAsset', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true) as typeof globalThis.confirm
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('skips confirm when at most one connection', () => {
    expect(confirmDeleteDriverAsset({ assetKind: 'remapper', connectionCount: 0 })).toBe(true);
    expect(confirmDeleteDriverAsset({ assetKind: 'remapper', connectionCount: 1 })).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('asks confirm when multiple connections', () => {
    vi.mocked(confirm).mockReturnValue(false);
    expect(confirmDeleteDriverAsset({ assetKind: 'envelope', connectionCount: 3 })).toBe(false);
    expect(confirm).toHaveBeenCalledOnce();
  });
});
