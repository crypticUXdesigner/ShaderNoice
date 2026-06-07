import type { NodeGraph } from '../../data-model/types';

/**
 * Returns node ids that can affect `outputNodeId` (inclusive).
 * Traverses connections backwards: output target ← upstream sources.
 */
export function computeUpstreamReachableNodeIds(
  graph: NodeGraph,
  outputNodeId: string
): Set<string> {
  const upstreamByTarget = new Map<string, string[]>();
  for (const c of graph.connections) {
    const list = upstreamByTarget.get(c.targetNodeId);
    if (list) list.push(c.sourceNodeId);
    else upstreamByTarget.set(c.targetNodeId, [c.sourceNodeId]);
  }

  const reachable = new Set<string>();
  const stack: string[] = [outputNodeId];
  while (stack.length > 0) {
    const id = stack.pop() as string;
    if (reachable.has(id)) continue;
    reachable.add(id);
    const ups = upstreamByTarget.get(id);
    if (!ups) continue;
    for (const srcId of ups) stack.push(srcId);
  }
  return reachable;
}
