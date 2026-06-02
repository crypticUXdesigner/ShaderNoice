import { describe, expect, it } from 'vitest';
import type { NodeGraph } from '../data-model/types';
import type { NodeSpec } from '../types/nodeSpec';
import {
  addMidiEnvelopeBinding,
  bindMidiEnvelopeRemapperToParam,
} from '../data-model/immutableUpdatesMidiEnvelope';
import { defaultRemapperIdForPreset } from '../data-model/midiEnvelopeRemapperMigration';
import { getMidiEnvelopeRemapperConnections } from './getMidiEnvelopeRemapperConnections';

function baseGraph(): NodeGraph {
  return {
    id: 'g1',
    name: 'Test',
    version: '2.0',
    nodes: [
      { id: 'n-sphere', type: 'sphere', position: { x: 0, y: 0 }, parameters: {} },
      { id: 'n-box', type: 'box', position: { x: 0, y: 0 }, parameters: {} },
    ],
    connections: [],
    viewState: { zoom: 1, panX: 0, panY: 0, selectedNodeIds: [] },
  };
}

describe('getMidiEnvelopeRemapperConnections', () => {
  it('returns sorted labels as Param (Node)', () => {
    let graph = addMidiEnvelopeBinding(baseGraph(), 'n-sphere', 'radius', {
      trackIds: ['t1'],
    });
    const presetId = graph.midiEnvelopePresets![0]!.id;
    const remapperId = defaultRemapperIdForPreset(presetId);
    graph = bindMidiEnvelopeRemapperToParam(graph, remapperId, 'n-box', 'size');

    const nodeSpecs = new Map<string, NodeSpec>([
      [
        'sphere',
        {
          id: 'sphere',
          displayName: 'Sphere',
          category: 'shape',
          parameters: { radius: { type: 'float', label: 'Radius', default: 1 } },
        } as NodeSpec,
      ],
      [
        'box',
        {
          id: 'box',
          displayName: 'Box',
          category: 'shape',
          parameters: { size: { type: 'float', label: 'Size', default: 1 } },
        } as NodeSpec,
      ],
    ]);

    const targets = getMidiEnvelopeRemapperConnections(graph, remapperId, nodeSpecs);
    expect(targets.map((t) => t.label)).toEqual(['Radius (Sphere)', 'Size (Box)']);
  });
});
