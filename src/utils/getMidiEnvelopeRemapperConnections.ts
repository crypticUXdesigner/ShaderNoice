import type { NodeGraph } from '../data-model/types';
import type { NodeSpec } from '../types/nodeSpec';
import { findBoundBindingsForRemapper } from '../data-model/immutableUpdatesMidiEnvelope';

export interface MidiEnvelopeRemapperConnectionTarget {
  nodeId: string;
  paramName: string;
  /** Display label: "{paramLabel} ({nodeLabel})" */
  label: string;
}

/**
 * Parameter ports wired to a MIDI envelope remapper (shared bindings).
 */
export function getMidiEnvelopeRemapperConnections(
  graph: NodeGraph,
  remapperId: string,
  nodeSpecs: Map<string, NodeSpec>
): MidiEnvelopeRemapperConnectionTarget[] {
  const bindings = findBoundBindingsForRemapper(graph, remapperId);
  const targets: MidiEnvelopeRemapperConnectionTarget[] = [];

  for (const binding of bindings) {
    const node = graph.nodes.find((n) => n.id === binding.nodeId);
    const spec = node ? nodeSpecs.get(node.type) : undefined;
    const nodeLabel = node?.label?.trim() || spec?.displayName || binding.nodeId;
    const paramLabel = spec?.parameters?.[binding.paramName]?.label ?? binding.paramName;

    targets.push({
      nodeId: binding.nodeId,
      paramName: binding.paramName,
      label: `${paramLabel} (${nodeLabel})`,
    });
  }

  return targets.sort((a, b) => a.label.localeCompare(b.label));
}
