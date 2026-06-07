import { describe, it, expect, beforeEach } from 'vitest';
import type { NodeGraph } from '../data-model/types';
import {
  clearArrangementPatternOnsetBakeCache,
  setArrangementPatternOnsetBakeCache,
} from '../audiotool/arrangement/arrangementPatternOnsetBakeCache';
import { buildExportFrameState } from './buildExportFrameState';

describe('buildExportFrameState arrangement loop uniforms', () => {
  beforeEach(() => {
    clearArrangementPatternOnsetBakeCache();
  });

  it('includes onset loop bounds for velocity-spark-grid at transport time', () => {
    const onsets = Array.from({ length: 80 }, (_, i) => ({
      startSeconds: 10 + i * 0.02,
      endSeconds: 10.5,
      pitch: 60,
      velocity: 1,
      trackIndex: 0,
    }));
    setArrangementPatternOnsetBakeCache('spark1', onsets);

    const graph: NodeGraph = {
      id: 'g',
      name: 't',
      version: '2.0',
      nodes: [
        {
          id: 'spark1',
          type: 'velocity-spark-grid',
          position: { x: 0, y: 0 },
          parameters: { decay: 0.55 },
        },
      ],
      connections: [],
    };

    const state = buildExportFrameState({
      graph,
      audioSetup: {},
      frameIndex: 0,
      frameRate: 60,
      startTimeSeconds: 0,
      timelineTimeOverride: 10.5,
    });

    const start = state.uniformUpdates.find((u) => u.paramName === 'onsetLoopStart');
    const end = state.uniformUpdates.find((u) => u.paramName === 'onsetLoopEnd');
    expect(start).toBeDefined();
    expect(end).toBeDefined();
    expect(end!.value - start!.value).toBeGreaterThan(0);
  });

  it('zeros onset loops when snapshot is missing', () => {
    const graph: NodeGraph = {
      id: 'g',
      name: 't',
      version: '2.0',
      nodes: [
        {
          id: 'spark1',
          type: 'velocity-spark-grid',
          position: { x: 0, y: 0 },
          parameters: {},
        },
      ],
      connections: [],
    };

    const state = buildExportFrameState({
      graph,
      audioSetup: {},
      frameIndex: 0,
      frameRate: 30,
      startTimeSeconds: 0,
      timelineTimeOverride: 5,
    });

    expect(state.uniformUpdates).toEqual(
      expect.arrayContaining([
        { nodeId: 'spark1', paramName: 'onsetLoopStart', value: 0 },
        { nodeId: 'spark1', paramName: 'onsetLoopEnd', value: 0 },
      ])
    );
  });
});
