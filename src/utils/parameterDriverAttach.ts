/**
 * Parameter driver attach/detach orchestration — one primary driver kind per port (audio | animation).
 *
 * Policy (parameter-drivers-v1 task 03):
 * - Attaching **audio** removes the automation **lane** for that parameter (entire lane, not just evaluable regions).
 * - Attaching **animation** removes the **audio driver** virtual-node connection only; graph wires and input modes are unchanged.
 */

import type { NodeGraph, Connection } from '../data-model/types';
import { removeConnection, updateConnectionDriverOut, updateNodeParameterInputMode } from '../data-model/immutableUpdates';
import { removeAutomationLane } from '../data-model/immutableUpdatesAutomation';
import {
  findMidiEnvelopeBindingForParam,
  unbindMidiEnvelopeBindingForParam,
  updateMidiEnvelopeBindingOut,
} from '../data-model/immutableUpdatesMidiEnvelope';
import { updateRemapper as updateAudioRemapper } from '../data-model/audioSetupUpdates';
import { getSignalIdFromVirtualNodeId, isVirtualNodeId } from './virtualNodes';
import type { AttachedDriverKind } from './resolveDriverKindForParam';
import { resolveDriverKindForParam } from './resolveDriverKindForParam';
import type { AudioSetup } from '../data-model/audioSetupTypes';
import type { ParameterSpec } from '../types/nodeSpec';
import {
  defaultDriverRemapOutForParam,
  DRIVER_REMAP_DEFAULT_IN,
} from './driverRemap';

export function findAudioDriverConnection(
  graph: NodeGraph,
  nodeId: string,
  paramName: string
): Connection | undefined {
  return graph.connections.find(
    (c) =>
      c.targetNodeId === nodeId &&
      c.targetParameter === paramName &&
      isVirtualNodeId(c.sourceNodeId)
  );
}

export function findAutomationLaneForParam(
  graph: NodeGraph,
  nodeId: string,
  paramName: string
) {
  return graph.automation?.lanes.find(
    (l) => l.nodeId === nodeId && l.paramName === paramName
  );
}

/** Remove the automation lane for `(nodeId, paramName)` when present. */
export function detachAnimationDriverForParam(
  graph: NodeGraph,
  nodeId: string,
  paramName: string
): NodeGraph {
  const lane = findAutomationLaneForParam(graph, nodeId, paramName);
  if (!lane) return graph;
  return removeAutomationLane(graph, lane.id);
}

/** Remove the audio-driver virtual connection for `(nodeId, paramName)` when present. */
export function detachAudioDriverForParam(
  graph: NodeGraph,
  nodeId: string,
  paramName: string
): NodeGraph {
  const conn = findAudioDriverConnection(graph, nodeId, paramName);
  if (!conn) return graph;
  return removeConnection(graph, conn.id);
}

/** Disconnect the MIDI envelope driver from `(nodeId, paramName)`; envelope preset stays in the graph. */
export function detachMidiDriverForParam(
  graph: NodeGraph,
  nodeId: string,
  paramName: string
): NodeGraph {
  return unbindMidiEnvelopeBindingForParam(graph, nodeId, paramName);
}

/** Strip conflicting animation + MIDI drivers before attaching audio on `(nodeId, paramName)`. */
export function prepareGraphForAudioDriverAttach(
  graph: NodeGraph,
  nodeId: string,
  paramName: string
): NodeGraph {
  let next = detachAnimationDriverForParam(graph, nodeId, paramName);
  next = detachMidiDriverForParam(next, nodeId, paramName);
  return next;
}

/** Strip conflicting audio + MIDI drivers before attaching animation on `(nodeId, paramName)`. */
export function prepareGraphForAnimationDriverAttach(
  graph: NodeGraph,
  nodeId: string,
  paramName: string
): NodeGraph {
  let next = detachAudioDriverForParam(graph, nodeId, paramName);
  next = detachMidiDriverForParam(next, nodeId, paramName);
  return next;
}

/**
 * After a new audio virtual-wire connection: default input mode to override (when unset)
 * and apply param-scoped Out on the connection for remapper signals (gate stays on remapper).
 */
export function applyAudioDriverVirtualWireAttachEffects(
  graph: NodeGraph,
  audioSetup: AudioSetup,
  sourceVirtualNodeId: string,
  targetNodeId: string,
  targetParameter: string,
  paramSpec: ParameterSpec | undefined
): { graph: NodeGraph; audioSetup: AudioSetup } {
  if (!isVirtualNodeId(sourceVirtualNodeId) || !targetParameter) {
    return { graph, audioSetup };
  }

  let nextGraph = graph;
  const targetNode = graph.nodes.find((n) => n.id === targetNodeId);
  if (targetNode) {
    nextGraph = updateNodeParameterInputMode(nextGraph, targetNodeId, targetParameter, 'override');
  }

  const { outMin, outMax } = defaultDriverRemapOutForParam(paramSpec);
  const connection = nextGraph.connections.find(
    (c) =>
      c.sourceNodeId === sourceVirtualNodeId &&
      c.targetNodeId === targetNodeId &&
      c.targetParameter === targetParameter
  );
  if (connection) {
    nextGraph = updateConnectionDriverOut(nextGraph, connection.id, {
      driverOutMin: outMin,
      driverOutMax: outMax,
    });
  }

  const signalId = getSignalIdFromVirtualNodeId(sourceVirtualNodeId);
  let nextSetup = audioSetup;

  if (signalId.startsWith('remap-')) {
    const remapperId = signalId.slice(6);
    const existing = audioSetup.remappers.find((r) => r.id === remapperId);
    if (existing && (existing.inMin == null || existing.inMax == null)) {
      nextSetup = updateAudioRemapper(nextSetup, remapperId, (r) => ({
        ...r,
        inMin: r.inMin ?? DRIVER_REMAP_DEFAULT_IN.inMin,
        inMax: r.inMax ?? DRIVER_REMAP_DEFAULT_IN.inMax,
      }));
    }
  }

  return { graph: nextGraph, audioSetup: nextSetup };
}

/** Apply param-scoped Out on the binding when attaching a MIDI remapper to a parameter port. */
export function applyMidiRemapperConnectDefaults(
  graph: NodeGraph,
  remapperId: string,
  nodeId: string,
  paramName: string,
  paramSpec: ParameterSpec | undefined
): NodeGraph {
  const { outMin, outMax } = defaultDriverRemapOutForParam(paramSpec);
  const binding = findMidiEnvelopeBindingForParam(graph, nodeId, paramName);
  if (binding?.remapperId === remapperId) {
    return updateMidiEnvelopeBindingOut(graph, binding.id, { outMin, outMax });
  }
  return graph;
}

/** Strip conflicting audio + animation drivers before attaching MIDI on `(nodeId, paramName)`. */
export function prepareGraphForMidiDriverAttach(
  graph: NodeGraph,
  nodeId: string,
  paramName: string
): NodeGraph {
  let next = detachAudioDriverForParam(graph, nodeId, paramName);
  next = detachAnimationDriverForParam(next, nodeId, paramName);
  return next;
}

/** Returns the attached driver kind that conflicts with `targetKind`, or null when safe to attach. */
export function getConflictingDriverKind(
  graph: NodeGraph,
  nodeId: string,
  paramName: string,
  audioSetup: AudioSetup,
  targetKind: Exclude<AttachedDriverKind, null>
): AttachedDriverKind | null {
  const attached = resolveDriverKindForParam(graph, nodeId, paramName, audioSetup);
  if (attached == null || attached === targetKind) return null;
  return attached;
}
