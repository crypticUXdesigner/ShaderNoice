/**
 * Resolve which parameter driver kind is attached to a float parameter port.
 * Used by ParameterDriverPanel for edit-mode kind selection on open.
 */

import type { NodeGraph } from '../data-model/types';
import type { AudioSetup } from '../data-model/audioSetupTypes';
import { getParamPortConnectionState } from './paramPortAudioState';
import { automationLaneHasEvaluableRegions } from './automationEvaluator';
import { hasMidiEnvelopeBindingForParam } from '../data-model/immutableUpdatesMidiEnvelope';

export type AttachedDriverKind = 'audio' | 'animation' | 'midi' | null;

/**
 * Returns the attached driver kind for `(nodeId, paramName)`, or `null` when none.
 * Audio virtual-node connections take precedence over evaluable automation lanes.
 */
export function resolveDriverKindForParam(
  graph: NodeGraph,
  nodeId: string,
  paramName: string,
  audioSetup: AudioSetup
): AttachedDriverKind {
  const connection = getParamPortConnectionState(nodeId, paramName, graph, audioSetup);
  if (connection.state === 'audio-connected') {
    return 'audio';
  }

  if (hasMidiEnvelopeBindingForParam(graph, nodeId, paramName)) {
    return 'midi';
  }

  const lane = graph.automation?.lanes?.find(
    (l) => l.nodeId === nodeId && l.paramName === paramName
  );
  if (lane && automationLaneHasEvaluableRegions(lane)) {
    return 'animation';
  }

  return null;
}
