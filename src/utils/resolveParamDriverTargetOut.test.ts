import { describe, expect, it } from 'vitest';

import type { NodeGraph } from '../data-model/types';
import type { AudioSetup } from '../data-model/audioSetupTypes';
import { getVirtualNodeId } from './virtualNodes';
import { resolveParamDriverTargetOut } from './resolveParamDriverTargetOut';

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

describe('resolveParamDriverTargetOut', () => {
  it('returns audio remap Out from the active connection', () => {
    const graph = baseGraph({
      connections: [
        {
          id: 'conn-remap',
          sourceNodeId: getVirtualNodeId('remap-r1'),
          targetNodeId: 'n1',
          targetParameter: 'amount',
          driverOutMin: -0.5,
          driverOutMax: 4,
        },
      ],
    });

    expect(resolveParamDriverTargetOut(graph, emptyAudioSetup, 'n1', 'amount')).toEqual({
      kind: 'audio',
      outMin: -0.5,
      outMax: 4,
      connectionId: 'conn-remap',
    });
  });

  it('returns null for raw band audio connections (no per-target Out)', () => {
    const graph = baseGraph({
      connections: [
        {
          id: 'conn-band',
          sourceNodeId: getVirtualNodeId('band-b1-raw'),
          targetNodeId: 'n1',
          targetParameter: 'amount',
        },
      ],
    });

    expect(resolveParamDriverTargetOut(graph, emptyAudioSetup, 'n1', 'amount')).toBeNull();
  });

  it('returns null for disabled remap connections', () => {
    const graph = baseGraph({
      connections: [
        {
          id: 'conn-remap',
          sourceNodeId: getVirtualNodeId('remap-r1'),
          targetNodeId: 'n1',
          targetParameter: 'amount',
          disabled: true,
        },
      ],
    });

    expect(resolveParamDriverTargetOut(graph, emptyAudioSetup, 'n1', 'amount')).toBeNull();
  });

  it('returns MIDI binding Out when present', () => {
    const graph = baseGraph({
      midiEnvelopeBindings: [
        {
          id: 'bind-1',
          nodeId: 'n1',
          paramName: 'value',
          envelopePresetId: 'preset-1',
          remapperId: 'remap-default-preset-1',
          outMin: 0.2,
          outMax: 0.8,
        },
      ],
    });

    expect(resolveParamDriverTargetOut(graph, emptyAudioSetup, 'n1', 'value')).toEqual({
      kind: 'midi',
      outMin: 0.2,
      outMax: 0.8,
      bindingId: 'bind-1',
    });
  });

  it('prefers audio remap Out over MIDI binding on the same port', () => {
    const graph = baseGraph({
      connections: [
        {
          id: 'conn-remap',
          sourceNodeId: getVirtualNodeId('remap-r1'),
          targetNodeId: 'n1',
          targetParameter: 'amount',
          driverOutMin: 1,
          driverOutMax: 2,
        },
      ],
      midiEnvelopeBindings: [
        {
          id: 'bind-1',
          nodeId: 'n1',
          paramName: 'amount',
          envelopePresetId: 'preset-1',
          remapperId: 'remap-default-preset-1',
          outMin: 0,
          outMax: 1,
        },
      ],
    });

    expect(resolveParamDriverTargetOut(graph, emptyAudioSetup, 'n1', 'amount')).toEqual({
      kind: 'audio',
      outMin: 1,
      outMax: 2,
      connectionId: 'conn-remap',
    });
  });
});
