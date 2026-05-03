/**
 * Tests for CompilationManager: no-worker path, worker path (mock), and destroy.
 * Ensures recompile applies result on main thread when worker is null, and posts
 * correct payload / applies result when worker is set; destroy terminates worker.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NodeGraph } from '../data-model/types';
import type { CompilationResult } from './types';
import { createCompilationManager } from './factories';
import type { ShaderCompiler } from './types';

// Mock ShaderInstance so we don't need WebGL. CompilationManager and parameterTransfer
// only need: setParameter, getParameters, setTimelineTime, setTime, getTimelineTime, getTime, destroy.
const mockInstanceMethods = {
  setParameter: vi.fn(),
  getParameters: vi.fn(() => [] as [string, number | [number, number, number, number]][]),
  setTimelineTime: vi.fn(),
  setTime: vi.fn(),
  getTimelineTime: vi.fn(() => 0),
  getTime: vi.fn(() => 0),
  destroy: vi.fn(),
};

vi.mock('./ShaderInstance', () => ({
  ShaderInstance: class MockShaderInstance {
    constructor(_gl: unknown, _result: CompilationResult) {
      Object.assign(this, mockInstanceMethods);
    }
  },
}));

function minimalCompilationResult(finalOutputNodeId: string | null = 'n2'): CompilationResult {
  return {
    shaderCode: 'void main() { gl_FragColor = vec4(0.0); }',
    uniforms: [],
    metadata: {
      warnings: [],
      errors: [],
      executionOrder: [],
      finalOutputNodeId,
      previewDependencies: {
        usesWallTime: false,
        usesTimelineTime: false,
        usesAudioUniforms: false,
        usesResolutionUniform: false,
        usesMouseUniforms: false,
        usesFrameIndex: false
      }
    },
  };
}

function minimalGraph(): NodeGraph {
  return {
    id: 'g1',
    name: 'Test',
    version: '2.0',
    nodes: [
      { id: 'n1', type: 'time', position: { x: 0, y: 0 }, parameters: {} },
      { id: 'n2', type: 'final-output', position: { x: 0, y: 0 }, parameters: {} },
    ],
    connections: [{ id: 'c1', sourceNodeId: 'n1', sourcePort: 'out', targetNodeId: 'n2', targetPort: 'in' }],
  };
}

function createMockCompiler(): ShaderCompiler {
  return {
    compile: vi.fn(() => minimalCompilationResult()),
    compileIncremental: vi.fn(() => null),
  };
}

function createMockRenderer() {
  const setShaderInstance = vi.fn();
  const markDirty = vi.fn();
  const render = vi.fn();
  const mockGL = {
    isContextLost: vi.fn(() => false),
  };
  return {
    setShaderInstance,
    markDirty,
    render,
    getGLContext: vi.fn(() => mockGL),
  };
}

// CompilationManager uses window.setTimeout / window.cancelIdleCallback; ensure window exists in Node test env.
function ensureWindow() {
  if (typeof (globalThis as unknown as { window?: unknown }).window === 'undefined') {
    (globalThis as unknown as { window: typeof globalThis }).window = globalThis as unknown as Window;
  }
}

describe('CompilationManager', () => {
  beforeEach(() => {
    ensureWindow();
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('no-worker path', () => {
    it('applies compilation result when recompile runs on main thread', () => {
      const compiler = createMockCompiler();
      const renderer = createMockRenderer();
      const cm = createCompilationManager(compiler, renderer);

      cm.setGraph(minimalGraph());
      cm.onGraphStructureChange(true); // immediate → setTimeout(0) then recompile

      vi.runAllTimers();

      expect(compiler.compile).toHaveBeenCalledWith(minimalGraph(), null);
      expect(renderer.setShaderInstance).toHaveBeenCalled();
      expect(cm.getShaderInstance()).not.toBeNull();
      expect(cm.getPreviewDependencyMask()).toEqual({
        usesWallTime: false,
        usesTimelineTime: false,
        usesAudioUniforms: false,
        usesResolutionUniform: false,
        usesMouseUniforms: false,
        usesFrameIndex: false
      });
    });

    it('skips recompilation when only disconnected nodes change', () => {
      const compiler = createMockCompiler();
      const renderer = createMockRenderer();
      const cm = createCompilationManager(compiler, renderer);

      const g1 = minimalGraph();
      cm.setGraph(g1);
      cm.onGraphStructureChange(true);
      vi.runAllTimers();

      expect(compiler.compile).toHaveBeenCalledTimes(1);

      // Add a disconnected node (idle slice): no connections added/removed.
      const g2: NodeGraph = {
        ...g1,
        nodes: [...g1.nodes, { id: 'idle1', type: 'float', position: { x: 10, y: 10 }, parameters: { value: 1 } }],
      };
      cm.setGraph(g2);
      cm.onGraphStructureChange(true);
      vi.runAllTimers();

      // Should not recompile because output-reachable slice is unchanged.
      expect(compiler.compile).toHaveBeenCalledTimes(1);
    });

    it('skips recompilation when only idle-to-idle connections change', () => {
      const compiler = createMockCompiler();
      const renderer = createMockRenderer();
      const cm = createCompilationManager(compiler, renderer);

      const g1: NodeGraph = {
        ...minimalGraph(),
        nodes: [
          ...minimalGraph().nodes,
          { id: 'idle1', type: 'float', position: { x: 1, y: 1 }, parameters: { value: 0.5 } },
          { id: 'idle2', type: 'float', position: { x: 2, y: 2 }, parameters: { value: 0.25 } },
        ],
      };
      cm.setGraph(g1);
      cm.onGraphStructureChange(true);
      vi.runAllTimers();
      expect(compiler.compile).toHaveBeenCalledTimes(1);

      const g2: NodeGraph = {
        ...g1,
        connections: [
          ...g1.connections,
          {
            id: 'cIdle',
            sourceNodeId: 'idle2',
            sourcePort: 'out',
            targetNodeId: 'idle1',
            targetParameter: 'value',
          },
        ],
      };
      cm.setGraph(g2);
      cm.onGraphStructureChange(true);
      vi.runAllTimers();

      expect(compiler.compile).toHaveBeenCalledTimes(1);
    });

    it('recompiles when output path is rewired to a previously idle node', () => {
      const compiler = createMockCompiler();
      const renderer = createMockRenderer();
      const cm = createCompilationManager(compiler, renderer);

      const g1: NodeGraph = {
        ...minimalGraph(),
        nodes: [
          ...minimalGraph().nodes,
          { id: 'idle1', type: 'float', position: { x: 1, y: 1 }, parameters: { value: 0.9 } },
        ],
      };
      cm.setGraph(g1);
      cm.onGraphStructureChange(true);
      vi.runAllTimers();
      expect(compiler.compile).toHaveBeenCalledTimes(1);

      const g2: NodeGraph = {
        ...g1,
        connections: [
          {
            id: 'c2',
            sourceNodeId: 'idle1',
            sourcePort: 'out',
            targetNodeId: 'n2',
            targetPort: 'in',
          },
        ],
      };
      cm.setGraph(g2);
      cm.onGraphStructureChange(true);
      vi.runAllTimers();

      expect(compiler.compile).toHaveBeenCalledTimes(2);
    });

    it('ignores parameter updates for nodes outside the preview slice', () => {
      const compiler = createMockCompiler();
      const renderer = createMockRenderer();
      const cm = createCompilationManager(compiler, renderer);

      const g1: NodeGraph = {
        ...minimalGraph(),
        nodes: [
          ...minimalGraph().nodes,
          { id: 'idle1', type: 'float', position: { x: 1, y: 1 }, parameters: { value: 1 } },
        ],
      };
      cm.setGraph(g1);
      cm.onGraphStructureChange(true);
      vi.runAllTimers();

      mockInstanceMethods.setParameter.mockClear();
      cm.onParameterChange('idle1', 'value', 2);
      vi.runAllTimers();

      expect(mockInstanceMethods.setParameter).not.toHaveBeenCalled();
    });

    it('coalesces multiple immediate structure changes into one compile', () => {
      const compiler = createMockCompiler();
      const renderer = createMockRenderer();
      const cm = createCompilationManager(compiler, renderer);

      cm.setGraph(minimalGraph());
      cm.onGraphStructureChange(true);
      cm.onGraphStructureChange(true);
      cm.onGraphStructureChange(true);

      vi.runAllTimers();

      expect(compiler.compile).toHaveBeenCalledTimes(1);
    });
  });

  describe('worker path (mock)', () => {
    /** Node test env may lack rAF; stub so worker path runs, with immediate callback like production's next frame. */
    beforeEach(() => {
      vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
        cb(0);
        return 0;
      });
      vi.stubGlobal('cancelAnimationFrame', () => {});
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('posts compile payload and applies result when worker replies with matching id', () => {
      const postMessageCalls: unknown[] = [];
      const mockWorker = {
        postMessage: vi.fn((payload: unknown) => postMessageCalls.push(payload)),
        onmessage: null as ((ev: MessageEvent) => void) | null,
        terminate: vi.fn(),
      };

      const compiler = createMockCompiler();
      const renderer = createMockRenderer();
      const cm = createCompilationManager(compiler, renderer, undefined, mockWorker as unknown as Worker);

      cm.setGraph(minimalGraph());
      cm.onGraphStructureChange(true);

      vi.runAllTimers();

      expect(postMessageCalls.length).toBeGreaterThanOrEqual(1);
      const payload = postMessageCalls[0] as { type: string; id: number; graph: NodeGraph; audioSetup: unknown; affectedNodeIds: string[]; tryIncremental: boolean };
      expect(payload.type).toBe('compile');
      expect(typeof payload.id).toBe('number');
      expect(payload.graph).toEqual(minimalGraph());
      expect(payload.audioSetup).toBeNull();
      expect(Array.isArray(payload.affectedNodeIds)).toBe(true);
      expect(typeof payload.tryIncremental).toBe('boolean');

      // Main-thread compiler should not be used when worker is set
      expect(compiler.compile).not.toHaveBeenCalled();

      // Simulate worker reply with matching id
      const result = minimalCompilationResult();
      const replyId = payload.id;
      mockWorker.onmessage?.({
        data: { type: 'result', id: replyId, result },
      } as MessageEvent);

      expect(renderer.setShaderInstance).toHaveBeenCalled();
      expect(cm.getShaderInstance()).not.toBeNull();
      expect(cm.getPreviewDependencyMask()).toEqual(result.metadata.previewDependencies);
    });

    it('ignores worker result when id does not match', () => {
      const postMessageCalls: unknown[] = [];
      const mockWorker = {
        postMessage: vi.fn((payload: unknown) => postMessageCalls.push(payload)),
        onmessage: null as ((ev: MessageEvent) => void) | null,
        terminate: vi.fn(),
      };

      const compiler = createMockCompiler();
      const renderer = createMockRenderer();
      const cm = createCompilationManager(compiler, renderer, undefined, mockWorker as unknown as Worker);

      cm.setGraph(minimalGraph());
      cm.onGraphStructureChange(true);
      vi.runAllTimers();

      const payload = postMessageCalls[0] as { id: number };
      const wrongId = payload.id + 999;
      mockWorker.onmessage?.({
        data: { type: 'result', id: wrongId, result: minimalCompilationResult() },
      } as MessageEvent);

      // setShaderInstance should not have been called from this stale reply
      expect(renderer.setShaderInstance).not.toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('terminates worker when destroy is called', () => {
      const terminate = vi.fn();
      const mockWorker = {
        postMessage: vi.fn(),
        onmessage: null,
        terminate,
      };

      const compiler = createMockCompiler();
      const renderer = createMockRenderer();
      const cm = createCompilationManager(compiler, renderer, undefined, mockWorker as unknown as Worker);

      cm.destroy();
      expect(terminate).toHaveBeenCalledTimes(1);
    });
  });
});
