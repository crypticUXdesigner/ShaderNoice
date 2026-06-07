import { describe, expect, it } from 'vitest';
import type { NodeGraph } from './types';
import { serializeGraph, deserializeGraph, deserializeGraphUnvalidated } from './serialization';
import type { NodeSpecification } from './validation';
import {
  addMidiEnvelopeBinding,
  updateMidiEnvelopePreset,
} from './immutableUpdatesMidiEnvelope';
import type { MidiEnvelopeRetriggerPolicy } from './midiEnvelopeTypes';
import { resolveMidiEnvelopeRetriggerPolicy } from './midiEnvelopeTypes';

const nodeSpecs: NodeSpecification[] = [
  {
    id: 'constant-float',
    inputs: [],
    outputs: [{ name: 'out', type: 'float' }],
    parameters: [{ name: 'value', type: 'float', default: 0, min: 0, max: 1 }],
  },
];

function baseGraph(): NodeGraph {
  return {
    id: 'graph-1',
    name: 'Test',
    version: '2.0',
    nodes: [
      {
        id: 'n1',
        type: 'constant-float',
        parameters: { value: 0.5 },
        position: { x: 0, y: 0 },
      },
    ],
    connections: [],
  };
}

describe('MidiEnvelopeRetriggerPolicy model', () => {
  it('omits retriggerPolicy on new presets (implicit lastNoteWins)', () => {
    const graph = addMidiEnvelopeBinding(baseGraph(), 'n1', 'value');
    const preset = graph.midiEnvelopePresets![0]!;
    expect(preset.retriggerPolicy).toBeUndefined();
    expect(resolveMidiEnvelopeRetriggerPolicy(preset.retriggerPolicy)).toBe('lastNoteWins');
  });

  it('round-trips all three policies', () => {
    const policies: MidiEnvelopeRetriggerPolicy[] = [
      'lastNoteWins',
      'holdIfHigher',
      'legato',
    ];
    for (const retriggerPolicy of policies) {
      let graph = addMidiEnvelopeBinding(baseGraph(), 'n1', 'value');
      const presetId = graph.midiEnvelopePresets![0]!.id;
      graph = updateMidiEnvelopePreset(graph, presetId, { retriggerPolicy });
      const json = serializeGraph(graph);
      const loaded = deserializeGraphUnvalidated(json).graph!;
      expect(loaded.midiEnvelopePresets![0]!.retriggerPolicy).toBe(retriggerPolicy);
    }
  });

  it('drops unknown retriggerPolicy strings on deserialize', () => {
    const graph = addMidiEnvelopeBinding(baseGraph(), 'n1', 'value');
    const json = serializeGraph(graph);
    const parsed = JSON.parse(json) as {
      graph: { midiEnvelopePresets: { retriggerPolicy?: string }[] };
    };
    parsed.graph.midiEnvelopePresets[0]!.retriggerPolicy = 'polyphonic';
    const loaded = deserializeGraph(JSON.stringify(parsed), nodeSpecs).graph!;
    expect(loaded.midiEnvelopePresets![0]!.retriggerPolicy).toBeUndefined();
  });

  it('updateMidiEnvelopePreset preserves policy on copy paths', () => {
    let graph = addMidiEnvelopeBinding(baseGraph(), 'n1', 'value');
    const presetId = graph.midiEnvelopePresets![0]!.id;
    graph = updateMidiEnvelopePreset(graph, presetId, { retriggerPolicy: 'legato' });
    graph = updateMidiEnvelopePreset(graph, presetId, {
      trackIds: [...graph.midiEnvelopePresets![0]!.trackIds, 'track-b'],
    });
    expect(graph.midiEnvelopePresets![0]!.retriggerPolicy).toBe('legato');
  });
});
