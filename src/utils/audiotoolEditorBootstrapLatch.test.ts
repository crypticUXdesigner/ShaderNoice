import { describe, it, expect, vi } from 'vitest';
import { createEditorBootstrapLatch } from './audiotoolEditorBootstrapLatch';

describe('createEditorBootstrapLatch', () => {
  it('invokes start once across concurrent callers', async () => {
    const spy = vi.fn(async () => {
      await Promise.resolve();
    });
    const latch = createEditorBootstrapLatch(spy);
    await Promise.all([latch.ensure(), latch.ensure()]);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
