import { describe, expect, it } from 'vitest';
import type { NodeGraph } from '../data-model/types';
import type { AudioSetup } from '../data-model/audioSetupTypes';
import {
  detachAnimationDriverForParam,
  detachAudioDriverForParam,
  prepareGraphForAnimationDriverAttach,
  prepareGraphForAudioDriverAttach,
  findAudioDriverConnection,
  findAutomationLaneForParam,
} from './parameterDriverAttach';
import { addMidiEnvelopeBinding } from '../data-model/immutableUpdatesMidiEnvelope';
import { getVirtualNodeId } from './virtualNodes';

const emptyAudioSetup: AudioSetup = { files: [], bands: [], remappers: [] };

function baseGraph(overrides: Partial<NodeGraph> = {}): NodeGraph {
  return {
    id: 'graph-test',
    name: 'Test',
    version: '2.0',
    nodes: [{ id: 'n1', type: 'test', parameters: {}, position: { x: 0, y: 0 } }],
    connections: [],
    viewState: { zoom: 1, panX: 0, panY: 0, selectedNodeIds: [] },
    ...overrides,
  };
}

const evaluableLane = {
  id: 'lane-1',
  nodeId: 'n1',
  paramName: 'amount',
  regions: [
    {
      id: 'region-1',
      startTime: 0,
      duration: 10,
      loop: false,
      curve: { keyframes: [{ time: 0, value: 0 }, { time: 1, value: 1 }] },
    },
  ],
};

describe('parameterDriverAttach', () => {
  it('findAudioDriverConnection returns virtual-node wire only', () => {
    const virtualNodeId = getVirtualNodeId('remap-r1');
    const graph = baseGraph({
      connections: [
        {
          id: 'c-audio',
          sourceNodeId: virtualNodeId,
          sourcePort: 'out',
          targetNodeId: 'n1',
          targetParameter: 'amount',
        },
        {
          id: 'c-graph',
          sourceNodeId: 'src',
          sourcePort: 'out',
          targetNodeId: 'n1',
          targetParameter: 'other',
        },
      ],
    });
    expect(findAudioDriverConnection(graph, 'n1', 'amount')?.id).toBe('c-audio');
    expect(findAudioDriverConnection(graph, 'n1', 'other')).toBeUndefined();
  });

  it('prepareGraphForAudioDriverAttach removes automation lane for param', () => {
    const graph = baseGraph({
      automation: { bpm: 120, durationSeconds: 10, lanes: [evaluableLane] },
    });
    expect(findAutomationLaneForParam(graph, 'n1', 'amount')).toBeDefined();
    const next = prepareGraphForAudioDriverAttach(graph, 'n1', 'amount');
    expect(findAutomationLaneForParam(next, 'n1', 'amount')).toBeUndefined();
    expect(next.automation?.lanes).toHaveLength(0);
  });

  it('prepareGraphForAudioDriverAttach unbinds MIDI envelope for param', () => {
    const graph = addMidiEnvelopeBinding(baseGraph(), 'n1', 'amount');
    const next = prepareGraphForAudioDriverAttach(graph, 'n1', 'amount');
    expect(next.midiEnvelopePresets).toHaveLength(1);
    expect(next.midiEnvelopeBindings).toBeUndefined();
  });

  it('prepareGraphForAnimationDriverAttach removes audio driver only', () => {
    const virtualNodeId = getVirtualNodeId('remap-r1');
    const graph = baseGraph({
      connections: [
        {
          id: 'c-audio',
          sourceNodeId: virtualNodeId,
          sourcePort: 'out',
          targetNodeId: 'n1',
          targetParameter: 'amount',
        },
        {
          id: 'c-graph',
          sourceNodeId: 'src',
          sourcePort: 'out',
          targetNodeId: 'n1',
          targetParameter: 'amount',
        },
      ],
    });
    const next = prepareGraphForAnimationDriverAttach(graph, 'n1', 'amount');
    expect(findAudioDriverConnection(next, 'n1', 'amount')).toBeUndefined();
    expect(next.connections.some((c) => c.id === 'c-graph')).toBe(true);
  });

  it('detach helpers are no-ops when nothing to remove', () => {
    const graph = baseGraph();
    expect(detachAnimationDriverForParam(graph, 'n1', 'amount')).toBe(graph);
    expect(detachAudioDriverForParam(graph, 'n1', 'amount')).toBe(graph);
  });
});
