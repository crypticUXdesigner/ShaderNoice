/**
 * Bottom toast stack reads this (see AppToastStack) for indeterminate “preview updating” while the
 * runtime compiles/links after graph edits (node add/remove, etc.). Written from CompilationManager.
 */
import { writable } from 'svelte/store';
import type { CompilationResult } from '../../runtime/types';

export type PreviewCompileStatus =
  | { state: 'idle' }
  | { state: 'updating'; label?: string };

export const previewCompileStatusStore = writable<PreviewCompileStatus>({ state: 'idle' });

/** Default copy for the indeterminate preview toast (AppToastStack fallback matches). */
export const PREVIEW_COMPILE_DEFAULT_LABEL = 'Updating preview…';

export function clearPreviewCompileProgressToast(): void {
  previewCompileStatusStore.set({ state: 'idle' });
}

/** True when the graph gained or lost at least one node (not connection-only). */
export function graphNodesAddedOrRemoved(changes: {
  addedNodes: readonly string[];
  removedNodes: readonly string[];
}): boolean {
  return changes.addedNodes.length > 0 || changes.removedNodes.length > 0;
}

/**
 * After a successful preview compile, show the toast and double-rAF deferral when nodes are
 * added or removed so the shell can paint before heavy compile work.
 */
export function shouldDeferPreviewCompileToast(
  previousResult: CompilationResult | null | undefined,
  changes: { addedNodes: readonly string[]; removedNodes: readonly string[] }
): boolean {
  return (
    previousResult != null &&
    graphNodesAddedOrRemoved(changes) &&
    typeof requestAnimationFrame === 'function'
  );
}

export function beginPreviewCompileProgressToast(label?: string): void {
  previewCompileStatusStore.set({
    state: 'updating',
    label: label?.trim() || PREVIEW_COMPILE_DEFAULT_LABEL,
  });
}