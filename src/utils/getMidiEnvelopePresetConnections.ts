import type { NodeGraph } from '../data-model/types';
import type { NodeSpec } from '../types/nodeSpec';
import { findBoundBindingsForPreset } from '../data-model/immutableUpdatesMidiEnvelope';

export interface MidiEnvelopePresetConnectionTarget {
  nodeId: string;
  paramName: string;
  /** Display label: "{paramLabel} ({nodeLabel})" */
  label: string;
}

/**
 * Parameter ports wired to a shared MIDI envelope preset.
 */
export function getMidiEnvelopePresetConnections(
  graph: NodeGraph,
  presetId: string,
  nodeSpecs: Map<string, NodeSpec>
): MidiEnvelopePresetConnectionTarget[] {
  const bindings = findBoundBindingsForPreset(graph, presetId);
  const targets: MidiEnvelopePresetConnectionTarget[] = [];

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
