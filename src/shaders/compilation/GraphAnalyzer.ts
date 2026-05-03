import type { NodeGraph } from '../../data-model/types';

/**
 * Analyzes graph structure and calculates execution order
 */
export class GraphAnalyzer {
  /**
   * Build reverse dependency graph (dependents graph).
   * Maps each node to all nodes that depend on it (downstream dependents).
   */
  buildDependentsGraph(graph: NodeGraph): Map<string, Set<string>> {
    const dependents = new Map<string, Set<string>>();

    // Initialize all nodes with empty dependents
    for (const node of graph.nodes) {
      dependents.set(node.id, new Set());
    }

    // Build reverse dependencies from connections
    for (const conn of graph.connections) {
      const deps = dependents.get(conn.sourceNodeId);
      if (deps) {
        deps.add(conn.targetNodeId);
      }
    }

    return dependents;
  }

  /**
   * Find all downstream dependents of a set of nodes.
   * Returns a set of node IDs that depend on (directly or transitively) the given nodes.
   * 
   * @param graph - The node graph
   * @param changedNodeIds - Set of node IDs that changed
   * @returns Set of all affected node IDs (changed nodes + their dependents)
   */
  findAffectedNodes(graph: NodeGraph, changedNodeIds: Set<string>): Set<string> {
    const dependentsGraph = this.buildDependentsGraph(graph);
    const affectedNodes = new Set<string>(changedNodeIds);
    const visited = new Set<string>();

    // BFS to find all transitive dependents
    const queue = Array.from(changedNodeIds);
    
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const dependents = dependentsGraph.get(nodeId);
      if (dependents) {
        for (const dependentId of dependents) {
          if (!affectedNodes.has(dependentId)) {
            affectedNodes.add(dependentId);
            queue.push(dependentId);
          }
        }
      }
    }

    return affectedNodes;
  }

  /**
   * Topological sort using Kahn's algorithm.
   * Virtual nodes (e.g. audio-signal:band-xxx) are not in graph.nodes; dependencies on them
   * are excluded from in-degree so nodes that only depend on virtual nodes can be processed.
   * Isolated nodes (no connections in or out) are placed at the end of the order so that
   * adding an unconnected node does not shift other nodes' indices and change parameter
   * connection resolution (which source "wins" when multiple connect to the same parameter).
   */
  topologicalSort(graph: NodeGraph): string[] {
    const result: string[] = [];
    const nodeIds = new Set(graph.nodes.map((n) => n.id));

    // Node IDs that appear in any connection (source or target) - "connected" nodes
    const connectedNodeIds = new Set<string>();
    for (const conn of graph.connections) {
      if (nodeIds.has(conn.sourceNodeId)) connectedNodeIds.add(conn.sourceNodeId);
      if (nodeIds.has(conn.targetNodeId)) connectedNodeIds.add(conn.targetNodeId);
    }

    // In-degree = count of incoming edges from **real** graph nodes (same as filtering virtual
    // predecessors out of the unique-deps list). Must match decrement: one decrement per edge,
    // otherwise multiple wires from the same source (e.g. two float params) under-count in-degree
    // and a node can run before its predecessors (classic "UI live / shader wrong" + link errors).
    const inDegree = new Map<string, number>();
    for (const node of graph.nodes) {
      inDegree.set(node.id, 0);
    }
    for (const conn of graph.connections) {
      if (!nodeIds.has(conn.targetNodeId)) continue;
      if (!nodeIds.has(conn.sourceNodeId)) continue;
      const t = conn.targetNodeId;
      inDegree.set(t, (inDegree.get(t) ?? 0) + 1);
    }

    // Two queues: process connected nodes before isolated so isolated nodes end up at the end
    const connectedQueue: string[] = [];
    const isolatedQueue: string[] = [];

    for (const node of graph.nodes) {
      const degree = inDegree.get(node.id) ?? 0;
      if (degree === 0) {
        if (connectedNodeIds.has(node.id)) {
          connectedQueue.push(node.id);
        } else {
          isolatedQueue.push(node.id);
        }
      }
    }

    const takeNext = (): string | undefined =>
      connectedQueue.shift() ?? isolatedQueue.shift();

    let nodeId: string | undefined;
    while ((nodeId = takeNext()) !== undefined) {
      result.push(nodeId);

      for (const conn of graph.connections) {
        if (conn.sourceNodeId !== nodeId) continue;
        if (!nodeIds.has(conn.targetNodeId)) continue;
        if (!nodeIds.has(conn.sourceNodeId)) continue;
        const targetId = conn.targetNodeId;
        const targetInDegree = (inDegree.get(targetId) || 0) - 1;
        inDegree.set(targetId, targetInDegree);
        if (targetInDegree === 0) {
          if (connectedNodeIds.has(targetId)) {
            connectedQueue.push(targetId);
          } else {
            isolatedQueue.push(targetId);
          }
        }
      }
    }

    if (result.length !== graph.nodes.length) {
      throw new Error('Graph contains cycles');
    }

    return result;
  }
}
