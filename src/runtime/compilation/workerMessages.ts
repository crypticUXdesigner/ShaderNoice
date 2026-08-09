/**
 * Worker message types for compilation worker communication.
 * All payloads are structured-clone compatible (no functions or non-plain data).
 */

import type { NodeGraph } from '../../data-model/types';
import type { AudioSetup } from '../../data-model/audioSetupTypes';
import type {
  CompilationResult,
  IncrementalPreviousResult,
  RenderBackendKind,
} from '../../compile-contract';
import type { NodeSpec } from '../../types/nodeSpec';

/** Sent from main thread to worker: init with node specs. */
export interface WorkerInitPayload {
  type: 'init';
  nodeSpecs: Record<string, NodeSpec>;
}

/** Sent from main thread to worker: compile request. */
export interface WorkerCompilePayload {
  type: 'compile';
  id: number;
  targetBackend: RenderBackendKind;
  graph: NodeGraph;
  audioSetup: AudioSetup | null;
  /**
   * Slim previous snapshot for incremental compiles only.
   * Always `null` when `tryIncremental` is false (omit fat `CompilationResult` from the clone).
   * When incremental, only {@link IncrementalPreviousResult} fields are posted — see
   * `slimPreviousResultForWorker`.
   */
  previousResult: IncrementalPreviousResult | null;
  affectedNodeIds: string[];
  tryIncremental: boolean;
}

/** Sent from worker to main thread: compilation succeeded. */
export interface WorkerResultMessage {
  type: 'result';
  id: number;
  result: CompilationResult;
}

/** Sent from worker to main thread: compilation failed. */
export interface WorkerErrorMessage {
  type: 'error';
  id: number;
  message: string;
}

/** Sent from worker to main thread: init completed, ready for compile. */
export interface WorkerInitedMessage {
  type: 'inited';
}

/** Union of all messages the worker can send back to the main thread. */
export type WorkerReplyMessage =
  | WorkerResultMessage
  | WorkerErrorMessage
  | WorkerInitedMessage;

/**
 * Strip `previousResult` to fields `compileIncremental` actually reads.
 * Full `CompilationResult` (shader source, uniforms, pass plans, paramLayout, …) must not
 * cross the worker boundary via structuredClone on every edit.
 */
export function slimPreviousResultForWorker(
  previousResult: IncrementalPreviousResult | CompilationResult | null | undefined,
  tryIncremental: boolean
): IncrementalPreviousResult | null {
  if (!tryIncremental || previousResult == null) {
    return null;
  }
  return {
    metadata: {
      executionOrder: [...(previousResult.metadata.executionOrder ?? [])],
    },
  };
}

/**
 * Build a plain compile payload with coherent `tryIncremental` / `previousResult`, then
 * deep-clone for postMessage. Graph/audioSetup still clone (Svelte `$state` proxies are unsafe
 * to post by reference); fat previous compile IR is omitted or stripped first.
 */
export function cloneableCompilePayload(
  payload: WorkerCompilePayload
): WorkerCompilePayload {
  const slimmed: WorkerCompilePayload = {
    type: 'compile',
    id: payload.id,
    targetBackend: payload.targetBackend,
    graph: payload.graph,
    audioSetup: payload.audioSetup,
    previousResult: slimPreviousResultForWorker(payload.previousResult, payload.tryIncremental),
    affectedNodeIds: payload.affectedNodeIds,
    tryIncremental: payload.tryIncremental,
  };

  try {
    if (typeof structuredClone === 'function') {
      return structuredClone(slimmed);
    }
  } catch {
    /* fall through — JSON is last resort */
  }
  return JSON.parse(JSON.stringify(slimmed)) as WorkerCompilePayload;
}
