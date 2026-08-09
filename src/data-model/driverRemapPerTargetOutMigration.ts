/**
 * Migrate driver remap output range from remapper records to per-target storage.
 *
 * Audio: `Connection.driverOutMin` / `driverOutMax` on virtual remap → parameter wires.
 * MIDI: `MidiEnvelopeBinding.outMin` / `outMax`.
 *
 * Idempotent: skips targets that already have Out; strips legacy remapper Out after copy.
 */

import type { Connection, NodeGraph } from './types';
import type { AudioRemapperEntry, AudioSetup } from './audioSetupTypes';
import type { MidiEnvelopeBinding, MidiEnvelopeRemapper } from './midiEnvelopeTypes';
import { DEFAULT_MIDI_ENVELOPE_REMAPPER_OUTPUT } from './midiEnvelopeTypes';
import { DEFAULT_DRIVER_CONNECTION_OUT } from '../utils/driverRemap';
import { isVirtualNodeId } from './virtualNodes';

type LegacyAudioRemapper = AudioRemapperEntry & { outMin?: number; outMax?: number };
type LegacyMidiRemapper = MidiEnvelopeRemapper & { outMin?: number; outMax?: number };

function legacyRemapperOut(
  remapper: LegacyAudioRemapper | LegacyMidiRemapper
): { outMin: number; outMax: number } {
  const outMin =
    typeof remapper.outMin === 'number' && Number.isFinite(remapper.outMin)
      ? remapper.outMin
      : DEFAULT_DRIVER_CONNECTION_OUT.outMin;
  const outMax =
    typeof remapper.outMax === 'number' && Number.isFinite(remapper.outMax)
      ? remapper.outMax
      : DEFAULT_DRIVER_CONNECTION_OUT.outMax;
  return { outMin, outMax };
}

function stripAudioRemapperOut(remapper: LegacyAudioRemapper): AudioRemapperEntry {
  const { id, name, bandId, inMin, inMax } = remapper;
  return { id, name, bandId, inMin, inMax };
}

function stripMidiRemapperOut(remapper: LegacyMidiRemapper): MidiEnvelopeRemapper {
  const { id, name, envelopePresetId, inMin, inMax } = remapper;
  return {
    id,
    envelopePresetId,
    inMin,
    inMax,
    ...(name !== undefined ? { name } : {}),
  };
}

function connectionNeedsDriverOut(connection: Connection): boolean {
  return (
    isVirtualNodeId(connection.sourceNodeId) &&
    typeof connection.targetParameter === 'string' &&
    connection.targetParameter.length > 0 &&
    (connection.driverOutMin === undefined || connection.driverOutMax === undefined)
  );
}

function bindingNeedsOut(binding: MidiEnvelopeBinding): boolean {
  return (
    binding.nodeId.length > 0 &&
    binding.paramName.length > 0 &&
    (typeof binding.outMin !== 'number' ||
      !Number.isFinite(binding.outMin) ||
      typeof binding.outMax !== 'number' ||
      !Number.isFinite(binding.outMax))
  );
}

function bandOutForRemapper(
  audioSetup: AudioSetup,
  remapper: AudioRemapperEntry
): { outMin: number; outMax: number } | undefined {
  const band = audioSetup.bands.find((b) => b.id === remapper.bandId);
  if (!band) return undefined;
  return {
    outMin: band.remapOutMin ?? 0,
    outMax: band.remapOutMax ?? 1,
  };
}

function resolveTargetOutForRemapper(
  audioSetup: AudioSetup,
  remapperId: string,
  remapperOutById: Map<string, { outMin: number; outMax: number }>
): { outMin: number; outMax: number } {
  const legacy = remapperOutById.get(remapperId);
  if (legacy) return legacy;
  const remapper = audioSetup.remappers.find((r) => r.id === remapperId);
  if (remapper) {
    const bandOut = bandOutForRemapper(audioSetup, remapper);
    if (bandOut) return bandOut;
  }
  return DEFAULT_DRIVER_CONNECTION_OUT;
}

export function migrateAudioRemapperOutToConnections(
  graph: NodeGraph,
  audioSetup: AudioSetup | undefined
): { graph: NodeGraph; audioSetup: AudioSetup | undefined } {
  if (!audioSetup?.remappers.length) {
    return { graph, audioSetup };
  }

  const remapperOutById = new Map<string, { outMin: number; outMax: number }>();
  for (const remapper of audioSetup.remappers as LegacyAudioRemapper[]) {
    if (typeof remapper.outMin === 'number' || typeof remapper.outMax === 'number') {
      remapperOutById.set(remapper.id, legacyRemapperOut(remapper));
    }
  }

  const hasLegacyRemapperOut = remapperOutById.size > 0;
  const connectionsNeedOut = graph.connections.some(connectionNeedsDriverOut);

  if (!hasLegacyRemapperOut && !connectionsNeedOut) {
    const stripped = audioSetup.remappers.map((r) => stripAudioRemapperOut(r as LegacyAudioRemapper));
    const anyStrip =
      stripped.some((r, i) => JSON.stringify(r) !== JSON.stringify(audioSetup.remappers[i]));
    return anyStrip ? { graph, audioSetup: { ...audioSetup, remappers: stripped } } : { graph, audioSetup };
  }

  let graphChanged = false;
  const nextConnections = graph.connections.map((connection) => {
    if (!connectionNeedsDriverOut(connection)) return connection;

    const signalMatch = connection.sourceNodeId.match(/^audio-signal:remap-(.+)$/);
    if (!signalMatch) return connection;

    const remapperId = signalMatch[1]!;
    const legacyOut = resolveTargetOutForRemapper(audioSetup, remapperId, remapperOutById);
    graphChanged = true;
    return {
      ...connection,
      driverOutMin: connection.driverOutMin ?? legacyOut.outMin,
      driverOutMax: connection.driverOutMax ?? legacyOut.outMax,
    };
  });

  const nextRemappers = audioSetup.remappers.map((r) => stripAudioRemapperOut(r as LegacyAudioRemapper));
  const audioChanged =
    nextRemappers.some((r, i) => JSON.stringify(r) !== JSON.stringify(audioSetup.remappers[i])) ||
    graphChanged;

  return {
    graph: graphChanged ? { ...graph, connections: nextConnections } : graph,
    audioSetup: audioChanged ? { ...audioSetup, remappers: nextRemappers } : audioSetup,
  };
}

export function migrateMidiRemapperOutToBindings(graph: NodeGraph): NodeGraph {
  const remappers = graph.midiEnvelopeRemappers as LegacyMidiRemapper[] | undefined;
  const bindings = graph.midiEnvelopeBindings;
  if (!remappers?.length && !bindings?.length) return graph;

  const remapperOutById = new Map<string, { outMin: number; outMax: number }>();
  for (const remapper of remappers ?? []) {
    if (typeof remapper.outMin === 'number' || typeof remapper.outMax === 'number') {
      remapperOutById.set(remapper.id, legacyRemapperOut(remapper));
    }
  }

  const hasLegacyRemapperOut = remapperOutById.size > 0;
  const bindingsNeedOut = bindings?.some(bindingNeedsOut) ?? false;

  if (!hasLegacyRemapperOut && !bindingsNeedOut) {
    if (!remappers?.length) return graph;
    const stripped = remappers.map(stripMidiRemapperOut);
    const anyStrip = stripped.some((r, i) => JSON.stringify(r) !== JSON.stringify(remappers[i]));
    return anyStrip ? { ...graph, midiEnvelopeRemappers: stripped } : graph;
  }

  let bindingsChanged = false;
  const nextBindings = (bindings ?? []).map((binding) => {
    const legacyOut = remapperOutById.get(binding.remapperId);
    if (legacyOut) {
      if (binding.outMin === legacyOut.outMin && binding.outMax === legacyOut.outMax) {
        return binding;
      }
      bindingsChanged = true;
      return { ...binding, outMin: legacyOut.outMin, outMax: legacyOut.outMax };
    }
    if (!bindingNeedsOut(binding)) return binding;
    bindingsChanged = true;
    return {
      ...binding,
      outMin: DEFAULT_MIDI_ENVELOPE_REMAPPER_OUTPUT.outMin,
      outMax: DEFAULT_MIDI_ENVELOPE_REMAPPER_OUTPUT.outMax,
    };
  });

  const nextRemappers = remappers?.map(stripMidiRemapperOut);
  const remappersChanged =
    nextRemappers != null &&
    nextRemappers.some((r, i) => JSON.stringify(r) !== JSON.stringify(remappers![i]));

  if (!bindingsChanged && !remappersChanged) return graph;

  return {
    ...graph,
    ...(nextRemappers && nextRemappers.length > 0 ? { midiEnvelopeRemappers: nextRemappers } : {}),
    ...(nextBindings.length > 0 ? { midiEnvelopeBindings: nextBindings } : {}),
  };
}

/** Copy remapper Out to all targets, then strip remapper Out fields. */
export function migrateDriverRemapOutToTargets(
  graph: NodeGraph,
  audioSetup: AudioSetup | undefined
): { graph: NodeGraph; audioSetup: AudioSetup | undefined } {
  const midiGraph = migrateMidiRemapperOutToBindings(graph);
  return migrateAudioRemapperOutToConnections(midiGraph, audioSetup);
}