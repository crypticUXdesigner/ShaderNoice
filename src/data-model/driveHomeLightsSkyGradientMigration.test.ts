import { describe, expect, it } from 'vitest';
import { migrateDriveHomeLightsSkyGradient } from './driveHomeLightsSkyGradientMigration';
import type { NodeGraph } from './types';

function minimalGraph(nodes: NodeGraph['nodes'], connections: NodeGraph['connections'] = []): NodeGraph {
  return {
    id: 'g1',
    name: 'Test',
    version: '2.0',
    nodes,
    connections,
    viewState: { zoom: 1, panX: 0, panY: 0, selectedNodeIds: [] },
  };
}

describe('migrateDriveHomeLightsSkyGradient', () => {
  it('maps legacy skyL/C/H to skyGradientHigh* and mirrors to low', () => {
    const graph = minimalGraph([
      {
        id: 'n1',
        type: 'drive-home-lights',
        position: { x: 0, y: 0 },
        parameters: {
          skyL: 0.83,
          skyC: 0.1,
          skyH: 300,
          skyStrength: 0.8,
        },
      },
    ]);
    const out = migrateDriveHomeLightsSkyGradient(graph);
    const p = out.nodes[0].parameters as Record<string, number>;
    expect(p.skyGradientHighL).toBe(0.83);
    expect(p.skyGradientHighC).toBe(0.1);
    expect(p.skyGradientHighH).toBe(300);
    expect(p.skyGradientLowL).toBe(0.83);
    expect(p.skyGradientLowC).toBe(0.1);
    expect(p.skyGradientLowH).toBe(300);
    expect('skyL' in p).toBe(false);
    expect(p.skyStrength).toBe(0.8);
  });

  it('maps skyHorizon/skyZenith to skyGradientLow/High', () => {
    const graph = minimalGraph([
      {
        id: 'n1',
        type: 'drive-home-lights',
        position: { x: 0, y: 0 },
        parameters: {
          skyHorizonL: 0.0,
          skyHorizonC: 0.0,
          skyHorizonH: 0.0,
          skyZenithL: 0.8,
          skyZenithC: 0.1,
          skyZenithH: 320,
        },
      },
    ]);
    const out = migrateDriveHomeLightsSkyGradient(graph);
    const p = out.nodes[0].parameters as Record<string, number>;
    expect(p.skyGradientLowL).toBe(0);
    expect(p.skyGradientHighL).toBe(0.8);
    expect('skyZenithL' in p).toBe(false);
  });

  it('rewrites parameter connections to skyGradient*', () => {
    const graph = minimalGraph(
      [
        {
          id: 'n1',
          type: 'drive-home-lights',
          position: { x: 0, y: 0 },
          parameters: { skyL: 0.5, skyC: 0.1, skyH: 200 },
        },
        {
          id: 'n2',
          type: 'constant-float',
          position: { x: 0, y: 0 },
          parameters: { value: 1 },
        },
      ],
      [
        {
          id: 'c1',
          sourceNodeId: 'n2',
          sourcePort: 'out',
          targetNodeId: 'n1',
          targetParameter: 'skyC',
        },
      ]
    );
    const out = migrateDriveHomeLightsSkyGradient(graph);
    expect(out.connections[0].targetParameter).toBe('skyGradientHighC');
  });
});
