import { describe, expect, it } from 'vitest';
import type { NodeGraph } from './types';
import { serializeGraph, deserializeGraph, deserializeGraphUnvalidated } from './serialization';
import type { NodeSpecification } from './validation';
import { DEFAULT_MIDI_ENVELOPE_ADSR } from './midiEnvelopeTypes';
import { defaultRemapperIdForPreset } from './midiEnvelopeRemapperMigration';
import { addMidiEnvelopeBinding } from './immutableUpdatesMidiEnvelope';
import { validateMidiEnvelopeBindingsAgainstSnapshot } from './validation';
import type { ArrangementSnapshot } from '../audiotool/arrangement/types';

function baseGraph(): NodeGraph {
  return {
    id: 'graph-1',
    name: 'Test',
    version: '2.0',
    nodes: [{ id: 'n1', type: 'constant-float', parameters: { value: 0.5 }, position: { x: 0, y: 0 } }],
    connections: [],
  };
}

const nodeSpecs: NodeSpecification[] = [
  {
    id: 'constant-float',
    inputs: [],
    outputs: [{ name: 'out', type: 'float' }],
    parameters: [{ name: 'value', type: 'float', default: 0, min: 0, max: 1 }],
  },
];

const snapshot: ArrangementSnapshot = {
  tracks: [
    { id: 'track-a', kind: 'note', orderAmongTracks: 0, enabled: true },
    { id: 'track-b', kind: 'note', orderAmongTracks: 1, enabled: true },
  ],
  regions: [],
  notes: [],
  bpm: 120,
  durationSeconds: 30,
  timeSignature: { numerator: 4, denominator: 4 },
  source: { trackName: 'tracks/t', projectName: 'projects/p', commitIndex: 1 },
};

describe('MIDI envelope serialization', () => {
  it('round-trips bindings on the graph', () => {
    const graph = addMidiEnvelopeBinding(baseGraph(), 'n1', 'value', {
      trackIds: ['track-a'],
      envelope: {
        adsr: { attackSeconds: 0.01, decaySeconds: 0.05, sustainLevel: 0.8, releaseSeconds: 0.1 },
        outMin: 0.2,
        outMax: 0.9,
        velocityToPeak: false,
      },
    });
    const json = serializeGraph(graph);
    const result = deserializeGraphUnvalidated(json);
    expect(result.errors).toHaveLength(0);
    expect(result.graph?.midiEnvelopePresets).toHaveLength(1);
    expect(result.graph?.midiEnvelopeBindings).toHaveLength(1);
    const b = result.graph!.midiEnvelopeBindings![0]!;
    expect(b.nodeId).toBe('n1');
    expect(b.paramName).toBe('value');
    const preset = result.graph!.midiEnvelopePresets![0]!;
    const remapper = result.graph!.midiEnvelopeRemappers!.find(
      (r) => r.id === defaultRemapperIdForPreset(preset.id)
    )!;
    expect(preset.trackIds).toEqual(['track-a']);
    expect(preset.envelope).not.toHaveProperty('outMin');
    expect(remapper.outMin).toBe(0.2);
    expect(remapper.outMax).toBe(0.9);
    expect(preset.envelope.velocityToPeak).toBe(false);
  });

  it('round-trips per-phase curve fields on adsr', () => {
    const graph = addMidiEnvelopeBinding(baseGraph(), 'n1', 'value', {
      trackIds: ['track-a'],
      envelope: {
        adsr: {
          attackSeconds: 0.02,
          decaySeconds: 0.1,
          sustainLevel: 0.6,
          releaseSeconds: 0.2,
          attackCurve: 'exponential',
          decayCurve: 'logarithmic',
          releaseCurve: 'smooth',
        },
        outMin: 0,
        outMax: 1,
      },
    });
    const result = deserializeGraphUnvalidated(serializeGraph(graph));
    const adsr = result.graph!.midiEnvelopePresets![0]!.envelope.adsr;
    expect(adsr.attackCurve).toBe('exponential');
    expect(adsr.decayCurve).toBe('logarithmic');
    expect(adsr.releaseCurve).toBe('smooth');
  });

  it('sustainHoldUsesNoteLength false round-trips; true/omitted omit field', () => {
    const graphDecayOnly = addMidiEnvelopeBinding(baseGraph(), 'n1', 'value', {
      envelope: {
        adsr: {
          ...DEFAULT_MIDI_ENVELOPE_ADSR,
          sustainHoldUsesNoteLength: false,
        },
        outMin: 0,
        outMax: 1,
      },
    });
    const decayOnly = deserializeGraphUnvalidated(serializeGraph(graphDecayOnly)).graph!
      .midiEnvelopePresets![0]!.envelope.adsr;
    expect(decayOnly.sustainHoldUsesNoteLength).toBe(false);

    const graphDefault = addMidiEnvelopeBinding(baseGraph(), 'n1', 'value');
    const defaultAdsr = deserializeGraphUnvalidated(serializeGraph(graphDefault)).graph!
      .midiEnvelopePresets![0]!.envelope.adsr;
    expect(defaultAdsr.sustainHoldUsesNoteLength).toBeUndefined();
  });

  it('unknown curve strings deserialize as linear (fields omitted)', () => {
    const graph = addMidiEnvelopeBinding(baseGraph(), 'n1', 'value');
    const json = serializeGraph(graph);
    const parsed = JSON.parse(json) as {
      graph: { midiEnvelopePresets: { envelope: { adsr: object } }[] };
    };
    parsed.graph.midiEnvelopePresets[0]!.envelope.adsr = {
      attackSeconds: 0.02,
      decaySeconds: 0.1,
      sustainLevel: 0.6,
      releaseSeconds: 0.2,
      attackCurve: 'bezier',
      decayCurve: 123,
    };
    const result = deserializeGraph(JSON.stringify(parsed), nodeSpecs);
    expect(result.errors).toHaveLength(0);
    const adsr = result.graph!.midiEnvelopePresets![0]!.envelope.adsr;
    expect(adsr.attackCurve).toBeUndefined();
    expect(adsr.decayCurve).toBeUndefined();
  });

  it('warns when binding track id missing from snapshot', () => {
    const graph = addMidiEnvelopeBinding(baseGraph(), 'n1', 'value', {
      trackIds: ['missing-track'],
    });
    const warnings = validateMidiEnvelopeBindingsAgainstSnapshot(graph, snapshot);
    expect(warnings.some((w) => w.includes('missing-track'))).toBe(true);
  });
});
