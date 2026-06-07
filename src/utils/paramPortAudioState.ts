/**
 * Resolves connection state (default | graph-connected | audio-connected),
 * signal name for audio-connected params, and live value for peak meter.
 * Parent (NodeBody or param renderer) uses these to pass props to ParamPort/ParameterCell.
 */

import type { ArrangementSnapshot } from '../audiotool/arrangement/types';
import type { NodeGraph } from '../data-model/types';
import type { NodeSpec } from '../types/nodeSpec';
import type { IAudioManager } from '../runtime/types';
import type { AudioSetup } from '../data-model/audioSetupTypes';
import {
  envelopePresetIdForBinding,
  findMidiEnvelopeBindingForParam,
  findMidiEnvelopeRemapper,
} from '../data-model/immutableUpdatesMidiEnvelope';
import {
  getNamedSignalsFromAudioSetup,
  getSignalIdFromVirtualNodeId,
  isVirtualNodeId,
} from './virtualNodes';
import { applyDriverRemap } from './driverRemap';
import {
  getMidiEnvelopeFramePresetShape,
  syncMidiEnvelopeFrame,
} from './midiEnvelopeFrameCache';

export type ParamPortConnectionState = 'default' | 'graph-connected' | 'audio-connected';

export interface ParamPortConnectionInfo {
  state: ParamPortConnectionState;
  signalName: string;
}

/** Label + live meter shown in the parameter cell when an audio or MIDI driver is attached. */
export interface ParamPortDriverCellDisplay {
  label: string;
  /** 0–1 fill width for the peak meter beside the port */
  meterLevel: number;
  kind: 'audio' | 'midi';
  meterAriaLabel: string;
}

interface ParamPortDriverCellLabelInfo {
  label: string;
  kind: 'audio' | 'midi';
  envelopePresetId?: string;
  inMin?: number;
  inMax?: number;
}

/**
 * Resolve connection state and signal name for a parameter port.
 *
 * - No connection → state='default', signalName=''
 * - Connection to real node → state='graph-connected', signalName=''
 * - Connection to virtual node (audio signal) → state='audio-connected', signalName from getNamedSignalsFromAudioSetup
 */
export function getParamPortConnectionState(
  targetNodeId: string,
  targetParameter: string,
  graph: NodeGraph,
  audioSetup: AudioSetup
): ParamPortConnectionInfo {
  const connection = graph.connections.find(
    conn => conn.targetNodeId === targetNodeId && conn.targetParameter === targetParameter
  );

  if (!connection) {
    return { state: 'default', signalName: '' };
  }

  if (isVirtualNodeId(connection.sourceNodeId)) {
    const signals = getNamedSignalsFromAudioSetup(audioSetup);
    const match = signals.find(s => s.virtualNodeId === connection.sourceNodeId);
    return {
      state: 'audio-connected',
      signalName: match?.name ?? '',
    };
  }

  return { state: 'graph-connected', signalName: '' };
}

/**
 * Gated input level (0–1) for an audio driver on a parameter port — used by the port peak meter.
 * Returns null when the connection is not an audio virtual wire or level cannot be resolved.
 */
export function getAudioDriverGatedMeterLevel(
  targetNodeId: string,
  targetParameter: string,
  graph: NodeGraph,
  audioSetup: AudioSetup,
  audioManager?: IAudioManager
): number | null {
  const connection = graph.connections.find(
    (conn) =>
      !conn.disabled &&
      conn.targetNodeId === targetNodeId &&
      conn.targetParameter === targetParameter
  );
  if (!connection || !isVirtualNodeId(connection.sourceNodeId)) return null;

  const signalId = getSignalIdFromVirtualNodeId(connection.sourceNodeId);
  if (!signalId) return null;

  const bandRawMatch = signalId.match(/^band-(.+)-raw$/);
  if (bandRawMatch) {
    const bandId = bandRawMatch[1]!;
    const live = audioManager?.getPanelBandLiveValues?.(bandId, {
      inMin: 0,
      inMax: 1,
      outMin: 0,
      outMax: 1,
    });
    const incoming = live?.incoming;
    if (incoming == null || !isFinite(incoming)) return null;
    return Math.max(0, Math.min(1, incoming));
  }

  const remapMatch = signalId.match(/^remap-(.+)$/);
  if (remapMatch) {
    const remapperId = remapMatch[1]!;
    const remapper = audioSetup.remappers.find((r) => r.id === remapperId);
    if (!remapper) return null;
    const live = audioManager?.getPanelBandLiveValues?.(remapper.bandId, {
      inMin: remapper.inMin,
      inMax: remapper.inMax,
      outMin: 0,
      outMax: 1,
    });
    const incoming = live?.incoming;
    if (incoming == null || !isFinite(incoming)) return null;
    return applyDriverRemap(incoming, remapper.inMin, remapper.inMax, 0, 1);
  }

  return null;
}

/**
 * @deprecated Use {@link getAudioDriverGatedMeterLevel}. Kept for barrel export compatibility.
 */
export function getParamPortLiveValue(
  targetNodeId: string,
  targetParameter: string,
  graph: NodeGraph,
  _nodeSpecs: Map<string, NodeSpec>,
  audioManager?: IAudioManager,
  audioSetup?: AudioSetup
): number | null {
  if (!audioSetup) return null;
  return getAudioDriverGatedMeterLevel(
    targetNodeId,
    targetParameter,
    graph,
    audioSetup,
    audioManager
  );
}

function resolveParamPortDriverCellLabel(
  targetNodeId: string,
  targetParameter: string,
  graph: NodeGraph,
  audioSetup: AudioSetup
): ParamPortDriverCellLabelInfo | null {
  const audio = getParamPortConnectionState(targetNodeId, targetParameter, graph, audioSetup);
  if (audio.state === 'audio-connected' && audio.signalName) {
    return { label: audio.signalName, kind: 'audio' };
  }

  const binding = findMidiEnvelopeBindingForParam(graph, targetNodeId, targetParameter);
  if (!binding || binding.disabled) return null;

  const remapper = findMidiEnvelopeRemapper(graph, binding.remapperId);
  const label = remapper?.name?.trim() || 'Remap';
  const envelopePresetId = envelopePresetIdForBinding(graph, binding);
  return {
    label,
    kind: 'midi',
    envelopePresetId,
    inMin: remapper?.inMin,
    inMax: remapper?.inMax,
  };
}

function clampMeterLevel(value: number | null | undefined): number {
  if (value === null || value === undefined || !isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

/**
 * Static label for a driver-attached parameter port (audio remap name or MIDI remap name).
 */
export function getParamPortDriverCellLabel(
  targetNodeId: string,
  targetParameter: string,
  graph: NodeGraph,
  audioSetup: AudioSetup
): string {
  return resolveParamPortDriverCellLabel(targetNodeId, targetParameter, graph, audioSetup)?.label ?? '';
}

/**
 * Resolve driver cell chrome (remap name + 0–1 meter) for audio or MIDI drivers.
 * Returns null when no driver label applies (graph wire only, animation-only, etc.).
 */
export function resolveParamPortDriverCellDisplay(
  targetNodeId: string,
  targetParameter: string,
  graph: NodeGraph,
  audioSetup: AudioSetup,
  options?: {
    nodeSpecs?: Map<string, NodeSpec>;
    audioManager?: IAudioManager;
    transportTime?: number;
    snapshot?: ArrangementSnapshot | null;
  }
): ParamPortDriverCellDisplay | null {
  const labelInfo = resolveParamPortDriverCellLabel(targetNodeId, targetParameter, graph, audioSetup);
  if (!labelInfo) return null;

  let meterLevel = 0;
  if (labelInfo.kind === 'audio') {
    meterLevel = clampMeterLevel(
      getAudioDriverGatedMeterLevel(
        targetNodeId,
        targetParameter,
        graph,
        audioSetup,
        options?.audioManager
      )
    );
  } else if (labelInfo.envelopePresetId) {
    const snapshot = options?.snapshot ?? audioSetup.arrangementSnapshot ?? undefined;
    if (snapshot) {
      syncMidiEnvelopeFrame(graph, snapshot, options?.transportTime ?? 0);
      const shape = getMidiEnvelopeFramePresetShape(labelInfo.envelopePresetId);
      const inMin = labelInfo.inMin ?? 0;
      const inMax = labelInfo.inMax ?? 1;
      meterLevel = clampMeterLevel(
        applyDriverRemap(shape ?? 0, inMin, inMax, 0, 1)
      );
    }
  }

  const meterAriaLabel =
    labelInfo.kind === 'midi' ? 'MIDI envelope level' : 'Input signal level';

  return {
    label: labelInfo.label,
    meterLevel,
    kind: labelInfo.kind,
    meterAriaLabel,
  };
}
