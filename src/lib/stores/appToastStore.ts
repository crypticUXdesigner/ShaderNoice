/**
 * Bottom-center toast queue (FCFS, max 5). Used by AppToastStack + globalErrorHandler.
 * Rapid duplicates merge into one toast with `(Nx)` only when recurrence is inside `APP_TOAST_BURST_MERGE_MS`
 * and matches `source` + `reportCategory` + `variant` + `message` vs the newest queued toast.
 */

import { writable } from 'svelte/store';
import type { AppError, ErrorCategory } from '../../utils/errorHandling';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

/** Max elapsed ms since the last emission of this toast cluster; merges only in rapid bursts */
export const APP_TOAST_BURST_MERGE_MS = 720;

export interface AppToast {
  id: string;
  variant: ToastVariant;
  message: string;
  copyText: string;
  /** Consecutive identical toasts merged into one badge; 1 = shown as plain message */
  repeatCount: number;
  /** When set by `addFromAppError`; included in dedupe key with `variant` + `message` */
  reportCategory?: ErrorCategory;
  /** Timestamp of latest add-or-merge attempt (burst gate) */
  lastBurstAtMs: number;
  source?: string;
  dismissTimeoutId?: ReturnType<typeof setTimeout>;
  /** When true, toast stays until dismissed (no auto-timeout). */
  noAutoDismiss?: boolean;
  /** Optional primary action (e.g. exit Patch mode). */
  actionLabel?: string;
  onAction?: () => void;
  /** Called when the toast is closed (X, timeout, programmatic dismiss). Prefer over `onAction` for exit behavior. */
  onDismiss?: () => void;
  /** Keyboard / pointer hints shown as keycap chips (e.g. Esc to dismiss). */
  dismissKeycaps?: Array<{ text: string; title?: string }>;
}

const MAX_QUEUED = 5;

const TOAST_MS: Record<ToastVariant, number> = {
  success: 2800,
  info: 2800,
  warning: 5500,
  error: 6000,
};

const queue = writable<AppToast[]>([]);

function clearTimer(t: AppToast): void {
  if (t.dismissTimeoutId) clearTimeout(t.dismissTimeoutId);
}

function buildCopyTextFromAppError(err: AppError): string {
  const parts: string[] = [`[${err.category}]`, err.message];
  if (err.details?.length) parts.push(...err.details);
  return parts.join('\n');
}

function toastMergeKey(
  source: string | undefined,
  reportCategory: ErrorCategory | undefined,
  variant: ToastVariant,
  message: string
): string {
  return `${source ?? ''}\0${reportCategory ?? ''}\0${variant}\0${message}`;
}

function prependRepeatToCopyText(repeatCount: number, copyText: string): string {
  if (repeatCount <= 1) return copyText;
  return `[Reported ${repeatCount}x consecutively]\n${copyText}`;
}

function dismiss(id: string): void {
  queue.update((list) => {
    const item = list.find((t) => t.id === id);
    if (item) clearTimer(item);
    return list.filter((t) => t.id !== id);
  });
}

export const appToastStore = {
  subscribe: queue.subscribe,

  addToast(opts: {
    variant: ToastVariant;
    message: string;
    copyText?: string;
    source?: string;
    /** Distinct toast cluster from other reports with same `message`/`variant` (e.g. audio vs runtime) */
    reportCategory?: ErrorCategory;
    noAutoDismiss?: boolean;
    actionLabel?: string;
    onAction?: () => void;
    onDismiss?: () => void;
    dismissKeycaps?: Array<{ text: string; title?: string }>;
  }): void {
    const now = Date.now();
    const copyBase = opts.copyText?.trim() || opts.message;
    const category = opts.reportCategory;
    const keyIncoming = toastMergeKey(opts.source, category, opts.variant, opts.message);

    queue.update((list) => {
      let next = [...list];
      const last = next[next.length - 1];
      const sameKey =
        last != null &&
        toastMergeKey(last.source, last.reportCategory, last.variant, last.message) === keyIncoming;
      const burstOk = last != null && now - last.lastBurstAtMs <= APP_TOAST_BURST_MERGE_MS;

      if (last && sameKey && burstOk) {
        clearTimer(last);
        const repeatCount = last.repeatCount + 1;
        const copyText = prependRepeatToCopyText(repeatCount, copyBase);
        const updated: AppToast = {
          ...last,
          repeatCount,
          copyText,
          lastBurstAtMs: now,
        };
        updated.dismissTimeoutId = setTimeout(() => dismiss(last.id), TOAST_MS[opts.variant]);
        next[next.length - 1] = updated;
        return next;
      }

      while (next.length >= MAX_QUEUED) {
        const removed = next.shift();
        if (removed) clearTimer(removed);
      }

      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const item: AppToast = {
        id,
        variant: opts.variant,
        message: opts.message,
        copyText: copyBase,
        repeatCount: 1,
        reportCategory: category,
        lastBurstAtMs: now,
        source: opts.source,
        noAutoDismiss: opts.noAutoDismiss,
        actionLabel: opts.actionLabel,
        onAction: opts.onAction,
        onDismiss: opts.onDismiss,
        dismissKeycaps: opts.dismissKeycaps,
      };
      if (!opts.noAutoDismiss) {
        item.dismissTimeoutId = setTimeout(() => dismiss(id), TOAST_MS[opts.variant]);
      }
      next.push(item);
      return next;
    });
  },

  addFromAppError(err: AppError): void {
    const variant: ToastVariant =
      err.severity === 'warning' ? 'warning' : err.severity === 'info' ? 'info' : 'error';
    appToastStore.addToast({
      variant,
      message: err.message,
      copyText: buildCopyTextFromAppError(err),
      reportCategory: err.category,
    });
  },

  dismiss,

  dismissBySource(source: string): void {
    queue.update((list) => {
      list.filter((t) => t.source === source).forEach(clearTimer);
      return list.filter((t) => t.source !== source);
    });
  },

  clearAll(): void {
    queue.update((list) => {
      list.forEach(clearTimer);
      return [];
    });
  },
};
