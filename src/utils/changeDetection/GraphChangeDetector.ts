/**
 * Graph Change Detector
 * 
 * Unified change detection system for node graphs.
 * Leverages immutable updates for reliable and efficient change detection.
 * 
 * With immutable updates, graphs are always new references when changed.
 * This allows for fast reference equality checks, with structural comparison
 * for detailed change information when needed.
 */

import type { NodeGraph, NodeInstance } from '../../data-model/types';
import { parametersEqual, connectionsEqual } from '../../runtime/utils/deepEquals';
import type { ChangeDetectionResult, ChangeDetectionOptions } from './types';
import { ChangeType } from './types';
import { GraphAnalyzer } from '../../shaders/compilation/GraphAnalyzer';
import { automationEqual, automationOnlyRegionTimesDiffer } from './automationComparison';

function parameterInputModesEqual(
  a: NodeInstance['parameterInputModes'],
  b: NodeInstance['parameterInputModes'],
): boolean {
  const keys = new Set([
    ...Object.keys(a ?? {}),
    ...Object.keys(b ?? {}),
  ]);
  for (const key of keys) {
    const va = key in (a ?? {}) ? a![key] : undefined;
    const vb = key in (b ?? {}) ? b![key] : undefined;
    if (va !== vb) {
      return false;
    }
  }
  return true;
}

/**
 * Graph Change Detector
 * 
 * Provides unified change detection for node graphs, replacing scattered
 * change detection logic across RuntimeManager, CompilationManager, and NodeEditorCanvas.
 */
export class GraphChangeDetector {
  /**
   * Detect changes between two graph states.
   * 
   * With immutable updates, if oldGraph === newGraph, no changes occurred.
   * Otherwise, performs structural comparison to determine what changed.
   * 
   * @param oldGraph - Previous graph state (null if first comparison)
   * @param newGraph - Current graph state
   * @param options - Change detection options
   * @returns Detailed change detection result
   */
  static detectChanges(
    oldGraph: NodeGraph | null,
    newGraph: NodeGraph,
    options: ChangeDetectionOptions = {}
  ): ChangeDetectionResult {
    const {
      trackAffectedNodes = false,
      includeConnectionIds = true
    } = options;

    // Fast path: same reference means no change (immutable updates guarantee this)
    if (oldGraph === newGraph) {
      return this.createNoChangeResult();
    }

    // First comparison - everything is new
    if (!oldGraph) {
      return this.createInitialChangeResult(newGraph, trackAffectedNodes, includeConnectionIds);
    }

    // Perform structural comparison
    return this.compareGraphs(oldGraph, newGraph, trackAffectedNodes, includeConnectionIds);
  }

  /**
   * Check if only positions/viewState changed (not structure, connections, or parameters).
   * 
   * This is a convenience method that performs optimized comparison for the common
   * case of checking if only positions changed.
   * 
   * @param oldGraph - Previous graph state (null if first comparison)
   * @param newGraph - Current graph state
   * @returns true if only positions/viewState changed
   */
  static isOnlyPositionChange(oldGraph: NodeGraph | null, newGraph: NodeGraph): boolean {
    // Fast path: same reference means no change
    if (oldGraph === newGraph) {
      return false; // No change at all
    }

    if (!oldGraph) {
      return false; // First comparison, structure changed
    }

    // Quick checks for structure changes
    if (oldGraph.nodes.length !== newGraph.nodes.length) {
      return false;
    }

    const oldConnCount = oldGraph.connections?.length || 0;
    const newConnCount = newGraph.connections?.length || 0;
    if (oldConnCount !== newConnCount) {
      return false;
    }

    // Check if any nodes were added/removed (by ID)
    const oldNodeIds = new Set(oldGraph.nodes.map(n => n.id));
    const newNodeIds = new Set(newGraph.nodes.map(n => n.id));
    if (oldNodeIds.size !== newNodeIds.size) {
      return false;
    }
    for (const id of oldNodeIds) {
      if (!newNodeIds.has(id)) {
        return false;
      }
    }

    // Check if any node types changed
    const oldNodesById = new Map(oldGraph.nodes.map(n => [n.id, n]));
    for (const newNode of newGraph.nodes) {
      const oldNode = oldNodesById.get(newNode.id);
      if (!oldNode || oldNode.type !== newNode.type) {
        return false;
      }
    }

    // Check if any parameters changed
    for (const newNode of newGraph.nodes) {
      const oldNode = oldNodesById.get(newNode.id);
      if (!oldNode) {
        return false;
      }
      if (!parametersEqual(oldNode.parameters, newNode.parameters)) {
        return false;
      }
      if (!parameterInputModesEqual(oldNode.parameterInputModes, newNode.parameterInputModes)) {
        return false;
      }
      // Per-node Power: toggling `bypassed` is a structural change for the compiler (different
      // execution order + different connection view). Treat it as not-only-position so the
      // runtime triggers a recompile via the existing structure-change path.
      if ((oldNode.bypassed ?? false) !== (newNode.bypassed ?? false)) {
        return false;
      }
    }

    // Check if connections changed
    if (!connectionsEqual(oldGraph.connections, newGraph.connections)) {
      return false;
    }

    if (!automationEqual(oldGraph.automation, newGraph.automation)) {
      return false;
    }

    // If we get here, only positions (or viewState) changed
    return true;
  }

  /**
   * True when the only change is automation region startTime/duration/loop (same nodes, connections, lanes, curve keyframes).
   * Used to run recompile in setTimeout(0) instead of requestIdleCallback to avoid long idle-handler violations.
   */
  static isOnlyAutomationRegionTimesChange(
    oldGraph: NodeGraph | null,
    newGraph: NodeGraph
  ): boolean {
    if (oldGraph === newGraph || !oldGraph) return false;
    if (oldGraph.nodes.length !== newGraph.nodes.length) return false;
    if ((oldGraph.connections?.length ?? 0) !== (newGraph.connections?.length ?? 0)) return false;
    if (!connectionsEqual(oldGraph.connections, newGraph.connections)) return false;
    const oldNodesById = new Map(oldGraph.nodes.map(n => [n.id, n]));
    for (const newNode of newGraph.nodes) {
      const oldNode = oldNodesById.get(newNode.id);
      if (!oldNode || oldNode.type !== newNode.type || !parametersEqual(oldNode.parameters, newNode.parameters)) {
        return false;
      }
      // Per-node Power: bypass toggle is structural, not just a timing tweak.
      if ((oldNode.bypassed ?? false) !== (newNode.bypassed ?? false)) {
        return false;
      }
    }
    return automationOnlyRegionTimesDiffer(oldGraph.automation, newGraph.automation);
  }

  /**
   * Check if graph structure changed (nodes, connections, or parameters).
   * 
   * @param oldGraph - Previous graph state (null if first comparison)
   * @param newGraph - Current graph state
   * @returns true if structure changed
   */
  static isStructureChanged(oldGraph: NodeGraph | null, newGraph: NodeGraph): boolean {
    return !this.isOnlyPositionChange(oldGraph, newGraph);
  }

  /**
   * Get changed connection IDs between two graphs.
   * 
   * @param oldGraph - Previous graph state (null if first comparison)
   * @param newGraph - Current graph state
   * @returns Object with added and removed connection IDs
   */
  static getChangedConnections(
    oldGraph: NodeGraph | null,
    newGraph: NodeGraph
  ): { added: string[]; removed: string[] } {
    if (!oldGraph) {
      return {
        added: newGraph.connections.map(c => c.id),
        removed: []
      };
    }

    const oldConnectionIds = new Set(oldGraph.connections.map(c => c.id));
    const newConnectionIds = new Set(newGraph.connections.map(c => c.id));

    const added = Array.from(newConnectionIds).filter(id => !oldConnectionIds.has(id));
    const removed = Array.from(oldConnectionIds).filter(id => !newConnectionIds.has(id));

    return { added, removed };
  }

  /**
   * Create result for no changes detected
   */
  private static createNoChangeResult(): ChangeDetectionResult {
    return {
      changeType: ChangeType.NONE,
      isOnlyPositionChange: false,
      isStructureChanged: false,
      isConnectionsChanged: false,
      isParametersChanged: false,
      isNodeTypesChanged: false,
      addedNodeIds: [],
      removedNodeIds: [],
      changedNodeIds: [],
      affectedNodeIds: new Set(),
      addedConnectionIds: [],
      removedConnectionIds: []
    };
  }

  /**
   * Create result for initial graph (first comparison)
   */
  private static createInitialChangeResult(
    graph: NodeGraph,
    trackAffectedNodes: boolean,
    includeConnectionIds: boolean
  ): ChangeDetectionResult {
    const affectedNodeIds = trackAffectedNodes
      ? new Set(graph.nodes.map(n => n.id))
      : new Set<string>();

    return {
      changeType: ChangeType.STRUCTURE,
      isOnlyPositionChange: false,
      isStructureChanged: true,
      isConnectionsChanged: true,
      isParametersChanged: false,
      isNodeTypesChanged: false,
      addedNodeIds: graph.nodes.map(n => n.id),
      removedNodeIds: [],
      changedNodeIds: [],
      affectedNodeIds,
      addedConnectionIds: includeConnectionIds ? graph.connections.map(c => c.id) : [],
      removedConnectionIds: []
    };
  }

  /**
   * Seed node IDs from connection add/remove/modify endpoints that still exist in `newGraph`.
   * Used so connection-only edits do not mark every node as affected.
   */
  private static collectConnectionEndpointSeeds(
    oldGraph: NodeGraph,
    newGraph: NodeGraph,
    newNodeIds: Set<string>
  ): Set<string> {
    const seeds = new Set<string>();
    const addEndpoints = (c: { sourceNodeId: string; targetNodeId: string }) => {
      if (newNodeIds.has(c.sourceNodeId)) seeds.add(c.sourceNodeId);
      if (newNodeIds.has(c.targetNodeId)) seeds.add(c.targetNodeId);
    };

    const oldById = new Map(oldGraph.connections.map((c) => [c.id, c]));
    const newById = new Map(newGraph.connections.map((c) => [c.id, c]));

    for (const [id, newConn] of newById) {
      const oldConn = oldById.get(id);
      if (!oldConn) {
        addEndpoints(newConn);
      } else if (!connectionsEqual([oldConn], [newConn])) {
        addEndpoints(oldConn);
        addEndpoints(newConn);
      }
    }
    for (const [id, oldConn] of oldById) {
      if (!newById.has(id)) {
        addEndpoints(oldConn);
      }
    }
    return seeds;
  }

  /**
   * Compare two graphs and detect all changes
   */
  private static compareGraphs(
    oldGraph: NodeGraph,
    newGraph: NodeGraph,
    trackAffectedNodes: boolean,
    includeConnectionIds: boolean
  ): ChangeDetectionResult {
    const result: ChangeDetectionResult = {
      changeType: ChangeType.NONE,
      isOnlyPositionChange: false,
      isStructureChanged: false,
      isConnectionsChanged: false,
      isParametersChanged: false,
      isNodeTypesChanged: false,
      addedNodeIds: [],
      removedNodeIds: [],
      changedNodeIds: [],
      affectedNodeIds: new Set(),
      addedConnectionIds: [],
      removedConnectionIds: []
    };

    // Compare node counts
    const nodesChanged = oldGraph.nodes.length !== newGraph.nodes.length;

    // Compare connection counts
    const oldConnCount = oldGraph.connections?.length || 0;
    const newConnCount = newGraph.connections?.length || 0;
    const connectionCountChanged = oldConnCount !== newConnCount;

    // Compare connections structurally
    const connectionsStructurallyChanged = !connectionsEqual(
      oldGraph.connections,
      newGraph.connections
    );

    result.isConnectionsChanged = connectionCountChanged || connectionsStructurallyChanged;

    // Automation is compiled into GLSL (evalAutomation_*). If automation differs, treat this as a structure
    // change and mark the lane node(s) as changed so preview-recompile skip logic doesn't ignore it.
    if (!automationEqual(oldGraph.automation, newGraph.automation)) {
      result.isStructureChanged = true;
      const laneNodeIds = new Set<string>();
      for (const lane of oldGraph.automation?.lanes ?? []) laneNodeIds.add(lane.nodeId);
      for (const lane of newGraph.automation?.lanes ?? []) laneNodeIds.add(lane.nodeId);
      for (const id of laneNodeIds) {
        if (!result.changedNodeIds.includes(id)) {
          result.changedNodeIds.push(id);
        }
      }
    }

    // Get connection IDs if requested
    if (includeConnectionIds && result.isConnectionsChanged) {
      const connectionChanges = this.getChangedConnections(oldGraph, newGraph);
      result.addedConnectionIds = connectionChanges.added;
      result.removedConnectionIds = connectionChanges.removed;
    }

    // Compare nodes
    const oldNodeIds = new Set(oldGraph.nodes.map(n => n.id));
    const newNodeIds = new Set(newGraph.nodes.map(n => n.id));
    const oldNodesById = new Map(oldGraph.nodes.map(n => [n.id, n]));

    // Find added nodes
    for (const newNodeId of newNodeIds) {
      if (!oldNodeIds.has(newNodeId)) {
        result.addedNodeIds.push(newNodeId);
        result.isStructureChanged = true;
      }
    }

    // Find removed nodes
    for (const oldNodeId of oldNodeIds) {
      if (!newNodeIds.has(oldNodeId)) {
        result.removedNodeIds.push(oldNodeId);
        result.isStructureChanged = true;
      }
    }

    // Find changed nodes (type, parameters, or bypassed)
    for (const newNode of newGraph.nodes) {
      const oldNode = oldNodesById.get(newNode.id);
      if (!oldNode) continue; // Already handled as added

      let nodeChanged = false;

      if (oldNode.type !== newNode.type) {
        result.isNodeTypesChanged = true;
        nodeChanged = true;
      }

      if (!parametersEqual(oldNode.parameters, newNode.parameters)) {
        result.isParametersChanged = true;
        nodeChanged = true;
      }

      // Per-node Power: bypass toggle is a structural change (drops or restores GPU code).
      // Mark the node + the graph as structurally changed so downstream consumers recompile
      // and re-derive affected dependents.
      if ((oldNode.bypassed ?? false) !== (newNode.bypassed ?? false)) {
        result.isStructureChanged = true;
        nodeChanged = true;
      }

      if (nodeChanged && !result.changedNodeIds.includes(newNode.id)) {
        result.changedNodeIds.push(newNode.id);
      }
    }

    // Determine structure changed
    result.isStructureChanged = result.isStructureChanged || nodesChanged;

    // Determine if only position changed
    result.isOnlyPositionChange =
      !result.isStructureChanged &&
      !result.isConnectionsChanged &&
      !result.isParametersChanged &&
      !result.isNodeTypesChanged;

    // Determine primary change type
    const changeTypes: ChangeType[] = [];
    if (result.isStructureChanged) changeTypes.push(ChangeType.STRUCTURE);
    if (result.isConnectionsChanged) changeTypes.push(ChangeType.CONNECTIONS);
    if (result.isParametersChanged) changeTypes.push(ChangeType.PARAMETERS);
    if (result.isNodeTypesChanged) changeTypes.push(ChangeType.NODE_TYPES);

    if (changeTypes.length === 0) {
      result.changeType = ChangeType.POSITION_ONLY;
    } else if (changeTypes.length === 1) {
      result.changeType = changeTypes[0];
    } else {
      result.changeType = ChangeType.MIXED;
    }

    // Track affected nodes if requested
    if (trackAffectedNodes) {
      if (
        result.isStructureChanged ||
        result.isConnectionsChanged ||
        result.isParametersChanged ||
        result.isNodeTypesChanged
      ) {
        const seedNodeIds = new Set<string>();
        result.changedNodeIds.forEach((id) => seedNodeIds.add(id));
        result.addedNodeIds.forEach((id) => seedNodeIds.add(id));

        // Connection-only (and mixed) edits: seed from wire endpoints, not every node.
        if (result.isConnectionsChanged) {
          for (const id of this.collectConnectionEndpointSeeds(oldGraph, newGraph, newNodeIds)) {
            seedNodeIds.add(id);
          }
        }

        const graphAnalyzer = new GraphAnalyzer();
        if (seedNodeIds.size > 0) {
          const affected = graphAnalyzer.findAffectedNodes(newGraph, seedNodeIds);
          affected.forEach((id) => result.affectedNodeIds.add(id));
        }

        // Removed nodes: dependents from the old graph that still exist.
        if (result.removedNodeIds.length > 0) {
          const oldDependents = graphAnalyzer.buildDependentsGraph(oldGraph);
          for (const removedId of result.removedNodeIds) {
            const dependents = oldDependents.get(removedId);
            if (!dependents) continue;
            for (const dependentId of dependents) {
              if (newNodeIds.has(dependentId)) {
                result.affectedNodeIds.add(dependentId);
              }
            }
          }
        }
      }
    }

    return result;
  }
}
