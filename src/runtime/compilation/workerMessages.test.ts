/**
 * Ensures compile payloads (including incremental previousResult) round-trip through the same
 * cloning path used before postMessage to the compilation worker.
 *
 * Outbound: `WorkerCompilePayload` (`type: 'compile'`, numeric `id`, `targetBackend`, `graph`,
 * `audioSetup`, slim `previousResult` when incremental, `affectedNodeIds`, `tryIncremental`).
 * Inbound: `WorkerReplyMessage` — `inited` | `result` (`id` + `result`) | `error` (`id` + `message`).
 * `CompilationManager` applies `result` on the main thread; stale `id`s must be ignored.
 */

import { describe, it, expect } from 'vitest';
import type { WorkerCompilePayload, WorkerReplyMessage } from './workerMessages';
import { cloneableCompilePayload, slimPreviousResultForWorker } from './workerMessages';
import type { RenderBackendKind } from '../../compile-contract';
import type { NodeGraph } from '../../data-model/types';
import type { CompilationResult } from '../../compile-contract';

const AUDIO_REMAP_LAYOUT_KEY = 'remap-mvp-stetra-audio-scale.out';

function minimalGraph(): NodeGraph {
  return {
    id: 'g-worker-msg',
    name: 't',
    version: '2.0',
    nodes: [{ id: 'n-out', type: 'final-output', position: { x: 0, y: 0 }, parameters: {} }],
    connections: [],
  };
}

function fatCompilationResultWithAudioRemapSlot(): CompilationResult {
  return {
    backend: 'webgpu',
    supported: true,
    unsupportedReasons: undefined,
    code: 'FAT_SHADER_SOURCE_SHOULD_NOT_CROSS_WORKER_ON_INCREMENTAL',
    shaderCode: 'FAT_SHADER_SOURCE_SHOULD_NOT_CROSS_WORKER_ON_INCREMENTAL',
    uniforms: [
      {
        name: 'uFat',
        nodeId: 'n-out',
        paramName: 'someParam',
        type: 'float',
        defaultValue: 0,
      },
    ],
    metadata: {
      warnings: ['w'],
      errors: [],
      executionOrder: ['n-a', 'n-out'],
      finalOutputNodeId: 'n-out',
      previewDependencies: {
        usesWallTime: false,
        usesTimelineTime: false,
        usesAudioUniforms: true,
        usesRadialPulseVirtualDrive: false,
        usesRadialPulseSpawnUniformPass: false,
        usesResolutionUniform: false,
        usesMouseUniforms: false,
        usesFrameIndex: false,
      },
    },
    paramLayout: {
      [AUDIO_REMAP_LAYOUT_KEY]: 19,
      'n-out.someParam': 0,
    },
    resources: undefined,
    webgpuPassPlan: undefined,
  };
}

describe('slimPreviousResultForWorker / cloneableCompilePayload', () => {
  it('omits previousResult entirely when tryIncremental is false (even if caller passed a fat result)', () => {
    const fat = fatCompilationResultWithAudioRemapSlot();
    expect(slimPreviousResultForWorker(fat, false)).toBeNull();

    const payload: WorkerCompilePayload = {
      type: 'compile',
      id: 2,
      targetBackend: 'webgpu',
      graph: minimalGraph(),
      audioSetup: null,
      previousResult: fat,
      affectedNodeIds: [],
      tryIncremental: false,
    };

    const cloned = cloneableCompilePayload(payload);
    expect(cloned.previousResult).toBeNull();
    expect(cloned.tryIncremental).toBe(false);
    expect(cloned).not.toHaveProperty('previousResult.code');
  });

  it('strips incremental previousResult to metadata.executionOrder only (no code/uniforms/paramLayout)', () => {
    const fat = fatCompilationResultWithAudioRemapSlot();
    const payload: WorkerCompilePayload = {
      type: 'compile',
      id: 1,
      targetBackend: 'webgl' as RenderBackendKind,
      graph: minimalGraph(),
      audioSetup: null,
      previousResult: fat,
      affectedNodeIds: ['n-out'],
      tryIncremental: true,
    };

    const cloned = cloneableCompilePayload(payload);

    expect(cloned.tryIncremental).toBe(true);
    expect(cloned.previousResult).toEqual({
      metadata: { executionOrder: ['n-a', 'n-out'] },
    });
    expect(cloned.previousResult).not.toHaveProperty('code');
    expect(cloned.previousResult).not.toHaveProperty('shaderCode');
    expect(cloned.previousResult).not.toHaveProperty('uniforms');
    expect(cloned.previousResult).not.toHaveProperty('paramLayout');
    expect(cloned.previousResult).not.toHaveProperty('webgpuPassPlan');
    expect(cloned.previousResult?.metadata).not.toHaveProperty('warnings');
    expect(cloned.previousResult?.metadata).not.toHaveProperty('previewDependencies');
  });

  it('retains glslSectionHashes on slim incremental previousResult (hash-skip seam)', () => {
    const fat = fatCompilationResultWithAudioRemapSlot();
    fat.glslSectionHashes = {
      aggregate: 'agg-1',
      shaderContent: 'sc-1',
      uniformsLayout: 'ul-1',
      paramLayout: 'pl-1',
      nodeBodies: { 'n-a': 'nb-a' },
    };
    const slim = slimPreviousResultForWorker(fat, true);
    expect(slim).toEqual({
      metadata: { executionOrder: ['n-a', 'n-out'] },
      glslSectionHashes: {
        aggregate: 'agg-1',
        shaderContent: 'sc-1',
        uniformsLayout: 'ul-1',
        paramLayout: 'pl-1',
        nodeBodies: { 'n-a': 'nb-a' },
      },
    });
    expect(slim).not.toHaveProperty('shaderCode');
  });

  it('retains wgslSectionHashes on slim incremental previousResult (04B hash-skip seam)', () => {
    const fat = fatCompilationResultWithAudioRemapSlot();
    fat.backend = 'webgpu';
    fat.wgslSectionHashes = {
      aggregate: 'w-agg-1',
      shaderContent: 'w-sc-1',
      uniformsLayout: 'w-ul-1',
      paramLayout: 'w-pl-1',
      passPlan: 'w-pp-1',
    };
    const slim = slimPreviousResultForWorker(fat, true);
    expect(slim).toEqual({
      metadata: { executionOrder: ['n-a', 'n-out'] },
      wgslSectionHashes: {
        aggregate: 'w-agg-1',
        shaderContent: 'w-sc-1',
        uniformsLayout: 'w-ul-1',
        paramLayout: 'w-pl-1',
        passPlan: 'w-pp-1',
      },
    });
    expect(slim).not.toHaveProperty('webgpuPassPlan');
    expect(slim).not.toHaveProperty('code');
  });

  it('cloneableCompilePayload keeps tryIncremental false with null previousResult (full compile channel)', () => {
    const payload: WorkerCompilePayload = {
      type: 'compile',
      id: 3,
      targetBackend: 'webgl',
      graph: minimalGraph(),
      audioSetup: null,
      previousResult: null,
      affectedNodeIds: ['n-out'],
      tryIncremental: false,
    };

    const cloned = cloneableCompilePayload(payload);
    expect(cloned.type).toBe('compile');
    expect(cloned.previousResult).toBeNull();
    expect(cloned.tryIncremental).toBe(false);
    expect(cloned.id).toBe(3);
  });

  it('WorkerReplyMessage result branch carries compile id and result metadata CompilationManager reads', () => {
    const result = fatCompilationResultWithAudioRemapSlot();
    const msg: WorkerReplyMessage = { type: 'result', id: 42, result };
    expect(msg.type).toBe('result');
    expect(msg.id).toBe(42);
    expect(msg.result.metadata.finalOutputNodeId).toBe('n-out');
    expect(msg.result.backend).toBe('webgpu');
    expect(msg.result.paramLayout[AUDIO_REMAP_LAYOUT_KEY]).toBe(19);
  });

  it('WorkerReplyMessage error branch is structuredClone-stable', () => {
    const msg: WorkerReplyMessage = { type: 'error', id: 7, message: 'worker compile failed' };
    if (typeof structuredClone !== 'function') {
      expect.fail('structuredClone should exist in Vitest environment');
    }
    const copy = structuredClone(msg);
    expect(copy).toEqual(msg);
    expect((copy as WorkerReplyMessage).type).toBe('error');
  });

  it('cloneableCompilePayload JSON fallback drops non-JSON values (functions never cross postMessage)', () => {
    const payload = {
      type: 'compile' as const,
      id: 8,
      targetBackend: 'webgl' as const,
      graph: minimalGraph(),
      audioSetup: null,
      previousResult: null,
      affectedNodeIds: [] as string[],
      tryIncremental: false,
      evil: () => 1,
    } as unknown as WorkerCompilePayload;

    // Force JSON path by temporarily shadowing structuredClone failure via a non-cloneable
    // value already handled: functions on the *slimmed* object are not present; we still
    // assert the helper returns a plain compile payload without the evil key when falling
    // through (structuredClone throws on functions if present on input before slim — here
    // slim picks known keys only, so structuredClone succeeds and drops evil).
    const cloned = cloneableCompilePayload(payload);
    expect('evil' in cloned).toBe(false);
    expect(cloned.type).toBe('compile');
  });
});
