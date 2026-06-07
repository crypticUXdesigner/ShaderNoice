import { describe, expect, it, beforeEach } from 'vitest';
import type { ArrangementNote, ArrangementSnapshot } from '../audiotool/arrangement/types';
import type { NodeGraph } from '../data-model/types';
import {
  addMidiEnvelopeBinding,
  bindMidiEnvelopeRemapperToParam,
  updateMidiEnvelopePreset,
  updateMidiEnvelopeBindingOut,
  updateMidiEnvelopeRemapper,
} from '../data-model/immutableUpdatesMidiEnvelope';
import { applyDriverRemap } from '../utils/driverRemap';
import {
  collectMidiEnvelopeUniformUpdatesFromFrame,
  resetMidiEnvelopeFrameCacheForTests,
} from '../utils/midiEnvelopeFrameCache';
import { buildExportFrameState } from './buildExportFrameState';
import { getMidiEnvelopeExportUniformUpdates } from './offlineMidiEnvelopeUniforms';

function note(
  id: string,
  startSeconds: number,
  durationSeconds: number,
  velocity = 1,
  trackId = 'track-1'
): ArrangementNote {
  return {
    id,
    collectionId: 'col',
    trackId,
    startSeconds,
    durationSeconds,
    pitch: 60,
    velocity,
  };
}

function minimalSnapshot(notes: ArrangementNote[]): ArrangementSnapshot {
  return {
    tracks: [{ id: 'track-1', kind: 'note', orderAmongTracks: 0, enabled: true }],
    regions: [],
    notes,
    bpm: 120,
    durationSeconds: 60,
    timeSignature: { numerator: 4, denominator: 4 },
    source: { trackName: 'tracks/t1', projectName: 'projects/p1', commitIndex: 0 },
  };
}

const instantAdsr = {
  attackSeconds: 0,
  decaySeconds: 0,
  sustainLevel: 1,
  releaseSeconds: 0.2,
};

const bindingEnvelope = {
  adsr: instantAdsr,
  outMin: 0,
  outMax: 10,
  velocityToPeak: true,
};

function baseGraph(staticAmount = 0, extraParams?: Record<string, number>): NodeGraph {
  return {
    id: 'g',
    name: 'g',
    version: '2.0',
    nodes: [
      {
        id: 'n1',
        type: 'test',
        parameters: { amount: staticAmount, ...extraParams },
        position: { x: 0, y: 0 },
      },
    ],
    connections: [],
  };
}

function graphWithBinding(): NodeGraph {
  return addMidiEnvelopeBinding(baseGraph(), 'n1', 'amount', {
    trackIds: ['track-1'],
    envelope: bindingEnvelope,
    id: 'bind-1',
  });
}

describe('getMidiEnvelopeExportUniformUpdates', () => {
  beforeEach(() => {
    resetMidiEnvelopeFrameCacheForTests();
  });

  it('returns remapped peak at note onset and near-zero before the note', () => {
    const snapshot = minimalSnapshot([note('hit', 1, 2)]);
    const graph = graphWithBinding();

    const before = getMidiEnvelopeExportUniformUpdates(graph, snapshot, 0);
    expect(before).toHaveLength(1);
    expect(before[0]!.value).toBeCloseTo(0, 5);

    const atHit = getMidiEnvelopeExportUniformUpdates(graph, snapshot, 1);
    expect(atHit).toHaveLength(1);
    expect(atHit[0]!.nodeId).toBe('n1');
    expect(atHit[0]!.paramName).toBe('amount');
    expect(atHit[0]!.value).toBeCloseTo(10, 5);
  });

  it('returns empty updates when snapshot is missing', () => {
    const graph = graphWithBinding();
    expect(getMidiEnvelopeExportUniformUpdates(graph, undefined, 1)).toEqual([]);
  });

  it('skips disabled bindings', () => {
    const snapshot = minimalSnapshot([note('n1', 0, 2)]);
    const graph = graphWithBinding();
    const disabledGraph: NodeGraph = {
      ...graph,
      midiEnvelopeBindings: graph.midiEnvelopeBindings!.map((b) => ({ ...b, disabled: true })),
    };

    expect(getMidiEnvelopeExportUniformUpdates(disabledGraph, snapshot, 0.5)).toEqual([]);
  });

  it('matches preview collectMidiEnvelopeUniformUpdatesFromFrame at sampled times', () => {
    const notes = [
      note('a', 0, 1),
      note('b', 1, 2),
      note('c', 3, 0.5),
    ];
    const snapshot = minimalSnapshot(notes);
    const graph = graphWithBinding();
    const prev = new Map<string, number>();

    for (const t of [0, 0.25, 0.5, 1, 1.5, 2.5, 3.25]) {
      const exportUpdates = getMidiEnvelopeExportUniformUpdates(graph, snapshot, t);
      const previewUpdates = collectMidiEnvelopeUniformUpdatesFromFrame(
        graph,
        t,
        snapshot,
        prev,
        1e-5,
        true
      );

      expect(exportUpdates).toHaveLength(previewUpdates.length);
      for (let i = 0; i < exportUpdates.length; i++) {
        expect(exportUpdates[i]!.nodeId).toBe(previewUpdates[i]!.nodeId);
        expect(exportUpdates[i]!.paramName).toBe(previewUpdates[i]!.paramName);
        expect(exportUpdates[i]!.value).toBeCloseTo(previewUpdates[i]!.value, 6);
      }
    }
  });

  it('returns updates for multiple bindings and matches preview at overlap time with legato retrigger', () => {
    const overlapEnvelope = {
      adsr: { attackSeconds: 0.2, decaySeconds: 0, sustainLevel: 1, releaseSeconds: 2 },
      outMin: 0,
      outMax: 1,
      velocityToPeak: true,
    };
    const snapshot = minimalSnapshot([note('a', 0, 4), note('b', 1, 4)]);
    let graph = addMidiEnvelopeBinding(baseGraph(0, { gain: 0 }), 'n1', 'amount', {
      trackIds: ['track-1'],
      envelope: overlapEnvelope,
      id: 'bind-amount',
      presetId: 'preset-a',
    });
    graph = addMidiEnvelopeBinding(graph, 'n1', 'gain', {
      trackIds: ['track-1'],
      envelope: { ...overlapEnvelope, outMin: 0, outMax: 5 },
      id: 'bind-gain',
      presetId: 'preset-b',
    });
    const presetId = graph.midiEnvelopePresets![0]!.id;
    const legatoGraph = updateMidiEnvelopePreset(graph, presetId, {
      retriggerPolicy: 'legato',
    });
    const transportTime = 1.05;

    const exportUpdates = getMidiEnvelopeExportUniformUpdates(
      legatoGraph,
      snapshot,
      transportTime
    );
    expect(exportUpdates).toHaveLength(2);

    const previewUpdates = collectMidiEnvelopeUniformUpdatesFromFrame(
      legatoGraph,
      transportTime,
      snapshot,
      new Map(),
      1e-5,
      true
    );
    expect(exportUpdates).toHaveLength(previewUpdates.length);
    for (const u of exportUpdates) {
      const match = previewUpdates.find(
        (p) => p.nodeId === u.nodeId && p.paramName === u.paramName
      );
      expect(match?.value).toBeCloseTo(u.value, 6);
    }
  });

  it('two bindings on one remapper export different Out at the same transport time', () => {
    const snapshot = minimalSnapshot([note('n1', 0, 2)]);
    let graph = addMidiEnvelopeBinding(baseGraph(0, { gain: 0 }), 'n1', 'amount', {
      trackIds: ['track-1'],
      envelope: bindingEnvelope,
      id: 'bind-amount',
    });
    const remapperId = graph.midiEnvelopeBindings![0]!.remapperId;
    graph = bindMidiEnvelopeRemapperToParam(graph, remapperId, 'n1', 'gain', {
      bindingId: 'bind-gain',
      outMin: 0,
      outMax: 20,
    });
    expect(graph.midiEnvelopeBindings!.every((b) => b.remapperId === remapperId)).toBe(true);

    const transportTime = 0.5;
    const exportUpdates = getMidiEnvelopeExportUniformUpdates(graph, snapshot, transportTime);
    expect(exportUpdates).toHaveLength(2);

    const amount = exportUpdates.find((u) => u.paramName === 'amount');
    const gain = exportUpdates.find((u) => u.paramName === 'gain');
    expect(amount?.value).toBeCloseTo(10, 5);
    expect(gain?.value).toBeCloseTo(20, 5);

    const previewUpdates = collectMidiEnvelopeUniformUpdatesFromFrame(
      graph,
      transportTime,
      snapshot,
      new Map(),
      1e-5,
      true
    );
    for (const u of exportUpdates) {
      const match = previewUpdates.find(
        (p) => p.nodeId === u.nodeId && p.paramName === u.paramName
      );
      expect(match?.value).toBeCloseTo(u.value, 6);
    }
  });

  it('applies remapper in-gate and binding out range at note peak', () => {
    const snapshot = minimalSnapshot([note('hit', 1, 2)]);
    let graph = graphWithBinding();
    const remapperId = graph.midiEnvelopeRemappers![0]!.id;
    const bindingId = graph.midiEnvelopeBindings![0]!.id;
    graph = updateMidiEnvelopeRemapper(graph, remapperId, {
      inMin: 0.5,
      inMax: 1,
    });
    graph = updateMidiEnvelopeBindingOut(graph, bindingId, {
      outMin: -0.5,
      outMax: 4,
    });

    const before = getMidiEnvelopeExportUniformUpdates(graph, snapshot, 0.5);
    expect(before[0]!.value).toBeCloseTo(-0.5, 5);

    const atHit = getMidiEnvelopeExportUniformUpdates(graph, snapshot, 1);
    expect(atHit[0]!.value).toBeCloseTo(4, 5);

    const previewUpdates = collectMidiEnvelopeUniformUpdatesFromFrame(
      graph,
      1,
      snapshot,
      new Map(),
      1e-5,
      true
    );
    expect(previewUpdates[0]!.value).toBeCloseTo(atHit[0]!.value, 6);
    expect(atHit[0]!.value).toBe(applyDriverRemap(1, 0.5, 1, -0.5, 4));
  });

  it('does not mutate preview frame cache module state', () => {
    const snapshot = minimalSnapshot([note('n1', 0, 2)]);
    const graph = graphWithBinding();

    getMidiEnvelopeExportUniformUpdates(graph, snapshot, 0.5);
    const prev = new Map<string, number>();
    const previewUpdates = collectMidiEnvelopeUniformUpdatesFromFrame(
      graph,
      0.5,
      snapshot,
      prev,
      1e-5,
      true
    );

    expect(previewUpdates).toHaveLength(1);
    expect(previewUpdates[0]!.value).toBeCloseTo(10, 5);
  });
});

describe('buildExportFrameState', () => {
  beforeEach(() => {
    resetMidiEnvelopeFrameCacheForTests();
  });

  it('computes timelineTime and MIDI updates without offline audio', () => {
    const snapshot = minimalSnapshot([note('n1', 0, 2)]);
    const graph = graphWithBinding();
    const frameRate = 60;
    const startTimeSeconds = 0;

    const state = buildExportFrameState({
      graph,
      audioSetup: { arrangementSnapshot: snapshot },
      frameIndex: 0,
      frameRate,
      startTimeSeconds,
    });

    expect(state.channelSamples).toEqual([]);
    expect(state.timelineTime).toBeCloseTo(startTimeSeconds + 0.5 / frameRate, 8);
    const midi = state.uniformUpdates.filter((u) => u.nodeId === 'n1' && u.paramName === 'amount');
    expect(midi).toHaveLength(1);
    expect(midi[0]!.value).toBeCloseTo(10, 5);
  });

  it('uses timelineTimeOverride for still-image scrub time (not frame-center)', () => {
    const snapshot = minimalSnapshot([note('n1', 0, 2)]);
    const graph = graphWithBinding();
    const scrubTime = 1.25;

    const state = buildExportFrameState({
      graph,
      audioSetup: { arrangementSnapshot: snapshot },
      frameIndex: scrubTime,
      frameRate: 1,
      startTimeSeconds: 0,
      timelineTimeOverride: scrubTime,
    });

    expect(state.timelineTime).toBe(scrubTime);
    expect(state.uniformUpdates.some((u) => u.paramName === 'amount')).toBe(true);
  });

  it('merges MIDI updates after audio uniform updates when offline audio is present', () => {
    const snapshot = minimalSnapshot([note('n1', 0, 2)]);
    const graph = graphWithBinding();
    const frameRate = 30;
    const startTimeSeconds = 0;

    const mockAudio = {
      getFrameState(frameIndex: number) {
        return {
          channelSamples: [new Float32Array([0.1])],
          uniformUpdates: [{ nodeId: 'file-1', paramName: 'currentTime', value: 0.5 }],
          timelineTime: startTimeSeconds + (frameIndex + 0.5) / frameRate,
        };
      },
    };

    const state = buildExportFrameState({
      graph,
      audioSetup: { arrangementSnapshot: snapshot },
      frameIndex: 0,
      frameRate,
      startTimeSeconds,
      offlineAudio: mockAudio,
    });

    expect(state.channelSamples).toHaveLength(1);
    expect(state.uniformUpdates[0]).toEqual({ nodeId: 'file-1', paramName: 'currentTime', value: 0.5 });
    const midi = state.uniformUpdates.find((u) => u.paramName === 'amount');
    expect(midi?.value).toBeCloseTo(10, 5);
    expect(state.timelineTime).toBeCloseTo(0.5 / frameRate, 8);
  });
});
