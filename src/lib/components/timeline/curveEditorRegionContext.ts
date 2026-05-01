import type {
  AutomationLane,
  AutomationRegion,
  NodeGraph,
  NodeInstance,
} from '../../../data-model/types';
import type { NodeSpec } from '../../../types/nodeSpec';
import type { ParameterSpec } from '../../../types/nodeSpec';
import { getSubGroupSlug } from '../../../utils/cssTokens';
import { nodeCategoryToCssSlug } from '../../../utils/nodeCategorySlug';
import { getNodeIcon } from '../../../utils/nodeSpecUtils';

/** Display range for the lane parameter (curve stores normalized 0–1). */
export type CurveEditorParamRange = {
  min: number;
  max: number;
  step: number | undefined;
  paramType: 'int' | 'float';
};

/** Single graph walk: lane → region → node → spec-derived UI fields. */
export type CurveEditorRegionResolution = {
  lane: AutomationLane | null;
  region: AutomationRegion | null;
  node: NodeInstance | null;
  nodeSpec: NodeSpec | undefined;
  paramRange: CurveEditorParamRange;
  categorySlug: string;
  subGroupSlug: string;
  nodeIconIdentifier: string | undefined;
  regionBars: number;
  regionTimeRange: { startTime: number; endTime: number } | null;
};

function paramRangeForLane(
  lane: AutomationLane | null,
  nodeSpec: NodeSpec | undefined
): CurveEditorParamRange {
  if (!lane) {
    return { min: 0, max: 1, step: undefined, paramType: 'float' };
  }
  const param = nodeSpec?.parameters?.[lane.paramName] as ParameterSpec | undefined;
  const min = param?.min ?? 0;
  const max = param?.max ?? 1;
  const step = param?.step;
  const paramType: 'int' | 'float' = param?.type === 'int' ? 'int' : 'float';
  return { min, max, step, paramType };
}

export function resolveCurveEditorRegion(
  graph: NodeGraph,
  laneId: string,
  regionId: string,
  nodeSpecsMap: Map<string, NodeSpec>
): CurveEditorRegionResolution {
  const lane = graph.automation?.lanes.find((l) => l.id === laneId) ?? null;
  const region = lane?.regions.find((r) => r.id === regionId) ?? null;
  const node = lane ? graph.nodes.find((n) => n.id === lane.nodeId) ?? null : null;
  const nodeSpec = node ? nodeSpecsMap.get(node.type) : undefined;
  const paramRange = paramRangeForLane(lane, nodeSpec);

  let categorySlug = 'default';
  let subGroupSlug = '';
  let nodeIconIdentifier: string | undefined;

  if (lane && node) {
    categorySlug = nodeCategoryToCssSlug(nodeSpec?.category);
    subGroupSlug = getSubGroupSlug(node.type, nodeSpec?.category ?? '');
    nodeIconIdentifier = nodeSpec ? getNodeIcon(nodeSpec) : undefined;
  }

  const bpm = graph.automation?.bpm ?? 120;
  let regionBars = 4;
  if (region && bpm > 0) {
    const barSeconds = 60 / bpm;
    regionBars = Math.max(0.25, region.duration / barSeconds);
  }

  const regionTimeRange =
    region != null
      ? { startTime: region.startTime, endTime: region.startTime + region.duration }
      : null;

  return {
    lane,
    region,
    node,
    nodeSpec,
    paramRange,
    categorySlug,
    subGroupSlug,
    nodeIconIdentifier,
    regionBars,
    regionTimeRange,
  };
}
