import type { NodeGraph } from '../data-model/types';
import type { AudioSetup } from '../data-model/audioSetupTypes';
import { findMidiEnvelopeBindingForParam } from '../data-model/immutableUpdatesMidiEnvelope';
import { getSignalIdFromVirtualNodeId } from './virtualNodes';
import { resolveConnectionDriverOut, resolveMidiBindingOut } from './driverRemap';
import { findActiveParameterConnection } from './resolveParameterInputMode';

export type ParamDriverTargetOutAudio = {
  kind: 'audio';
  outMin: number;
  outMax: number;
  connectionId: string;
};

export type ParamDriverTargetOutMidi = {
  kind: 'midi';
  outMin: number;
  outMax: number;
  bindingId: string;
};

export type ParamDriverTargetOut = ParamDriverTargetOutAudio | ParamDriverTargetOutMidi;

/**
 * Resolve per-port driver target Out for node-body UI.
 * Returns null for animation-only, graph-wire-only, or raw band audio connections.
 */
export function resolveParamDriverTargetOut(
  graph: NodeGraph,
  _audioSetup: AudioSetup,
  nodeId: string,
  paramName: string
): ParamDriverTargetOut | null {
  void _audioSetup;

  const connection = findActiveParameterConnection(graph, nodeId, paramName);
  if (connection) {
    const signalId = getSignalIdFromVirtualNodeId(connection.sourceNodeId);
    if (signalId.startsWith('remap-')) {
      const { outMin, outMax } = resolveConnectionDriverOut(connection);
      return { kind: 'audio', outMin, outMax, connectionId: connection.id };
    }
  }

  const binding = findMidiEnvelopeBindingForParam(graph, nodeId, paramName);
  if (binding) {
    const { outMin, outMax } = resolveMidiBindingOut(binding);
    return { kind: 'midi', outMin, outMax, bindingId: binding.id };
  }

  return null;
}
