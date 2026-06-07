import { describe, expect, it } from 'vitest';
import type { NodeGraph } from '../data-model/types';
import {
  addMidiEnvelopeBinding,
  updateMidiEnvelopePreset,
  updateMidiEnvelopeRemapper,
} from '../data-model/immutableUpdatesMidiEnvelope';
import { midiEnvelopeDriverConfigChanged } from './midiEnvelopeDriverConfig';

function baseGraph(): NodeGraph {
  return {
    id: 'g',
    name: 'g',
    version: '2.0',
    nodes: [{ id: 'n1', type: 'test', parameters: {}, position: { x: 0, y: 0 } }],
    connections: [],
  };
}

describe('midiEnvelopeDriverConfigChanged', () => {
  it('returns false when old graph is null', () => {
    const graph = addMidiEnvelopeBinding(baseGraph(), 'n1', 'amount');
    expect(midiEnvelopeDriverConfigChanged(null, graph)).toBe(false);
  });

  it('returns true when presets array ref changes', () => {
    const graph = addMidiEnvelopeBinding(baseGraph(), 'n1', 'amount', { presetId: 'preset-1' });
    const presetId = graph.midiEnvelopePresets![0]!.id;
    const updated = updateMidiEnvelopePreset(graph, presetId, {
      envelope: {
        adsr: { attackSeconds: 0, decaySeconds: 0, sustainLevel: 1, releaseSeconds: 1 },
      },
    });
    expect(midiEnvelopeDriverConfigChanged(graph, updated)).toBe(true);
  });

  it('returns true when remappers array ref changes', () => {
    const graph = addMidiEnvelopeBinding(baseGraph(), 'n1', 'amount');
    const remapperId = graph.midiEnvelopeRemappers![0]!.id;
    const updated = updateMidiEnvelopeRemapper(graph, remapperId, { inMin: 0.3, inMax: 1 });
    expect(midiEnvelopeDriverConfigChanged(graph, updated)).toBe(true);
  });

  it('returns false for view-only graph spread', () => {
    const graph = addMidiEnvelopeBinding(baseGraph(), 'n1', 'amount');
    const panned = { ...graph, viewState: { zoom: 2, panX: 10, panY: 20 } };
    expect(midiEnvelopeDriverConfigChanged(graph, panned)).toBe(false);
  });
});
