import { describe, expect, it } from 'vitest';
import type { NodeGraph } from '../data-model/types';
import type { AudioSetup } from '../data-model/audioSetupTypes';
import { resolveDriverKindForParam } from './resolveDriverKindForParam';
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

describe('resolveDriverKindForParam', () => {
  it('returns null when no driver is attached', () => {
    const graph = baseGraph();
    expect(resolveDriverKindForParam(graph, 'n1', 'amount', emptyAudioSetup)).toBe(null);
  });

  it('returns audio when a virtual-node connection exists', () => {
    const virtualNodeId = getVirtualNodeId('remap-r1');
    const graph = baseGraph({
      connections: [
        {
          id: 'c1',
          sourceNodeId: virtualNodeId,
          sourcePort: 'out',
          targetNodeId: 'n1',
          targetParameter: 'amount',
        },
      ],
    });
    const setup: AudioSetup = {
      ...emptyAudioSetup,
      remappers: [
        {
          id: 'r1',
          name: 'R1',
          bandId: 'band-1',
          inMin: 0,
          inMax: 1,
          outMin: 0,
          outMax: 1,
        },
      ],
    };
    expect(resolveDriverKindForParam(graph, 'n1', 'amount', setup)).toBe('audio');
  });

  it('returns animation when an evaluable automation lane exists', () => {
    const graph = baseGraph({
      automation: {
        bpm: 120,
        durationSeconds: 10,
        lanes: [
          {
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
          },
        ],
      },
    });
    expect(resolveDriverKindForParam(graph, 'n1', 'amount', emptyAudioSetup)).toBe('animation');
  });

  it('prefers audio over animation when both are present', () => {
    const virtualNodeId = getVirtualNodeId('remap-r1');
    const graph = baseGraph({
      connections: [
        {
          id: 'c1',
          sourceNodeId: virtualNodeId,
          sourcePort: 'out',
          targetNodeId: 'n1',
          targetParameter: 'amount',
        },
      ],
      automation: {
        bpm: 120,
        durationSeconds: 10,
        lanes: [
          {
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
          },
        ],
      },
    });
    const setup: AudioSetup = {
      ...emptyAudioSetup,
      remappers: [
        {
          id: 'r1',
          name: 'R1',
          bandId: 'band-1',
          inMin: 0,
          inMax: 1,
          outMin: 0,
          outMax: 1,
        },
      ],
    };
    expect(resolveDriverKindForParam(graph, 'n1', 'amount', setup)).toBe('audio');
  });

  it('returns midi when a bound envelope binding exists', () => {
    const graph = baseGraph({
      midiEnvelopePresets: [
        {
          id: 'midi-preset-1',
          trackIds: ['track-a'],
          envelope: {
            adsr: {
              attackSeconds: 0.02,
              decaySeconds: 0.1,
              sustainLevel: 0.5,
              releaseSeconds: 0.2,
            },
          },
        },
      ],
      midiEnvelopeRemappers: [
        {
          id: 'remapper-midi-preset-1',
          envelopePresetId: 'midi-preset-1',
          outMin: 0,
          outMax: 1,
        },
      ],
      midiEnvelopeBindings: [
        {
          id: 'midi-1',
          remapperId: 'remapper-midi-preset-1',
          nodeId: 'n1',
          paramName: 'amount',
        },
      ],
    });
    expect(resolveDriverKindForParam(graph, 'n1', 'amount', emptyAudioSetup)).toBe('midi');
  });
});
