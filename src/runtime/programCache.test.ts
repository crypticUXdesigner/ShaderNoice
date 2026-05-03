import { describe, it, expect, vi } from 'vitest';
import { ProgramCache } from './programCache';

describe('ProgramCache', () => {
  it('reuses entries and ref-counts releases', () => {
    const onEvict = vi.fn();
    const cache = new ProgramCache<string>(2);

    const a1 = cache.acquire('a', () => 'A', onEvict);
    const a2 = cache.acquire('a', () => 'A2', onEvict);

    expect(a1.value).toBe('A');
    expect(a2.value).toBe('A');
    expect(a1.created).toBe(true);
    expect(a2.created).toBe(false);

    a1.release();
    expect(onEvict).not.toHaveBeenCalled();
    a2.release();
    expect(onEvict).not.toHaveBeenCalled();
  });

  it('evicts least-recently-used entries with refCount 0', () => {
    const onEvict = vi.fn();
    const cache = new ProgramCache<string>(2);

    const a = cache.acquire('a', () => 'A', onEvict);
    a.release();
    const b = cache.acquire('b', () => 'B', onEvict);
    b.release();

    // Touch b so a becomes LRU.
    const b2 = cache.acquire('b', () => 'B2', onEvict);
    b2.release();

    const c = cache.acquire('c', () => 'C', onEvict);
    c.release();

    expect(onEvict).toHaveBeenCalledTimes(1);
    expect(onEvict).toHaveBeenCalledWith('A');
  });

  it('does not evict entries that are still acquired', () => {
    const onEvict = vi.fn();
    const cache = new ProgramCache<string>(1);

    const a = cache.acquire('a', () => 'A', onEvict);
    // This would exceed capacity, but a is still in use (refCount 1), so nothing evicted.
    const b = cache.acquire('b', () => 'B', onEvict);

    expect(onEvict).not.toHaveBeenCalled();

    a.release();
    b.release();
  });
});

