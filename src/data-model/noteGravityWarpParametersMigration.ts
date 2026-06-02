import type { NodeGraph, NodeInstance } from './types';

const NODE_TYPE = 'note-gravity-warp';

function migrateNode(node: NodeInstance): NodeInstance {
  if (node.type !== NODE_TYPE) return node;

  const params = { ...node.parameters };

  if (params.window !== undefined && params.windowSeconds === undefined) {
    params.windowSeconds = params.window;
    delete params.window;
  }

  if (params.radius !== undefined && params.reach === undefined) {
    params.reach = params.radius;
    delete params.radius;
  }

  if (params.clamp !== undefined && params.maxWarp === undefined) {
    params.maxWarp = params.clamp;
    delete params.clamp;
  }

  return { ...node, parameters: params };
}

/** Renames legacy `note-gravity-warp` parameter keys (`window`, `radius`, `clamp`). */
export function migrateNoteGravityWarpParameters(graph: NodeGraph): NodeGraph {
  const nodes = graph.nodes.map((n) => migrateNode(n));
  return nodes === graph.nodes ? graph : { ...graph, nodes };
}
