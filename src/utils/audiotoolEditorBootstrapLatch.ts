/**
 * Holds a singleton Promise factory so repeated calls (splash + continue taps) share one bootstrap run.
 * Used by `App.svelte` optional Audiotool connection flow (see IMPLEMENTATION_PLAN).
 */
export interface EditorBootstrapLatch {
  /** Starts or joins the editor bootstrap pipeline; resolves when complete. */
  ensure: () => Promise<void>;
}

export function createEditorBootstrapLatch(start: () => Promise<void>): EditorBootstrapLatch {
  let pending: Promise<void> | null = null;
  return {
    ensure(): Promise<void> {
      if (!pending) {
        pending = start();
      }
      return pending;
    },
  };
}
