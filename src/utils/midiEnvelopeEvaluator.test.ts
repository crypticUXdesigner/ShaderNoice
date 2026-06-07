import { describe, expect, it } from 'vitest';
import type { ArrangementNote, ArrangementSnapshot } from '../audiotool/arrangement/types';
import type { ResolvedMidiEnvelopeBinding } from '../data-model/midiEnvelopeTypes';
import {
  computeAdsrLevelAtTime,
  evaluateMidiEnvelopeAtTime,
  evaluateMidiEnvelopeLevelAtTime,
  evaluateMidiEnvelopeLevelForPresetAtTime,
  evaluateMidiEnvelopePresetLevelAtTime,
  findActiveNoteForBinding,
  getMidiEnvelopeValueForParam,
  remapMidiEnvelopeBindingOutput,
  remapMidiEnvelopeOutput,
  resolveMidiEnvelopeReleaseStartSeconds,
} from './midiEnvelopeEvaluator';
import type { NodeGraph, NodeInstance } from '../data-model/types';
import {
  addMidiEnvelopeBinding,
  addMidiEnvelopeRemapper,
  bindMidiEnvelopeRemapperToParam,
  resolveMidiEnvelopeBinding,
} from '../data-model/immutableUpdatesMidiEnvelope';

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

describe('midiEnvelopeEvaluator', () => {
  it('findActiveNoteForBinding picks last-note-wins', () => {
    const notes = [note('a', 0, 2), note('b', 1, 2)];
    expect(findActiveNoteForBinding(notes, 0.5)?.id).toBe('a');
    expect(findActiveNoteForBinding(notes, 1.5)?.id).toBe('b');
  });

  it('computeAdsrLevelAtTime reaches peak after instant attack', () => {
    const level = computeAdsrLevelAtTime(0, 0, 1, instantAdsr, 1);
    expect(level).toBe(1);
  });

  it('computeAdsrLevelAtTime decays during release after note-off', () => {
    const adsr = { ...instantAdsr, releaseSeconds: 0.4 };
    const midRelease = computeAdsrLevelAtTime(1.2, 0, 1, adsr, 1);
    expect(midRelease).toBeCloseTo(0.5, 5);
    expect(computeAdsrLevelAtTime(1.5, 0, 1, adsr, 1)).toBeCloseTo(0, 5);
  });

  it('release starts after decay when sustainHoldUsesNoteLength is false', () => {
    const adsr = {
      attackSeconds: 0.1,
      decaySeconds: 0.2,
      sustainLevel: 1,
      releaseSeconds: 0.4,
      sustainHoldUsesNoteLength: false,
    };
    expect(resolveMidiEnvelopeReleaseStartSeconds(0, 10, adsr)).toBeCloseTo(0.3, 5);
    expect(computeAdsrLevelAtTime(0.25, 0, 10, adsr, 1)).toBeCloseTo(1, 5);
    expect(computeAdsrLevelAtTime(0.35, 0, 10, adsr, 1)).toBeCloseTo(0.875, 3);
    expect(computeAdsrLevelAtTime(0.7, 0, 10, adsr, 1)).toBeCloseTo(0, 5);
  });

  it('short notes still release at note-off when sustain hold ignores note length', () => {
    const adsr = {
      attackSeconds: 0.1,
      decaySeconds: 0.2,
      sustainLevel: 1,
      releaseSeconds: 0.4,
      sustainHoldUsesNoteLength: false,
    };
    expect(resolveMidiEnvelopeReleaseStartSeconds(0, 0.05, adsr)).toBeCloseTo(0.05, 5);
    expect(computeAdsrLevelAtTime(0.04, 0, 0.05, adsr, 1)).toBeLessThan(1);
  });

  it('evaluateMidiEnvelopeAtTime remaps outMin/outMax', () => {
    const snapshot = minimalSnapshot([note('n1', 0, 2)]);
    const value = evaluateMidiEnvelopeAtTime(snapshot, binding, 0.5);
    expect(value).toBeCloseTo(10, 5);
  });

  it('velocity scales peak when velocityToPeak is true', () => {
    const snapshot = minimalSnapshot([note('n1', 0, 2, 0.5)]);
    const level = evaluateMidiEnvelopeLevelAtTime(snapshot, binding, 0.5);
    expect(level).toBeCloseTo(1, 5);
    const value = evaluateMidiEnvelopeAtTime(snapshot, binding, 0.5);
    expect(value).toBeCloseTo(5, 5);
  });

  it('last-note-wins retriggers attack on newer note', () => {
    const attackBinding: ResolvedMidiEnvelopeBinding = {
      ...binding,
      envelope: {
        ...binding.envelope,
        adsr: { attackSeconds: 0.2, decaySeconds: 0, sustainLevel: 1, releaseSeconds: 0 },
      },
    };
    const snapshot = minimalSnapshot([note('a', 0, 4), note('b', 1, 4)]);
    const atFirstAttack = evaluateMidiEnvelopeLevelAtTime(snapshot, attackBinding, 1.05);
    expect(atFirstAttack).toBeCloseTo(0.25, 2);
  });

  it('returns silence before first note and without snapshot', () => {
    const snapshot = minimalSnapshot([note('n1', 2, 1)]);
    expect(evaluateMidiEnvelopeLevelAtTime(snapshot, binding, 0.5)).toBe(0);
    expect(evaluateMidiEnvelopeAtTime(undefined, binding, 1)).toBe(0);
  });

  it('empty trackIds produces silence even when notes exist', () => {
    const snapshot = minimalSnapshot([note('n1', 0, 2)]);
    const emptyTracksBinding: ResolvedMidiEnvelopeBinding = { ...binding, trackIds: [] };
    expect(evaluateMidiEnvelopeLevelAtTime(snapshot, emptyTracksBinding, 0.5)).toBe(0);
  });

  it('inMin gate suppresses output below half envelope', () => {
    const gatedEnvelope = { ...binding.envelope, inMin: 0.5, inMax: 1 };
    const atQuarter = remapMidiEnvelopeBindingOutput({ shape: 0.25, peak: 1 }, gatedEnvelope);
    const atThreeQuarter = remapMidiEnvelopeBindingOutput({ shape: 0.75, peak: 1 }, gatedEnvelope);
    expect(atQuarter).toBe(0);
    expect(atThreeQuarter).toBeCloseTo(5, 5);
  });

  it('remapMidiEnvelopeOutput clamps like audio remappers', () => {
    expect(remapMidiEnvelopeOutput(0.5, 0, 4)).toBe(2);
    expect(remapMidiEnvelopeOutput(-1, 0, 4)).toBe(0);
  });

  it('shared preset with different remappers yields same level, different output', () => {
    const snapshot = minimalSnapshot([note('n1', 0, 2, 0.5)]);
    const envelope = binding.envelope;
    const level = evaluateMidiEnvelopeLevelForPresetAtTime(
      snapshot,
      binding.trackIds,
      envelope,
      0.5
    );
    expect(level).toBeCloseTo(1, 5);

    const narrow = remapMidiEnvelopeBindingOutput({ shape: level, peak: 0.5 }, envelope);
    const wide = remapMidiEnvelopeBindingOutput(
      { shape: level, peak: 0.5 },
      { ...envelope, outMax: 20 }
    );
    expect(narrow).toBeCloseTo(5, 5);
    expect(wide).toBeCloseTo(10, 5);
  });

  it('two bindings on same preset evaluate via remapper ranges', () => {
    const snapshot = minimalSnapshot([note('n1', 0, 2)]);
    let graph: NodeGraph = {
      id: 'g',
      name: 'g',
      version: '2.0',
      nodes: [
        {
          id: 'n1',
          type: 'test',
          parameters: { a: 0, b: 0 },
          position: { x: 0, y: 0 },
        },
      ],
      connections: [],
    };
    graph = addMidiEnvelopeBinding(graph, 'n1', 'a', {
      trackIds: ['track-1'],
      envelope: binding.envelope,
      id: 'bind-a',
      presetId: 'preset-1',
    });
    const presetId = graph.midiEnvelopePresets![0]!.id;
    graph = addMidiEnvelopeRemapper(graph, presetId, {
      id: 'remapper-wide',
    });
    graph = bindMidiEnvelopeRemapperToParam(graph, 'remapper-wide', 'n1', 'b', {
      bindingId: 'bind-b',
      outMin: 0,
      outMax: 20,
    });

    const resolvedA = resolveMidiEnvelopeBinding(graph, graph.midiEnvelopeBindings![0]!)!;
    const resolvedB = resolveMidiEnvelopeBinding(graph, graph.midiEnvelopeBindings![1]!)!;
    const levelA = evaluateMidiEnvelopeLevelAtTime(snapshot, resolvedA, 0.5);
    const levelB = evaluateMidiEnvelopeLevelAtTime(snapshot, resolvedB, 0.5);
    expect(levelA).toBeCloseTo(levelB, 6);

    const valueA = evaluateMidiEnvelopeAtTime(snapshot, resolvedA, 0.5);
    const valueB = evaluateMidiEnvelopeAtTime(snapshot, resolvedB, 0.5);
    expect(valueA).toBeCloseTo(10, 5);
    expect(valueB).toBeCloseTo(20, 5);
  });

  it('linear curve fields omitted match legacy linear ADSR output', () => {
    const adsr = {
      attackSeconds: 0.1,
      decaySeconds: 0.2,
      sustainLevel: 0.5,
      releaseSeconds: 0.3,
    };
    const explicitLinear = {
      ...adsr,
      attackCurve: 'linear' as const,
      decayCurve: 'linear' as const,
      releaseCurve: 'linear' as const,
    };
    const t = 0.05;
    expect(computeAdsrLevelAtTime(t, 0, 2, adsr, 1)).toBe(
      computeAdsrLevelAtTime(t, 0, 2, explicitLinear, 1)
    );
  });

  it('exponential attack reaches 50% level later than linear', () => {
    const linear = {
      attackSeconds: 0.2,
      decaySeconds: 0,
      sustainLevel: 1,
      releaseSeconds: 0,
    };
    const exponential = { ...linear, attackCurve: 'exponential' as const };
    const atHalfAttack = 0.1;
    const linearLevel = computeAdsrLevelAtTime(atHalfAttack, 0, 2, linear, 1);
    const expLevel = computeAdsrLevelAtTime(atHalfAttack, 0, 2, exponential, 1);
    expect(linearLevel).toBeCloseTo(0.5, 5);
    expect(expLevel).toBeLessThan(0.5);
  });

  it('logarithmic release mid-point differs from linear', () => {
    const linear = {
      attackSeconds: 0,
      decaySeconds: 0,
      sustainLevel: 1,
      releaseSeconds: 0.4,
    };
    const logarithmic = { ...linear, releaseCurve: 'logarithmic' as const };
    const linearMid = computeAdsrLevelAtTime(1.2, 0, 1, linear, 1);
    const logMid = computeAdsrLevelAtTime(1.2, 0, 1, logarithmic, 1);
    expect(linearMid).toBeCloseTo(0.5, 5);
    expect(logMid).not.toBeCloseTo(linearMid, 3);
    expect(logMid).toBeLessThan(linearMid);
  });

  describe('retriggerPolicy', () => {
    const overlapAdsr = {
      attackSeconds: 0.2,
      decaySeconds: 0,
      sustainLevel: 1,
      releaseSeconds: 2,
    };
    const overlapEnvelope = { adsr: overlapAdsr, velocityToPeak: true };
    const overlapNotes = [note('a', 0, 4), note('b', 1, 4)];

    it('lastNoteWins retriggers attack on newer note (baseline)', () => {
      const level = evaluateMidiEnvelopePresetLevelAtTime(
        overlapNotes,
        overlapEnvelope,
        1.05,
        'lastNoteWins'
      ).shape;
      expect(level).toBeCloseTo(0.25, 2);
    });

    it('holdIfHigher keeps prior release level when new attack is lower', () => {
      const lastWins = evaluateMidiEnvelopePresetLevelAtTime(
        overlapNotes,
        overlapEnvelope,
        1.05,
        'lastNoteWins'
      ).shape;
      const hold = evaluateMidiEnvelopePresetLevelAtTime(
        overlapNotes,
        overlapEnvelope,
        1.05,
        'holdIfHigher'
      ).shape;
      expect(hold).toBeGreaterThan(lastWins);
      expect(hold).toBeCloseTo(1, 2);
    });

    it('legato skips attack dip when prior is past attack', () => {
      const lastWins = evaluateMidiEnvelopePresetLevelAtTime(
        overlapNotes,
        overlapEnvelope,
        1.05,
        'lastNoteWins'
      ).shape;
      const legato = evaluateMidiEnvelopePresetLevelAtTime(
        overlapNotes,
        overlapEnvelope,
        1.05,
        'legato'
      ).shape;
      expect(legato).toBeGreaterThan(lastWins);
      expect(legato).toBeCloseTo(1, 2);
    });

    it('legato falls back to lastNoteWins when prior is still in attack', () => {
      const fastAttackNotes = [note('a', 0, 4), note('b', 0.05, 4)];
      const lastWins = evaluateMidiEnvelopePresetLevelAtTime(
        fastAttackNotes,
        overlapEnvelope,
        0.1,
        'lastNoteWins'
      ).shape;
      const legato = evaluateMidiEnvelopePresetLevelAtTime(
        fastAttackNotes,
        overlapEnvelope,
        0.1,
        'legato'
      ).shape;
      expect(legato).toBeCloseTo(lastWins, 5);
    });

    it('omitted policy matches lastNoteWins', () => {
      const implicit = evaluateMidiEnvelopePresetLevelAtTime(
        overlapNotes,
        overlapEnvelope,
        1.05
      ).shape;
      const explicit = evaluateMidiEnvelopePresetLevelAtTime(
        overlapNotes,
        overlapEnvelope,
        1.05,
        'lastNoteWins'
      ).shape;
      expect(implicit).toBeCloseTo(explicit, 6);
    });
  });

  it('getMidiEnvelopeValueForParam returns null without binding or snapshot', () => {
    const node: NodeInstance = {
      id: 'n1',
      type: 'test',
      parameters: {},
      position: { x: 0, y: 0 },
    };
    const graph: NodeGraph = {
      id: 'g',
      name: 'g',
      version: '2.0',
      nodes: [node],
      connections: [],
    };
    expect(getMidiEnvelopeValueForParam(node, 'amount', graph, 1, minimalSnapshot([]))).toBeNull();

    const withBinding = addMidiEnvelopeBinding(graph, 'n1', 'amount');
    expect(
      getMidiEnvelopeValueForParam(node, 'amount', withBinding, 1, undefined)
    ).toBeNull();
  });
});
