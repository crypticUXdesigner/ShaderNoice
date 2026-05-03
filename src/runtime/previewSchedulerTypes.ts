/**
 * Preview scheduler contract types (plan §3.4–§3.5, WP 02A).
 * Subset of dirty keys — extend as P1b wires more sources.
 */

/** Typed dirty reason keys (plan §3.5 taxonomy; expand in WP 03). */
export type PreviewDirtyReasonKey =
  | 'graph.semantic'
  | 'graph.layoutOnly'
  | 'runtime.time'
  | 'runtime.timeline'
  | 'runtime.audio'
  | 'runtime.parameter'
  | 'renderer.resize'
  | 'renderer.dprChange'
  | 'compile.started'
  | 'compile.succeeded'
  | 'compile.failed'
  | 'interaction.started'
  | 'interaction.ended'
  | 'visibility.hidden'
  | 'visibility.visible'
  | 'manual.markDirty'
  | 'unknown';

export interface PreviewDirtyEvent {
  reason: PreviewDirtyReasonKey;
  /** Subsystem label for traces (e.g. Renderer, CompilationManager). */
  source: string;
  timestampMs: number;
  requestedUniformWork: boolean;
  requestedPresent: boolean;
  coalesced: boolean;
  dropped: boolean;
  dropNote?: string;
}

/** Plan §3.4 illustrative states — WP 03 implements transitions. */
export type PreviewSchedulerState =
  | 'idleStatic'
  | 'needsSingleFrame'
  | 'playingFullRate'
  | 'playingCapped'
  | 'interactionReduced'
  | 'audioReactivePaused'
  | 'compilePendingLastGoodFrame'
  | 'hiddenThrottled'
  | 'legacyStub';

export interface PreviewSchedulerDebugState {
  mode: PreviewSchedulerState;
  lastDirty: PreviewDirtyReasonKey | null;
  lastCompilePhase: 'idle' | 'started' | 'succeeded' | 'failed';
  /** Monotonic preview frame transactions observed (Renderer full commit). */
  previewFrameCommitCount: number;
  /** Last N dirty events (newest last). */
  recentEvents: PreviewDirtyEvent[];
}
