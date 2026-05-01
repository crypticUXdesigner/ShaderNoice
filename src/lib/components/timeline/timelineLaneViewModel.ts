import type { AutomationLane, NodeGraph } from '../../../data-model/types';
import type { NodeSpec } from '../../../types/nodeSpec';
import { getSubGroupSlug } from '../../../utils/cssTokens';
import { nodeCategoryToCssSlug } from '../../../utils/nodeCategorySlug';

/** Presentation fields for one automation lane row (lanes track + headers). */
export interface TimelineLaneRowViewModel {
  lane: AutomationLane;
  spec: NodeSpec | undefined;
  nodeLabel: string;
  paramLabel: string;
  categorySlug: string;
  subGroupSlug: string;
}

/** Lane row plus graph node reference (panel / graph updates). */
export interface TimelineLaneViewModel extends TimelineLaneRowViewModel {
  node: NodeGraph['nodes'][number] | undefined;
}

export function buildTimelineLaneViewModels(
  graph: NodeGraph,
  nodeSpecsMap: Map<string, NodeSpec>
): TimelineLaneViewModel[] {
  const lanes = graph.automation?.lanes ?? [];
  return lanes.map((lane) => {
    const node = graph.nodes.find((n) => n.id === lane.nodeId);
    const spec = node ? nodeSpecsMap.get(node.type) : undefined;
    const nodeLabel = node?.label ?? spec?.displayName ?? lane.nodeId;
    const paramSpec = spec?.parameters?.[lane.paramName];
    const paramLabel = paramSpec?.label ?? lane.paramName;
    const categorySlug = nodeCategoryToCssSlug(spec?.category);
    const subGroupSlug = node ? getSubGroupSlug(node.type, spec?.category ?? '') : '';
    return {
      lane,
      node,
      spec,
      nodeLabel,
      paramLabel,
      categorySlug,
      subGroupSlug,
    };
  });
}
