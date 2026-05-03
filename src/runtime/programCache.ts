export type ProgramCacheKey = string;

type ProgramCacheEntry<T> = {
  key: ProgramCacheKey;
  value: T;
  lastUseTick: number;
  refCount: number;
};

/**
 * Small bounded LRU cache with ref-counting.
 * Entries can only be evicted when refCount === 0.
 */
export class ProgramCache<T> {
  private entries = new Map<ProgramCacheKey, ProgramCacheEntry<T>>();
  private tick = 0;

  constructor(private readonly maxEntries: number) {}

  acquire(
    key: ProgramCacheKey,
    create: () => T,
    onEvict: (value: T) => void
  ): { value: T; release: () => void; created: boolean } {
    this.tick += 1;
    const now = this.tick;

    const existing = this.entries.get(key);
    if (existing) {
      existing.lastUseTick = now;
      existing.refCount += 1;
      return {
        value: existing.value,
        created: false,
        release: () => this.release(key, onEvict),
      };
    }

    const value = create();
    const entry: ProgramCacheEntry<T> = { key, value, lastUseTick: now, refCount: 1 };
    this.entries.set(key, entry);
    this.evictIfNeeded(onEvict);

    return {
      value,
      created: true,
      release: () => this.release(key, onEvict),
    };
  }

  clear(onEvict: (value: T) => void): void {
    for (const e of this.entries.values()) {
      if (e.refCount > 0) {
        // Still in use; keep to avoid deleting resources that are still referenced.
        continue;
      }
      onEvict(e.value);
      this.entries.delete(e.key);
    }
  }

  private release(key: ProgramCacheKey, onEvict: (value: T) => void): void {
    const e = this.entries.get(key);
    if (!e) return;
    e.refCount = Math.max(0, e.refCount - 1);
    this.evictIfNeeded(onEvict);
  }

  private evictIfNeeded(onEvict: (value: T) => void): void {
    if (this.entries.size <= this.maxEntries) return;

    const candidates: ProgramCacheEntry<T>[] = [];
    for (const e of this.entries.values()) {
      if (e.refCount === 0) candidates.push(e);
    }
    if (candidates.length === 0) return;

    candidates.sort((a, b) => a.lastUseTick - b.lastUseTick);
    while (this.entries.size > this.maxEntries && candidates.length > 0) {
      const victim = candidates.shift();
      if (!victim) break;
      const current = this.entries.get(victim.key);
      if (!current || current.refCount !== 0) continue;
      onEvict(current.value);
      this.entries.delete(current.key);
    }
  }
}

