/**
 * Parameter driver bypass — read/write helpers for connection, animation lane, and MIDI binding.
 * Precedence matches resolveDriverKindForParam: connection → MIDI binding → evaluable animation lane.
 */

import type { NodeGraph } from '../data-model/types';
import { setConnectionDisabled } from '../data-model/immutableUpdates';
import { setAutomationLaneDisabled } from '../data-model/immutableUpdatesAutomation';
import {
  findMidiEnvelopeBindingForParam,
  setMidiEnvelopeBindingDisabled,
} from '../data-model/immutableUpdatesMidiEnvelope';
import { automationLaneHasEvaluableRegions } from './automationEvaluator';

export type ParamDriverBypassTargetKind = 'connection' | 'lane' | 'binding' | null;

export interface ParamDriverBypassState {
  hasBypassTarget: boolean;
  bypassed: boolean;
  targetKind: ParamDriverBypassTargetKind;
  connectionId?: string;
  laneId?: string;
  bindingId?: string;
}

function findConnectionForParam(
  graph: NodeGraph,
  nodeId: string,
  paramName: string
) {
  return graph.connections.find(
    (c) => c.targetNodeId === nodeId && c.targetParameter === paramName
  );
}

function findEvaluableLaneForParam(graph: NodeGraph, nodeId: string, paramName: string) {
  const lane = graph.automation?.lanes?.find(
    (l) => l.nodeId === nodeId && l.paramName === paramName
  );
  if (!lane || !automationLaneHasEvaluableRegions(lane)) return undefined;
  return lane;
}

/**
 * Resolve bypass target and state for `(nodeId, paramName)`.
 * `hasBypassTarget` is true when any driver or graph wire is attached (including when bypassed).
 */
export function getParamDriverBypassState(
  graph: NodeGraph,
  nodeId: string,
  paramName: string
): ParamDriverBypassState {
  const connection = findConnectionForParam(graph, nodeId, paramName);
  if (connection) {
    return {
      hasBypassTarget: true,
      bypassed: connection.disabled === true,
      targetKind: 'connection',
      connectionId: connection.id,
    };
  }

  const binding = findMidiEnvelopeBindingForParam(graph, nodeId, paramName);
  if (binding) {
    return {
      hasBypassTarget: true,
      bypassed: binding.disabled === true,
      targetKind: 'binding',
      bindingId: binding.id,
    };
  }

  const lane = findEvaluableLaneForParam(graph, nodeId, paramName);
  if (lane) {
    return {
      hasBypassTarget: true,
      bypassed: lane.disabled === true,
      targetKind: 'lane',
      laneId: lane.id,
    };
  }

  return { hasBypassTarget: false, bypassed: false, targetKind: null };
}

/** Write bypass to the store selected by precedence (connection > MIDI > animation lane). */
export function setParamDriverBypass(
  graph: NodeGraph,
  nodeId: string,
  paramName: string,
  bypassed: boolean
): NodeGraph {
  const state = getParamDriverBypassState(graph, nodeId, paramName);
  if (!state.hasBypassTarget) return graph;

  switch (state.targetKind) {
    case 'connection':
      return state.connectionId != null
        ? setConnectionDisabled(graph, state.connectionId, bypassed)
        : graph;
    case 'binding':
      return state.bindingId != null
        ? setMidiEnvelopeBindingDisabled(graph, state.bindingId, bypassed)
        : graph;
    case 'lane':
      return state.laneId != null
        ? setAutomationLaneDisabled(graph, state.laneId, bypassed)
        : graph;
    default:
      return graph;
  }
}
