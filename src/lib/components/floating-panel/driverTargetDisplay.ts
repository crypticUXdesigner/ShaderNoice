import type { AudioBandEntry } from '../../../data-model/audioSetupTypes';
import type { NodeGraph } from '../../../data-model/types';
import type { NodeSpec } from '../../../types/nodeSpec';
import type { NodeIconIdentifier } from '../../../utils/icons';
import { getCategorySlug, getSubGroupSlug } from '../../../utils/cssTokens';
import { getNodeIcon } from '../../../utils/nodeSpecUtils';

export interface DriverTargetDisplay {
  nodeId: string;
  paramName: string;
  paramLabel: string;
  nodeLabel: string;
  nodeIconIdentifier: NodeIconIdentifier | string;
  /** Token suffix for category badge colors (e.g. utilities, patterns). */
  categorySlug: string;
  /** Optional sub-group slug for badge tint (e.g. system-input, warp). */
  subgroupSlug: string;
  /** Full context for tooltips: "{nodeLabel} · {paramLabel}". */
  fullTitle: string;
}

export type DriverConnectionTargetDisplay = DriverTargetDisplay;

function resolveNodeLabel(
  node: { id: string; type: string; label?: string },
  spec: NodeSpec | undefined
): string {
  return node.label?.trim() || spec?.displayName || node.type || node.id;
}

/** Target opened from the parameter port (focused driver header). */
export function resolveDriverTargetDisplay(
  graph: NodeGraph,
  nodeSpecs: Map<string, NodeSpec>,
  nodeId: string,
  paramName: string
): DriverTargetDisplay | null {
  const node = graph.nodes.find((n) => n.id === nodeId);
  if (!node) return null;
  const spec = nodeSpecs.get(node.type);
  const nodeLabel = resolveNodeLabel(node, spec);
  const paramLabel = spec?.parameters?.[paramName]?.label ?? paramName;
  const category = spec?.category ?? 'default';
  return {
    nodeId,
    paramName,
    paramLabel,
    nodeLabel,
    nodeIconIdentifier: spec ? getNodeIcon(spec) : 'circle',
    categorySlug: getCategorySlug(category),
    subgroupSlug: spec ? getSubGroupSlug(spec.id, category) : '',
    fullTitle: `${nodeLabel} · ${paramLabel}`,
  };
}

/** Another parameter wired to the same driver asset (footer tag list). */
export function resolveDriverConnectionTargetDisplay(
  graph: NodeGraph,
  nodeSpecs: Map<string, NodeSpec>,
  nodeId: string,
  paramName: string
): DriverConnectionTargetDisplay | null {
  return resolveDriverTargetDisplay(graph, nodeSpecs, nodeId, paramName);
}

/** MIDI focused header source: track-set name and comma-separated track labels. */
export function formatDriverMidiTrackSetSourceText(
  trackSetName: string,
  tracks: readonly { label: string }[]
): string {
  if (tracks.length === 0) return trackSetName;
  return `${trackSetName}, ${tracks.map((t) => t.label).join(', ')}`;
}

/** Audio focused header source: band name and first frequency range. */
export function formatDriverBandSourceText(band: AudioBandEntry): string {
  const fb = band.frequencyBands?.[0];
  if (fb && fb.length >= 2) {
    const minHz = Math.round(fb[0]);
    const maxHz = Math.round(fb[1]);
    return `${band.name} · ${minHz}–${maxHz} Hz`;
  }
  return band.name;
}
