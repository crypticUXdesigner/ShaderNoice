import { describe, expect, it } from 'vitest';
import { createEmptyGraph } from './utils';
import { addConnection } from './immutableUpdates';
import { removeStaleVirtualAudioConnections } from './removeStaleVirtualAudioConnections';
import type { AudioSetup } from './audioSetupTypes';
import { getVirtualNodeId } from '../utils/virtualNodes';

const emptySetup: AudioSetup = { files: [], bands: [], remappers: [] };

describe('removeStaleVirtualAudioConnections', () => {
  it('removes wires from deleted remappers and leaves other connections', () => {
    const setup: AudioSetup = {
      files: [],
      bands: [{ id: 'b1', name: 'B1', sourceFileId: 'f1', frequencyBands: [[20, 200]] }],
      remappers: [{ id: 'r1', bandId: 'b1', name: 'R1', inputMin: 0, inputMax: 1, outputMin: 0, outputMax: 1 }],
    };
    const staleVirtualId = getVirtualNodeId('remap-deleted');
    const validVirtualId = getVirtualNodeId('remap-r1');
    let graph = createEmptyGraph('g');
    graph = {
      ...graph,
      nodes: [
        {
          id: 'n1',
          type: 'constant',
          position: { x: 0, y: 0 },
          parameters: {},
        },
      ],
    };
    graph = addConnection(graph, {
      id: 'c-stale',
      sourceNodeId: staleVirtualId,
      sourcePort: 'out',
      targetNodeId: 'n1',
      targetParameter: 'value',
    });
    graph = addConnection(graph, {
      id: 'c-valid',
      sourceNodeId: validVirtualId,
      sourcePort: 'out',
      targetNodeId: 'n1',
      targetParameter: 'other',
    });

    const next = removeStaleVirtualAudioConnections(graph, setup);
    expect(next.connections.map((c) => c.id)).toEqual(['c-valid']);
  });

  it('returns the same graph reference when nothing is stale', () => {
    const graph = createEmptyGraph('g');
    expect(removeStaleVirtualAudioConnections(graph, emptySetup)).toBe(graph);
  });
});
