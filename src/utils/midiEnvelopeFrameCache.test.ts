import { describe, expect, it, beforeEach } from 'vitest';
import type { ArrangementNote, ArrangementSnapshot } from '../audiotool/arrangement/types';
import type { ResolvedMidiEnvelopeBinding } from '../data-model/midiEnvelopeTypes';
import type { NodeGraph } from '../data-model/types';
import {
  addMidiEnvelopeBinding,
  addMidiEnvelopeRemapper,
  bindMidiEnvelopePresetToParam,
  bindMidiEnvelopeRemapperToParam,
  resolveMidiEnvelopeBinding,
  unbindMidiEnvelopeBindingForParam,
  updateMidiEnvelopePreset,
  updateMidiEnvelopeBindingOut,
  updateMidiEnvelopeRemapper,
} from '../data-model/immutableUpdatesMidiEnvelope';
import {
  collectMidiEnvelopeUniformUpdatesFromFrame,
  getMidiEnvelopeFrameRevision,
  getMidiEnvelopeFrameValue,
  getMidiEnvelopeFrameValueByBindingId,
  getMidiEnvelopeUniformUpdatesScratchBufferForTests,
  resetMidiEnvelopeFrameCacheForTests,
  syncMidiEnvelopeFrame,
} from './midiEnvelopeFrameCache';
import {
  evaluateMidiEnvelopeAtTime,
  findActiveNoteForBinding,
  findActiveNoteInSortedFilteredNotes,
} from './midiEnvelopeEvaluator';

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

const binding: ResolvedMidiEnvelopeBinding = {
  id: 'bind-1',
  remapperId: 'remapper-preset-1',
  nodeId: 'n1',
  paramName: 'amount',
  trackIds: ['track-1'],
  envelope: {
    adsr: instantAdsr,
    inMin: 0,
    inMax: 1,
    outMin: 0,
    outMax: 10,
    velocityToPeak: true,
  },
};

function baseGraph(staticAmount = 0.25): NodeGraph {
  return {
    id: 'g',
    name: 'g',
    version: '2.0',
    nodes: [
      {
        id: 'n1',
        type: 'test',
        parameters: { amount: staticAmount },
        position: { x: 0, y: 0 },
      },
    ],
    connections: [],
  };
}

describe('midiEnvelopeFrameCache', () => {
  beforeEach(() => {
    resetMidiEnvelopeFrameCacheForTests();
  });

  it('re-evaluates at the same transport time when only retriggerPolicy changes', () => {
    const snapshot = minimalSnapshot([note('a', 0, 4), note('b', 1, 4)]);
    const overlapEnvelope = {
      adsr: { attackSeconds: 0.2, decaySeconds: 0, sustainLevel: 1, releaseSeconds: 2 },
      velocityToPeak: true,
    };
    const graph = addMidiEnvelopeBinding(baseGraph(), 'n1', 'amount', {
      trackIds: ['track-1'],
      envelope: overlapEnvelope,
      id: 'bind-1',
      presetId: 'preset-1',
    });
    const presetId = graph.midiEnvelopePresets![0]!.id;

    syncMidiEnvelopeFrame(graph, snapshot, 1.05);
    const valueLastWins = getMidiEnvelopeFrameValue('n1', 'amount');

    const legatoGraph = updateMidiEnvelopePreset(graph, presetId, {
      retriggerPolicy: 'legato',
    });
    syncMidiEnvelopeFrame(legatoGraph, snapshot, 1.05);
    const valueLegato = getMidiEnvelopeFrameValue('n1', 'amount');

    expect(valueLegato).toBeDefined();
    expect(valueLastWins).toBeDefined();
    expect(valueLegato!).toBeGreaterThan(valueLastWins!);
    const resolved = resolveMidiEnvelopeBinding(legatoGraph, legatoGraph.midiEnvelopeBindings![0]!)!;
    expect(valueLegato).toBeCloseTo(
      evaluateMidiEnvelopeAtTime(snapshot, resolved, 1.05, 'legato'),
      6
    );
  });

  it('re-evaluates at the same transport time when preset config changes but bindings ref is unchanged', () => {
    const snapshot = minimalSnapshot([note('n1', 0, 2)]);
    const graph = addMidiEnvelopeBinding(baseGraph(), 'n1', 'amount', {
      trackIds: ['track-1'],
      envelope: binding.envelope,
      id: 'bind-1',
      presetId: 'preset-1',
    });
    const presetId = graph.midiEnvelopePresets![0]!.id;
    const bindingsRefBefore = graph.midiEnvelopeBindings;

    syncMidiEnvelopeFrame(graph, snapshot, 0.5);
    const revBefore = getMidiEnvelopeFrameRevision();
    const valueBefore = getMidiEnvelopeFrameValue('n1', 'amount');

    const updated = updateMidiEnvelopePreset(graph, presetId, {
      envelope: {
        ...binding.envelope,
        adsr: { ...instantAdsr, sustainLevel: 0.5 },
      },
    });
    expect(updated.midiEnvelopeBindings).toBe(bindingsRefBefore);
    expect(updated.midiEnvelopePresets).not.toBe(graph.midiEnvelopePresets);

    syncMidiEnvelopeFrame(updated, snapshot, 0.5);
    expect(getMidiEnvelopeFrameRevision()).toBeGreaterThan(revBefore);
    expect(getMidiEnvelopeFrameValue('n1', 'amount')).toBeCloseTo(5, 5);
    expect(getMidiEnvelopeFrameValue('n1', 'amount')).not.toBe(valueBefore);
    const resolved = resolveMidiEnvelopeBinding(updated, updated.midiEnvelopeBindings![0]!);
    expect(resolved).toBeDefined();
    expect(getMidiEnvelopeFrameValue('n1', 'amount')).toBeCloseTo(
      evaluateMidiEnvelopeAtTime(snapshot, resolved!, 0.5),
      6
    );
  });

  it('re-evaluates at the same transport time when remapper in-gate changes', () => {
    const snapshot = minimalSnapshot([note('n1', 0, 2)]);
    const graph = addMidiEnvelopeBinding(baseGraph(), 'n1', 'amount', {
      trackIds: ['track-1'],
      envelope: {
        ...binding.envelope,
        adsr: { attackSeconds: 1, decaySeconds: 0, sustainLevel: 1, releaseSeconds: 0.2 },
      },
      id: 'bind-1',
    });
    const remapperId = graph.midiEnvelopeRemappers![0]!.id;
    const transportTime = 0.25;

    syncMidiEnvelopeFrame(graph, snapshot, transportTime);
    const valueBefore = getMidiEnvelopeFrameValue('n1', 'amount');
    expect(valueBefore).toBeDefined();
    expect(valueBefore!).toBeGreaterThan(0);

    const updated = updateMidiEnvelopeRemapper(graph, remapperId, { inMin: 0.5, inMax: 1 });
    syncMidiEnvelopeFrame(updated, snapshot, transportTime);
    expect(getMidiEnvelopeFrameValue('n1', 'amount')).toBe(0);
    expect(getMidiEnvelopeFrameValue('n1', 'amount')).not.toBe(valueBefore);
  });

  it('re-evaluates at the same transport time when binding output range changes', () => {
    const snapshot = minimalSnapshot([note('n1', 0, 2)]);
    const graph = addMidiEnvelopeBinding(baseGraph(), 'n1', 'amount', {
      trackIds: ['track-1'],
      envelope: binding.envelope,
      id: 'bind-1',
    });
    const bindingId = graph.midiEnvelopeBindings![0]!.id;

    syncMidiEnvelopeFrame(graph, snapshot, 0.5);
    const valueBefore = getMidiEnvelopeFrameValue('n1', 'amount');

    const updated = updateMidiEnvelopeBindingOut(graph, bindingId, { outMin: 0, outMax: 20 });

    syncMidiEnvelopeFrame(updated, snapshot, 0.5);
    expect(getMidiEnvelopeFrameValue('n1', 'amount')).toBeCloseTo(20, 5);
    expect(getMidiEnvelopeFrameValue('n1', 'amount')).not.toBe(valueBefore);
  });

  it('reuses evaluation for the same transport time', () => {
    const snapshot = minimalSnapshot([note('n1', 0, 2)]);
    const graph = addMidiEnvelopeBinding(baseGraph(), 'n1', 'amount', {
      trackIds: ['track-1'],
      envelope: binding.envelope,
      id: 'bind-1',
    });
    const bindingId = graph.midiEnvelopeBindings![0]!.id;

    syncMidiEnvelopeFrame(graph, snapshot, 0.5);
    const revAfterFirst = getMidiEnvelopeFrameRevision();
    expect(getMidiEnvelopeFrameValue('n1', 'amount')).toBeCloseTo(10, 5);
    expect(getMidiEnvelopeFrameValueByBindingId(bindingId)).toBeCloseTo(10, 5);

    syncMidiEnvelopeFrame(graph, snapshot, 0.5);
    expect(getMidiEnvelopeFrameRevision()).toBe(revAfterFirst);
  });

  it('restores static uniform when binding is disconnected', () => {
    const snapshot = minimalSnapshot([note('n1', 0, 2)]);
    const graph = addMidiEnvelopeBinding(baseGraph(0.25), 'n1', 'amount', {
      trackIds: ['track-1'],
      envelope: binding.envelope,
      id: 'bind-1',
    });
    const prev = new Map<string, number>();

    collectMidiEnvelopeUniformUpdatesFromFrame(graph, 0.5, snapshot, prev, 1e-5, true);
    expect(prev.get('n1.amount')).toBeCloseTo(10, 5);

    const disconnected = unbindMidiEnvelopeBindingForParam(graph, 'n1', 'amount');
    const updates = collectMidiEnvelopeUniformUpdatesFromFrame(
      disconnected,
      0.5,
      snapshot,
      prev,
      1e-5,
      true
    );

    expect(updates).toHaveLength(1);
    expect(updates[0]).toEqual({ nodeId: 'n1', paramName: 'amount', value: 0.25 });
    expect(prev.has('n1.amount')).toBe(false);
  });

  it('collectMidiEnvelopeUniformUpdatesFromFrame reuses scratch buffer', () => {
    const snapshot = minimalSnapshot([note('n1', 0, 2)]);
    const graph = addMidiEnvelopeBinding(baseGraph(), 'n1', 'amount', {
      trackIds: ['track-1'],
      envelope: binding.envelope,
      id: 'bind-1',
    });
    const prev = new Map<string, number>();
    const scratch = getMidiEnvelopeUniformUpdatesScratchBufferForTests();

    const first = collectMidiEnvelopeUniformUpdatesFromFrame(graph, 0.5, snapshot, prev, 1e-5, true);
    const second = collectMidiEnvelopeUniformUpdatesFromFrame(graph, 0.5, snapshot, prev, 1e-5, true);

    expect(first).toBe(scratch);
    expect(second).toBe(scratch);
    expect(first[0]?.value).toBeCloseTo(10, 5);
  });

  it('shared preset with different remappers: same level, different frame values', () => {
    const snapshot = minimalSnapshot([note('n1', 0, 2)]);
    let graph = addMidiEnvelopeBinding(baseGraph(), 'n1', 'amount', {
      trackIds: ['track-1'],
      envelope: binding.envelope,
      id: 'bind-1',
      presetId: 'preset-1',
    });
    const presetId = graph.midiEnvelopePresets![0]!.id;
    graph = addMidiEnvelopeRemapper(graph, presetId, {
      id: 'remapper-wide',
    });
    graph.nodes[0]!.parameters.other = 0;
    graph = bindMidiEnvelopeRemapperToParam(graph, 'remapper-wide', 'n1', 'other', {
      bindingId: 'bind-2',
      outMin: 0,
      outMax: 20,
    });

    syncMidiEnvelopeFrame(graph, snapshot, 0.5, true);
    expect(getMidiEnvelopeFrameValue('n1', 'amount')).toBeCloseTo(10, 5);
    expect(getMidiEnvelopeFrameValue('n1', 'other')).toBeCloseTo(20, 5);
  });

  it('two bindings on one remapper: same gated level, different per-target Out', () => {
    const snapshot = minimalSnapshot([note('n1', 0, 2)]);
    let graph = addMidiEnvelopeBinding(baseGraph(), 'n1', 'amount', {
      trackIds: ['track-1'],
      envelope: binding.envelope,
      id: 'bind-1',
      presetId: 'preset-1',
    });
    const remapperId = graph.midiEnvelopeBindings![0]!.remapperId;
    graph.nodes[0]!.parameters.other = 0;
    graph = bindMidiEnvelopeRemapperToParam(graph, remapperId, 'n1', 'other', {
      bindingId: 'bind-2',
      outMin: 0,
      outMax: 20,
    });
    expect(graph.midiEnvelopeBindings!.every((b) => b.remapperId === remapperId)).toBe(true);

    syncMidiEnvelopeFrame(graph, snapshot, 0.5, true);
    expect(getMidiEnvelopeFrameValue('n1', 'amount')).toBeCloseTo(10, 5);
    expect(getMidiEnvelopeFrameValue('n1', 'other')).toBeCloseTo(20, 5);
    expect(getMidiEnvelopeFrameValueByBindingId('bind-1')).toBeCloseTo(10, 5);
    expect(getMidiEnvelopeFrameValueByBindingId('bind-2')).toBeCloseTo(20, 5);
  });

  it('skips disabled bindings in frame cache', () => {
    const snapshot = minimalSnapshot([note('n1', 0, 2)]);
    const graph = addMidiEnvelopeBinding(baseGraph(), 'n1', 'amount', {
      trackIds: ['track-1'],
      envelope: binding.envelope,
      id: 'bind-1',
    });
    const disabledGraph: NodeGraph = {
      ...graph,
      midiEnvelopeBindings: graph.midiEnvelopeBindings!.map((b) => ({ ...b, disabled: true })),
    };

    syncMidiEnvelopeFrame(disabledGraph, snapshot, 0.5, true);
    expect(getMidiEnvelopeFrameValue('n1', 'amount')).toBeUndefined();
    expect(getMidiEnvelopeFrameValueByBindingId('bind-1')).toBeUndefined();
  });

  it('matches direct evaluateMidiEnvelopeAtTime for multiple bindings', () => {
    const notes = Array.from({ length: 200 }, (_, i) => note(`n${i}`, i * 0.1, 0.5));
    const snapshot = minimalSnapshot(notes);
    let graph = addMidiEnvelopeBinding(baseGraph(), 'n1', 'amount', {
      trackIds: ['track-1'],
      envelope: binding.envelope,
      id: 'bind-1',
      presetId: 'preset-1',
    });
    const presetId = graph.midiEnvelopePresets![0]!.id;
    graph = bindMidiEnvelopePresetToParam(graph, presetId, 'n1', 'other', { bindingId: 'bind-2' });

    syncMidiEnvelopeFrame(graph, snapshot, 12.05, true);
    for (const b of graph.midiEnvelopeBindings ?? []) {
      const resolved = resolveMidiEnvelopeBinding(graph, b);
      expect(resolved).toBeDefined();
      expect(getMidiEnvelopeFrameValueByBindingId(b.id)).toBeCloseTo(
        evaluateMidiEnvelopeAtTime(snapshot, resolved!, 12.05),
        6
      );
    }
  });
});

describe('findActiveNoteInSortedFilteredNotes', () => {
  it('matches linear scan on sorted notes', () => {
    const notes = [
      note('a', 0, 2),
      note('b', 1, 2),
      note('c', 1, 2, 1, 'track-2'),
      note('d', 3, 1),
    ];

    for (let t = 0; t <= 4; t += 0.25) {
      let linear: ArrangementNote | null = null;
      for (const n of notes) {
        if (n.startSeconds > t) continue;
        if (!linear || n.startSeconds > linear.startSeconds) {
          linear = n;
        }
      }
      expect(findActiveNoteInSortedFilteredNotes(notes, t)?.id).toBe(linear?.id ?? null);
      expect(findActiveNoteForBinding([...notes], t)?.id).toBe(linear?.id ?? null);
    }
  });

  it('picks first note among equal startSeconds (legacy policy)', () => {
    const notes = [note('first', 1, 2), note('second', 1, 2)];
    expect(findActiveNoteInSortedFilteredNotes(notes, 1.5)?.id).toBe('first');
  });
});
