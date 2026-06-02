import { describe, expect, it } from 'vitest';

import { migrateNoteGravityWarpParameters } from './noteGravityWarpParametersMigration';
import type { NodeGraph } from './types';

describe('migrateNoteGravityWarpParameters', () => {
  it('renames window, radius, and clamp to current keys', () => {
    const graph: NodeGraph = {
      id: 'g',
      name: 't',
      version: '2.0',
      nodes: [
        {
          id: 'g1',
          type: 'note-gravity-warp',
          position: { x: 0, y: 0 },
          parameters: { window: 1.5, radius: 0.2, clamp: 0.1, strength: 0.12 },
        },
      ],
      connections: [],
    };

    const migrated = migrateNoteGravityWarpParameters(graph);
    const params = migrated.nodes[0]?.parameters ?? {};

    expect(params.windowSeconds).toBe(1.5);
    expect(params.reach).toBe(0.2);
    expect(params.maxWarp).toBe(0.1);
    expect(params.strength).toBe(0.12);
    expect(params.window).toBeUndefined();
    expect(params.radius).toBeUndefined();
    expect(params.clamp).toBeUndefined();
  });
});
