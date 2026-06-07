import { describe, it, expect } from 'vitest';
import { buildArrangementSnapshot } from '../audiotool/arrangement/buildArrangementSnapshot';
import type { RawArrangementEntities } from '../audiotool/arrangement/rawEntities';
import spikeFixture from '../audiotool/arrangement/__fixtures__/spike-arrangement-raw.json';
import type { NodeGraph, NodeInstance } from './types';
import {
  applyArrangementNotesDefaultTrackFilterToGraph,
  arrangementNotesNeedsDefaultTrackFilter,
} from './arrangementNotesTrackFilterDefaults';

const snapshot = buildArrangementSnapshot(spikeFixture as RawArrangementEntities);

function notesNode(params: Record<string, unknown> = {}): NodeInstance {
  return {
    id: 'n1',
    type: 'arrangement-notes',
    position: { x: 0, y: 0 },
    parameters: params,
  };
}

function graphWith(node: NodeInstance): NodeGraph {
  return { nodes: [node], connections: [] };
}

describe('arrangementNotesTrackFilterDefaults', () => {
  it('arrangementNotesNeedsDefaultTrackFilter is true only for legacy mode 0', () => {
    expect(arrangementNotesNeedsDefaultTrackFilter(notesNode({ trackFilterMode: 0 }))).toBe(true);
    expect(
      arrangementNotesNeedsDefaultTrackFilter(
        notesNode({ trackFilterMode: 1, trackFilterList: '' })
      )
    ).toBe(false);
    expect(
      arrangementNotesNeedsDefaultTrackFilter(
        notesNode({ trackFilterMode: 1, trackFilterList: 'track-note-1' })
      )
    ).toBe(false);
  });

  it('applyArrangementNotesDefaultTrackFilterToGraph migrates mode 0 to empty subset', () => {
    const out = applyArrangementNotesDefaultTrackFilterToGraph(
      graphWith(notesNode({ trackFilterMode: 0 })),
      snapshot
    );
    expect(out.nodes[0]?.parameters.trackFilterMode).toBe(1);
    expect(out.nodes[0]?.parameters.trackFilterList).toBe('');
  });

  it('does not change a node that already has zero tracks selected', () => {
    const graph = graphWith(notesNode({ trackFilterMode: 1, trackFilterList: '' }));
    expect(applyArrangementNotesDefaultTrackFilterToGraph(graph, snapshot)).toBe(graph);
  });

  it('does not override an explicit single-track filter', () => {
    const graph = graphWith(
      notesNode({ trackFilterMode: 1, trackFilterList: 'other-track' })
    );
    expect(applyArrangementNotesDefaultTrackFilterToGraph(graph, snapshot)).toBe(graph);
  });
});
