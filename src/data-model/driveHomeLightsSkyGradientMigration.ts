/**
 * Drive Home Lights sky parameter migration
 *
 * - Legacy `skyL` / `skyC` / `skyH` → `skyGradientHigh*`
 * - Intermediate `skyHorizon*` / `skyZenith*` → `skyGradientLow*` / `skyGradientHigh*`
 * - Current: `skyGradientLow*` / `skyGradientHigh*` (two stops for sky tint only; shader applies `rd.y` falloff)
 */

import type { NodeGraph, NodeInstance, Connection } from './types';
import type { ParameterInputMode } from '../types/nodeSpec';

const NODE_TYPE = 'drive-home-lights';

/** Old connection targets → current param names */
const LEGACY_PARAM_TO_GRADIENT: Record<string, string> = {
  skyL: 'skyGradientHighL',
  skyC: 'skyGradientHighC',
  skyH: 'skyGradientHighH',
  skyHorizonL: 'skyGradientLowL',
  skyHorizonC: 'skyGradientLowC',
  skyHorizonH: 'skyGradientLowH',
  skyZenithL: 'skyGradientHighL',
  skyZenithC: 'skyGradientHighC',
  skyZenithH: 'skyGradientHighH',
};

function migrateNode(node: NodeInstance): NodeInstance {
  if (node.type !== NODE_TYPE) return node;

  const p: Record<string, unknown> = { ...(node.parameters ?? {}) };

  // 1) Previous horizon/zenith names (before skyL so zenith wins over legacy triplet)
  if (!('skyGradientLowL' in p) && typeof p.skyHorizonL === 'number') p.skyGradientLowL = p.skyHorizonL;
  if (!('skyGradientLowC' in p) && typeof p.skyHorizonC === 'number') p.skyGradientLowC = p.skyHorizonC;
  if (!('skyGradientLowH' in p) && typeof p.skyHorizonH === 'number') p.skyGradientLowH = p.skyHorizonH;

  if (!('skyGradientHighL' in p) && typeof p.skyZenithL === 'number') p.skyGradientHighL = p.skyZenithL;
  if (!('skyGradientHighC' in p) && typeof p.skyZenithC === 'number') p.skyGradientHighC = p.skyZenithC;
  if (!('skyGradientHighH' in p) && typeof p.skyZenithH === 'number') p.skyGradientHighH = p.skyZenithH;

  // 2) Oldest: skyL/C/H → high (only if still missing)
  if (!('skyGradientHighL' in p) && typeof p.skyL === 'number') p.skyGradientHighL = p.skyL;
  if (!('skyGradientHighC' in p) && typeof p.skyC === 'number') p.skyGradientHighC = p.skyC;
  if (!('skyGradientHighH' in p) && typeof p.skyH === 'number') p.skyGradientHighH = p.skyH;

  // 3) If only one end was stored, mirror so behavior matches single-color `t * tint`
  if (
    typeof p.skyGradientHighL === 'number' &&
    typeof p.skyGradientHighC === 'number' &&
    typeof p.skyGradientHighH === 'number' &&
    !('skyGradientLowL' in p)
  ) {
    p.skyGradientLowL = p.skyGradientHighL;
    p.skyGradientLowC = p.skyGradientHighC;
    p.skyGradientLowH = p.skyGradientHighH;
  }
  if (
    typeof p.skyGradientLowL === 'number' &&
    typeof p.skyGradientLowC === 'number' &&
    typeof p.skyGradientLowH === 'number' &&
    !('skyGradientHighL' in p)
  ) {
    p.skyGradientHighL = p.skyGradientLowL;
    p.skyGradientHighC = p.skyGradientLowC;
    p.skyGradientHighH = p.skyGradientLowH;
  }

  const removeKeys = [
    'skyL',
    'skyC',
    'skyH',
    'skyHorizonL',
    'skyHorizonC',
    'skyHorizonH',
    'skyZenithL',
    'skyZenithC',
    'skyZenithH',
  ];
  for (const k of removeKeys) delete p[k];

  let nextInputModes: Record<string, ParameterInputMode> | undefined = node.parameterInputModes
    ? { ...node.parameterInputModes }
    : undefined;

  if (nextInputModes) {
    for (const [from, to] of Object.entries(LEGACY_PARAM_TO_GRADIENT)) {
      if (from in nextInputModes && !(to in nextInputModes)) {
        nextInputModes[to] = nextInputModes[from];
      }
      delete nextInputModes[from];
    }
    if (Object.keys(nextInputModes).length === 0) nextInputModes = undefined;
  }

  return {
    ...node,
    parameters: p as NodeInstance['parameters'],
    ...(nextInputModes ? { parameterInputModes: nextInputModes } : {}),
  };
}

function graphHasLegacyDriveHomeSky(graph: NodeGraph): boolean {
  const targetIds = new Set(graph.nodes.filter((n) => n.type === NODE_TYPE).map((n) => n.id));
  if (targetIds.size === 0) return false;

  const legacyParamKeys = new Set(Object.keys(LEGACY_PARAM_TO_GRADIENT));

  if (
    graph.nodes.some((n) => {
      if (n.type !== NODE_TYPE) return false;
      const par = n.parameters ?? {};
      for (const k of legacyParamKeys) {
        if (k in par) return true;
      }
      return false;
    })
  ) {
    return true;
  }

  return graph.connections.some((c) => {
    if (!c.targetParameter || !targetIds.has(c.targetNodeId)) return false;
    return legacyParamKeys.has(c.targetParameter);
  });
}

export function migrateDriveHomeLightsSkyGradient(graph: NodeGraph): NodeGraph {
  if (!graphHasLegacyDriveHomeSky(graph)) return graph;

  const targetIds = new Set(graph.nodes.filter((n) => n.type === NODE_TYPE).map((n) => n.id));

  const nodes = graph.nodes.map((n) => (targetIds.has(n.id) ? migrateNode(n) : n));

  const connections: Connection[] = graph.connections.map((c) => {
    if (!c.targetParameter || !targetIds.has(c.targetNodeId)) return c;
    const mapped = LEGACY_PARAM_TO_GRADIENT[c.targetParameter];
    if (!mapped) return c;
    return { ...c, targetParameter: mapped };
  });

  return { ...graph, nodes, connections };
}
