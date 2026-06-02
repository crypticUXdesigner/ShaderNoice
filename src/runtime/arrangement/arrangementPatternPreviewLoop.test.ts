import { describe, it, expect, vi } from 'vitest';
import type { NodeGraph } from '../../data-model/types';
import {
  getArrangementPatternOnsetBakeCache,
  setArrangementPatternOnsetBakeCache,
} from '../../audiotool/arrangement/arrangementPatternOnsetBakeCache';
import { buildArrangementSnapshot } from '../../audiotool/arrangement/buildArrangementSnapshot';
import type { RawArrangementEntities } from '../../audiotool/arrangement/rawEntities';
import spikeFixture from '../../audiotool/arrangement/__fixtures__/spike-arrangement-raw.json';
import { resolvePatternOnsetPreviewLoopBudget } from '../../shaders/arrangement/pattern/notePatternBake';
import { filterNotePatternForNode } from '../../shaders/arrangement/pattern/notePatternBake';
import { MAX_PATTERN_GRAVITY_ONSET_LOOP } from '../../shaders/arrangement/pattern/constants';
import { applyArrangementPatternOnsetLoopUniforms } from './arrangementPatternPreviewLoop';

const spikeSnapshot = buildArrangementSnapshot(spikeFixture as RawArrangementEntities);

describe('applyArrangementPatternOnsetLoopUniforms', () => {
  it('sets onset loop bounds for stub pattern node types', () => {
    const onsets = Array.from({ length: 200 }, (_, i) => ({
      startSeconds: i * 0.5,
      endSeconds: i * 0.5 + 0.4,
      pitch: 60,
      velocity: 1,
      trackIndex: 0,
    }));
    setArrangementPatternOnsetBakeCache('n1', onsets);

    const graph: NodeGraph = {
      id: 'g',
      name: 't',
      version: '2.0',
      nodes: [
        {
          id: 'n1',
          type: 'note-ripple-field',
          position: { x: 0, y: 0 },
          parameters: { windowSeconds: 2 },
        },
      ],
      connections: [],
    };

    const setParameter = vi.fn();
    applyArrangementPatternOnsetLoopUniforms({
      graph,
      shaderInstance: { setParameter } as never,
      timelineTime: 50,
    });

    expect(setParameter).toHaveBeenCalledWith('n1', 'onsetLoopStart', expect.any(Number));
    expect(setParameter).toHaveBeenCalledWith('n1', 'onsetLoopEnd', expect.any(Number));
    const start = setParameter.mock.calls.find((c) => c[1] === 'onsetLoopStart')?.[2] as number;
    const end = setParameter.mock.calls.find((c) => c[1] === 'onsetLoopEnd')?.[2] as number;
    expect(end - start).toBeLessThan(20);
    expect(end - start).toBeGreaterThan(0);
  });

  it('caps loop bounds when many onsets share the trailing window', () => {
    const onsets = Array.from({ length: 1400 }, (_, i) => ({
      startSeconds: 49 + i * 0.001,
      endSeconds: 50,
      pitch: 60 + (i % 12),
      velocity: 1,
      trackIndex: 0,
    }));
    setArrangementPatternOnsetBakeCache('n1', onsets);

    const graph: NodeGraph = {
      id: 'g',
      name: 't',
      version: '2.0',
      nodes: [
        {
          id: 'n1',
          type: 'note-ripple-field',
          position: { x: 0, y: 0 },
          parameters: { windowSeconds: 2 },
        },
      ],
      connections: [],
    };

    const setParameter = vi.fn();
    applyArrangementPatternOnsetLoopUniforms({
      graph,
      shaderInstance: { setParameter } as never,
      timelineTime: 50,
    });

    const start = setParameter.mock.calls.find((c) => c[1] === 'onsetLoopStart')?.[2] as number;
    const end = setParameter.mock.calls.find((c) => c[1] === 'onsetLoopEnd')?.[2] as number;
    expect(end - start).toBe(resolvePatternOnsetPreviewLoopBudget(1400));
  });

  it('uses decay param for velocity-spark-grid onset window', () => {
    const onsets = Array.from({ length: 40 }, (_, i) => ({
      startSeconds: 10 + i * 0.01,
      endSeconds: 10.5,
      pitch: 36,
      velocity: 1,
      trackIndex: 0,
    }));
    setArrangementPatternOnsetBakeCache('n-spark', onsets);

    const graph: NodeGraph = {
      id: 'g',
      name: 't',
      version: '2.0',
      nodes: [
        {
          id: 'n-spark',
          type: 'velocity-spark-grid',
          position: { x: 0, y: 0 },
          parameters: { decay: 0.55 },
        },
      ],
      connections: [],
    };

    const setParameter = vi.fn();
    applyArrangementPatternOnsetLoopUniforms({
      graph,
      shaderInstance: { setParameter } as never,
      timelineTime: 10.3,
    });

    expect(setParameter).toHaveBeenCalledWith('n-spark', 'onsetLoopStart', expect.any(Number));
    expect(setParameter).toHaveBeenCalledWith('n-spark', 'onsetLoopEnd', expect.any(Number));
  });

  it('uses trailTime param for duration-comet-trails onset window', () => {
    const onsets = Array.from({ length: 40 }, (_, i) => ({
      startSeconds: 10 + i * 0.01,
      endSeconds: 10.5,
      pitch: 36,
      velocity: 1,
      trackIndex: 0,
    }));
    setArrangementPatternOnsetBakeCache('n-comet', onsets);

    const graph: NodeGraph = {
      id: 'g',
      name: 't',
      version: '2.0',
      nodes: [
        {
          id: 'n-comet',
          type: 'duration-comet-trails',
          position: { x: 0, y: 0 },
          parameters: { trailTime: 1.4 },
        },
      ],
      connections: [],
    };

    const setParameter = vi.fn();
    applyArrangementPatternOnsetLoopUniforms({
      graph,
      shaderInstance: { setParameter } as never,
      timelineTime: 10.3,
    });

    expect(setParameter).toHaveBeenCalledWith('n-comet', 'onsetLoopStart', expect.any(Number));
    expect(setParameter).toHaveBeenCalledWith('n-comet', 'onsetLoopEnd', expect.any(Number));
  });

  it('uses windowSeconds param for note-gravity-warp onset window', () => {
    const onsets = Array.from({ length: 40 }, (_, i) => ({
      startSeconds: 10 + i * 0.01,
      endSeconds: 10.5,
      pitch: 36,
      velocity: 1,
      trackIndex: 0,
    }));
    setArrangementPatternOnsetBakeCache('n-gravity', onsets);

    const graph: NodeGraph = {
      id: 'g',
      name: 't',
      version: '2.0',
      nodes: [
        {
          id: 'n-gravity',
          type: 'note-gravity-warp',
          position: { x: 0, y: 0 },
          parameters: { windowSeconds: 1.0 },
        },
      ],
      connections: [],
    };

    const setParameter = vi.fn();
    applyArrangementPatternOnsetLoopUniforms({
      graph,
      shaderInstance: { setParameter } as never,
      timelineTime: 10.3,
    });

    expect(setParameter).toHaveBeenCalledWith('n-gravity', 'onsetLoopStart', expect.any(Number));
    expect(setParameter).toHaveBeenCalledWith('n-gravity', 'onsetLoopEnd', expect.any(Number));
  });

  it('note-gravity-warp preview loop can start above index 96 when bake has many onsets', () => {
    const onsets = Array.from({ length: 141 }, (_, i) => ({
      startSeconds: i * 0.5,
      endSeconds: i * 0.5 + 0.4,
      pitch: 60,
      velocity: 1,
      trackIndex: 0,
    }));
    setArrangementPatternOnsetBakeCache('n-gravity', onsets);

    const graph: NodeGraph = {
      id: 'g',
      name: 't',
      version: '2.0',
      nodes: [
        {
          id: 'n-gravity',
          type: 'note-gravity-warp',
          position: { x: 0, y: 0 },
          parameters: { windowSeconds: 1.0 },
        },
      ],
      connections: [],
    };

    const setParameter = vi.fn();
    applyArrangementPatternOnsetLoopUniforms({
      graph,
      shaderInstance: { setParameter } as never,
      timelineTime: 70,
    });

    const start = setParameter.mock.calls.find((c) => c[1] === 'onsetLoopStart')?.[2] as number;
    const end = setParameter.mock.calls.find((c) => c[1] === 'onsetLoopEnd')?.[2] as number;
    expect(start).toBeGreaterThan(96);
    expect(end - start).toBeLessThanOrEqual(MAX_PATTERN_GRAVITY_ONSET_LOOP);
    expect(end).toBeGreaterThan(start);
  });

  it('ignores stale bake cache when track filter no longer matches live snapshot', () => {
    const singleTrackNode = {
      id: 'n-spark',
      type: 'velocity-spark-grid' as const,
      position: { x: 0, y: 0 },
      parameters: { trackFilterMode: 1, trackFilterList: 'track-note-1', decay: 0.55 },
    };
    const filteredOnsets = filterNotePatternForNode(spikeSnapshot, singleTrackNode).onsets;
    expect(filteredOnsets.length).toBeGreaterThan(0);

    const staleOnsets = Array.from({ length: 40 }, (_, i) => ({
      startSeconds: 10 + i * 0.01,
      endSeconds: 10.5,
      pitch: 36,
      velocity: 1,
      trackIndex: 0,
    }));
    setArrangementPatternOnsetBakeCache('n-spark', staleOnsets, '0:');

    const graph: NodeGraph = {
      id: 'g',
      name: 't',
      version: '2.0',
      nodes: [singleTrackNode],
      connections: [],
    };

    const setParameter = vi.fn();
    const timelineTime = filteredOnsets[filteredOnsets.length - 1]!.startSeconds + 0.01;
    applyArrangementPatternOnsetLoopUniforms({
      graph,
      shaderInstance: { setParameter } as never,
      timelineTime,
      audioSetup: { arrangementSnapshot: spikeSnapshot },
    });

    const start = setParameter.mock.calls.find((c) => c[1] === 'onsetLoopStart')?.[2] as number;
    const end = setParameter.mock.calls.find((c) => c[1] === 'onsetLoopEnd')?.[2] as number;
    expect(end).toBeGreaterThan(start);
    expect(getArrangementPatternOnsetBakeCache('n-spark')).toEqual(filteredOnsets);
  });
});
