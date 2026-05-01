import type { NodeGraph, NodeInstance, ParameterValue } from './types';

/**
 * Migrates mixed-wave-signal nodes from legacy w0Cosine/w1Cosine/w2Cosine (0/1 float)
 * to w0Shape/w1Shape/w2Shape (int enum: 0 = sine, 1 = cosine, …).
 */
function migrateNode(node: NodeInstance): NodeInstance {
  if (node.type !== 'mixed-wave-signal') return node;

  const p: Record<string, ParameterValue> = { ...node.parameters };
  const waves = [0, 1, 2] as const;

  for (const i of waves) {
    const shapeKey = `w${i}Shape`;
    const legacyKey = `w${i}Cosine`;
    if (p[shapeKey] !== undefined) {
      if (legacyKey in p) delete p[legacyKey];
      continue;
    }
    if (legacyKey in p) {
      const c = p[legacyKey];
      const useCos = c === 1 || c === 1.0;
      p[shapeKey] = useCos ? 1 : 0;
      delete p[legacyKey];
    } else {
      p[shapeKey] = 0;
    }
  }

  return { ...node, parameters: p };
}

export function migrateMixedWaveSignalShapes(graph: NodeGraph): NodeGraph {
  return {
    ...graph,
    nodes: graph.nodes.map((n) => migrateNode(n)),
  };
}
