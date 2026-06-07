import { describe, expect, it } from 'vitest';
import type { Connection } from '../../data-model/types';
import { connectionsEqual } from './deepEquals';
import { GraphChangeDetector } from '../../utils/changeDetection/GraphChangeDetector';
import type { NodeGraph } from '../../data-model/types';

function baseGraph(connections: Connection[]): NodeGraph {
  return {
    id: 'g1',
    name: 'Test',
    version: '2.0',
    nodes: [{ id: 'n1', type: 'test', parameters: { amount: 0.5 }, position: { x: 0, y: 0 } }],
    connections,
    viewState: { zoom: 1, panX: 0, panY: 0, selectedNodeIds: [] },
  };
}

describe('connectionsEqual', () => {
  const conn: Connection = {
    id: 'c1',
    sourceNodeId: 'audio-signal:remap-r1',
    sourcePort: 'out',
    targetNodeId: 'n1',
    targetParameter: 'amount',
  };

  it('treats disabled flag as part of connection identity', () => {
    expect(connectionsEqual([conn], [{ ...conn, disabled: true }])).toBe(false);
    expect(connectionsEqual([{ ...conn, disabled: true }], [conn])).toBe(false);
    expect(connectionsEqual([conn], [conn])).toBe(true);
    expect(connectionsEqual([{ ...conn, disabled: true }], [{ ...conn, disabled: true }])).toBe(
      true
    );
  });

  it('treats driverOutMin/driverOutMax as compile-affecting connection fields', () => {
    const withOut = { ...conn, driverOutMin: 0.44, driverOutMax: 2.46 };
    expect(connectionsEqual([withOut], [{ ...withOut, driverOutMax: 1.6 }])).toBe(false);
    expect(connectionsEqual([withOut], [{ ...withOut, driverOutMin: 0 }])).toBe(false);
    expect(connectionsEqual([withOut], [withOut])).toBe(true);
  });
});

describe('GraphChangeDetector — driver target out', () => {
  it('does not classify driverOutMin/Max edits as position-only', () => {
    const before = baseGraph([
      {
        id: 'c1',
        sourceNodeId: 'audio-signal:remap-r1',
        sourcePort: 'out',
        targetNodeId: 'n1',
        targetParameter: 'amount',
        driverOutMin: 0,
        driverOutMax: 1,
      },
    ]);
    const after = baseGraph([
      {
        id: 'c1',
        sourceNodeId: 'audio-signal:remap-r1',
        sourcePort: 'out',
        targetNodeId: 'n1',
        targetParameter: 'amount',
        driverOutMin: 0.44,
        driverOutMax: 2.46,
      },
    ]);
    expect(GraphChangeDetector.isOnlyPositionChange(before, after)).toBe(false);
    expect(GraphChangeDetector.detectChanges(before, after).isConnectionsChanged).toBe(true);
  });
});

describe('GraphChangeDetector — connection disabled', () => {
  it('does not classify driver bypass as position-only', () => {
    const active = baseGraph([
      {
        id: 'c1',
        sourceNodeId: 'audio-signal:remap-r1',
        sourcePort: 'out',
        targetNodeId: 'n1',
        targetParameter: 'amount',
      },
    ]);
    const bypassed = baseGraph([
      {
        id: 'c1',
        sourceNodeId: 'audio-signal:remap-r1',
        sourcePort: 'out',
        targetNodeId: 'n1',
        targetParameter: 'amount',
        disabled: true,
      },
    ]);
    expect(GraphChangeDetector.isOnlyPositionChange(active, bypassed)).toBe(false);
    expect(GraphChangeDetector.detectChanges(active, bypassed).isConnectionsChanged).toBe(true);
  });
});
