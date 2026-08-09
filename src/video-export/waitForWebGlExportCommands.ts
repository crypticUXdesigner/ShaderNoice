/**
 * WebGL export GPU sync before canvas capture (image toBlob / video CanvasSource).
 *
 * Contract (P4 / arch-perf-remediation 06):
 * - Prefer `fenceSync` + `clientWaitSync` so export does not unconditionally stall on `gl.finish()`.
 * - Fall back to `finish()` when fence creation fails, wait fails, or the wait times out —
 *   black frames are worse than a slower encode.
 * - Callers must keep `preserveDrawingBuffer: true` on the export context
 *   (see docs/architecture/DRAWING-BUFFER-AUDIT.md). Manual smoke: short WebGL video export,
 *   scan for intermittent black frames.
 */

export type WebGlExportSyncMethod = 'fence' | 'finish';

export type WebGlExportSyncFallbackReason =
  | 'no-fence'
  | 'wait-failed'
  | 'timeout'
  | 'unsupported';

export interface WebGlExportSyncResult {
  method: WebGlExportSyncMethod;
  fallbackReason?: WebGlExportSyncFallbackReason;
}

/** Default blocking wait budget for sync export frames (1s). */
export const WEBGL_EXPORT_SYNC_TIMEOUT_NS = 1_000_000_000;

/** Default overall budget for async fence polling (same wall time as sync). */
export const WEBGL_EXPORT_SYNC_ASYNC_TIMEOUT_MS = 1000;

/** Non-blocking / short poll slice for async waits (0 = return immediately if not signaled). */
export const WEBGL_EXPORT_SYNC_POLL_TIMEOUT_NS = 0;

function finishFallback(
  gl: WebGL2RenderingContext,
  reason: WebGlExportSyncFallbackReason
): WebGlExportSyncResult {
  gl.finish();
  return { method: 'finish', fallbackReason: reason };
}

function isFenceSignaledStatus(gl: WebGL2RenderingContext, status: number): boolean {
  return status === gl.ALREADY_SIGNALED || status === gl.CONDITION_SATISFIED;
}

/**
 * Block until GPU commands for the current export frame are complete, then safe to capture.
 */
export function waitForWebGlExportCommands(
  gl: WebGL2RenderingContext,
  options?: { timeoutNs?: number }
): WebGlExportSyncResult {
  const timeoutNs = options?.timeoutNs ?? WEBGL_EXPORT_SYNC_TIMEOUT_NS;

  if (typeof gl.fenceSync !== 'function' || typeof gl.clientWaitSync !== 'function') {
    gl.flush();
    return finishFallback(gl, 'unsupported');
  }

  const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
  if (!sync) {
    gl.flush();
    return finishFallback(gl, 'no-fence');
  }

  gl.flush();
  try {
    const status = gl.clientWaitSync(sync, gl.SYNC_FLUSH_COMMANDS_BIT, timeoutNs);
    if (isFenceSignaledStatus(gl, status)) {
      return { method: 'fence' };
    }
    if (status === gl.WAIT_FAILED) {
      return finishFallback(gl, 'wait-failed');
    }
    // TIMEOUT_EXPIRED or unexpected status
    return finishFallback(gl, 'timeout');
  } finally {
    gl.deleteSync(sync);
  }
}

/**
 * Async-friendly wait: poll the fence with short clientWaitSync slices and yield between polls.
 * Falls back to `finish()` on failure / overall timeout (same correctness bar as sync).
 */
export async function waitForWebGlExportCommandsAsync(
  gl: WebGL2RenderingContext,
  options?: { timeoutMs?: number; pollTimeoutNs?: number }
): Promise<WebGlExportSyncResult> {
  const timeoutMs = options?.timeoutMs ?? WEBGL_EXPORT_SYNC_ASYNC_TIMEOUT_MS;
  const pollTimeoutNs = options?.pollTimeoutNs ?? WEBGL_EXPORT_SYNC_POLL_TIMEOUT_NS;

  if (typeof gl.fenceSync !== 'function' || typeof gl.clientWaitSync !== 'function') {
    gl.flush();
    return finishFallback(gl, 'unsupported');
  }

  const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
  if (!sync) {
    gl.flush();
    return finishFallback(gl, 'no-fence');
  }

  gl.flush();
  const deadline = Date.now() + timeoutMs;
  try {
    for (;;) {
      const status = gl.clientWaitSync(sync, gl.SYNC_FLUSH_COMMANDS_BIT, pollTimeoutNs);
      if (isFenceSignaledStatus(gl, status)) {
        return { method: 'fence' };
      }
      if (status === gl.WAIT_FAILED) {
        return finishFallback(gl, 'wait-failed');
      }
      if (Date.now() >= deadline) {
        return finishFallback(gl, 'timeout');
      }
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  } finally {
    gl.deleteSync(sync);
  }
}
