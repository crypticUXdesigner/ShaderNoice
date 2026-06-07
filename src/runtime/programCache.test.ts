import { describe, it, expect, vi } from 'vitest';
import { ProgramCache } from './programCache';

describe('ProgramCache.evictKey', () => {
  it('removes a zero-ref entry so acquire can recreate', () => {
    const onEvict = vi.fn();
    const cache = new ProgramCache<{ id: number }>(4);
    const first = cache.acquire('k', () => ({ id: 1 }), onEvict);
    first.release();
    cache.evictKey('k', onEvict);
    expect(onEvict).toHaveBeenCalledWith({ id: 1 });

    const second = cache.acquire('k', () => ({ id: 2 }), onEvict);
    expect(second.created).toBe(true);
    expect(second.value.id).toBe(2);
    second.release();
  });

  it('does not evict while refCount is non-zero', () => {
    const onEvict = vi.fn();
    const cache = new ProgramCache<{ id: number }>(4);
    const held = cache.acquire('k', () => ({ id: 1 }), onEvict);
    cache.evictKey('k', onEvict);
    expect(onEvict).not.toHaveBeenCalled();
    held.release();
  });
});
