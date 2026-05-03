import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { AppToast } from './appToastStore';
import { APP_TOAST_BURST_MERGE_MS, appToastStore } from './appToastStore';

function snapshotToasts(): AppToast[] {
  let latest: AppToast[] = [];
  const unsub = appToastStore.subscribe((v) => {
    latest = v;
  });
  unsub();
  return latest;
}

describe('appToastStore', () => {
  beforeEach(() => {
    appToastStore.clearAll();
    vi.useFakeTimers();
    vi.setSystemTime(1000_000);
  });

  afterEach(() => {
    vi.useRealTimers();
    appToastStore.clearAll();
  });

  it('merges burst identical toasts within window and increments repeatCount', () => {
    appToastStore.addToast({ variant: 'info', message: 'Same thing', reportCategory: 'audio' });
    vi.advanceTimersByTime(200);
    appToastStore.addToast({ variant: 'info', message: 'Same thing', reportCategory: 'audio' });
    vi.advanceTimersByTime(150);
    appToastStore.addToast({ variant: 'info', message: 'Same thing', reportCategory: 'audio' });

    const list = snapshotToasts();
    expect(list).toHaveLength(1);
    expect(list[0].repeatCount).toBe(3);
    expect(list[0].reportCategory).toBe('audio');
    expect(list[0].copyText).toContain('[Reported 3x consecutively]');
  });

  it('does not merge identical message across category', () => {
    appToastStore.addToast({ variant: 'error', message: 'boom', reportCategory: 'audio' });
    vi.advanceTimersByTime(50);
    appToastStore.addToast({ variant: 'error', message: 'boom', reportCategory: 'runtime' });

    expect(snapshotToasts()).toHaveLength(2);
  });

  it('does not merge when variant differs', () => {
    appToastStore.addToast({ variant: 'info', message: 'm' });
    vi.advanceTimersByTime(40);
    appToastStore.addToast({ variant: 'error', message: 'm' });
    expect(snapshotToasts()).toHaveLength(2);
  });

  it('does not merge after gap longer than burst window', () => {
    appToastStore.addToast({ variant: 'info', message: 'same' });
    vi.advanceTimersByTime(APP_TOAST_BURST_MERGE_MS + 80);
    appToastStore.addToast({ variant: 'info', message: 'same' });

    const list = snapshotToasts();
    expect(list).toHaveLength(2);
    expect(list[0].repeatCount).toBe(1);
    expect(list[1].repeatCount).toBe(1);
  });

  it('starts a fresh burst cluster after gap but can merge burst again later', () => {
    appToastStore.addToast({ variant: 'warning', message: 'retry' });
    vi.advanceTimersByTime(120);
    appToastStore.addToast({ variant: 'warning', message: 'retry' });
    expect(snapshotToasts()[0].repeatCount).toBe(2);

    vi.advanceTimersByTime(APP_TOAST_BURST_MERGE_MS + 10);
    appToastStore.addToast({ variant: 'warning', message: 'retry' });

    expect(snapshotToasts()).toHaveLength(2);
    expect(snapshotToasts()[1].repeatCount).toBe(1);

    vi.advanceTimersByTime(100);
    appToastStore.addToast({ variant: 'warning', message: 'retry' });
    expect(snapshotToasts()).toHaveLength(2);
    expect(snapshotToasts()[1].repeatCount).toBe(2);
  });
});
