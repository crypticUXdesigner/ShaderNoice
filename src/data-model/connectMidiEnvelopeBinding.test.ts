import { describe, expect, it } from 'vitest';
import type { NodeGraph } from './types';
import {
  addMidiEnvelopeBinding,
  connectMidiEnvelopeBindingToParam,
  connectMidiEnvelopeRemapperToParam,
  connectMidiEnvelopePresetToParam,
  findMidiEnvelopeBindingForParam,
  findMidiEnvelopePreset,
  findMidiEnvelopeRemapper,
  unbindMidiEnvelopeBindingForParam,
} from './immutableUpdatesMidiEnvelope';
import { defaultRemapperIdForPreset } from './midiEnvelopeRemapperMigration';

function baseGraph(overrides: Partial<NodeGraph> = {}): NodeGraph {
  return {
    id: 'g1',
    name: 'Test',
    version: '2.0',
    nodes: [
      { id: 'n1', type: 'test', parameters: {}, position: { x: 0, y: 0 } },
      { id: 'n2', type: 'test', parameters: {}, position: { x: 0, y: 0 } },
    ],
    connections: [],
    viewState: { zoom: 1, panX: 0, panY: 0, selectedNodeIds: [] },
    ...overrides,
  };
}

describe('connectMidiEnvelopeBindingToParam', () => {
  it('connects a library preset after the prior binding was removed', () => {
    let graph = addMidiEnvelopeBinding(baseGraph(), 'n1', 'width', {
      trackIds: ['t1'],
    });
    const presetId = graph.midiEnvelopePresets![0]!.id;
    graph = unbindMidiEnvelopeBindingForParam(graph, 'n1', 'width');
    expect(findMidiEnvelopeBindingForParam(graph, 'n1', 'width')).toBeUndefined();
    expect(findMidiEnvelopePreset(graph, presetId)?.trackIds).toEqual(['t1']);

    const next = connectMidiEnvelopePresetToParam(graph, presetId, 'n2', 'height');
    const onTarget = findMidiEnvelopeBindingForParam(next, 'n2', 'height');
    expect(onTarget?.remapperId).toBe(defaultRemapperIdForPreset(presetId));
    expect(findMidiEnvelopePreset(next, presetId)?.trackIds).toEqual(['t1']);
  });

  it('shares one preset across two parameters without cloning ADSR', () => {
    const graph = addMidiEnvelopeBinding(baseGraph(), 'n1', 'width', {
      trackIds: ['t1'],
      envelope: {
        adsr: { attackSeconds: 0.1, decaySeconds: 0.2, sustainLevel: 0.5, releaseSeconds: 0.3 },
        outMin: 0,
        outMax: 2,
      },
    });
    const source = findMidiEnvelopeBindingForParam(graph, 'n1', 'width')!;
    const next = connectMidiEnvelopeBindingToParam(graph, source.id, 'n2', 'height');
    expect(findMidiEnvelopeBindingForParam(next, 'n1', 'width')?.remapperId).toBe(
      source.remapperId
    );
    const second = findMidiEnvelopeBindingForParam(next, 'n2', 'height');
    expect(second).toBeDefined();
    expect(second!.id).not.toBe(source.id);
    expect(second!.remapperId).toBe(source.remapperId);
    const presetId = findMidiEnvelopeRemapper(next, source.remapperId)!.envelopePresetId;
    expect(findMidiEnvelopePreset(next, presetId)?.trackIds).toEqual(['t1']);
    expect(findMidiEnvelopeRemapper(next, source.remapperId)?.outMax).toBe(2);
    expect(next.midiEnvelopePresets).toHaveLength(1);
  });

  it('connectMidiEnvelopePresetToParam is a no-op when already connected', () => {
    const graph = addMidiEnvelopeBinding(baseGraph(), 'n1', 'width');
    const presetId = graph.midiEnvelopePresets![0]!.id;
    const next = connectMidiEnvelopePresetToParam(graph, presetId, 'n1', 'width');
    expect(next).toBe(graph);
  });

  it('connectMidiEnvelopeRemapperToParam shares remapper without source binding id', () => {
    const graph = addMidiEnvelopeBinding(baseGraph(), 'n1', 'width');
    const remapperId = graph.midiEnvelopeBindings![0]!.remapperId;
    const next = connectMidiEnvelopeRemapperToParam(graph, remapperId, 'n2', 'height');
    expect(findMidiEnvelopeBindingForParam(next, 'n2', 'height')?.remapperId).toBe(remapperId);
    expect(next.midiEnvelopeBindings).toHaveLength(2);
  });
});
