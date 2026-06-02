/**
 * Migrate MIDI envelope output range from presets to graph remappers.
 * Bindings reference `remapperId` instead of `presetId`.
 *
 * Idempotent: default remapper id is `remapper-{presetId}` (mirror `band-{bandId}` audio migration).
 */

import type { NodeGraph } from './types';
import type {
  MidiEnvelopeBinding,
  MidiEnvelopePreset,
  MidiEnvelopeRemapper,
} from './midiEnvelopeTypes';
import {
  DEFAULT_MIDI_ENVELOPE_REMAPPER_OUTPUT,
  isLegacyPresetIdMidiEnvelopeBinding,
} from './midiEnvelopeTypes';

type PresetEnvelopeWithLegacyRange = MidiEnvelopePreset['envelope'] & {
  outMin?: number;
  outMax?: number;
};

export function defaultRemapperIdForPreset(presetId: string): string {
  return `remapper-${presetId}`;
}

function extractPresetOutputRange(preset: MidiEnvelopePreset): { outMin: number; outMax: number } {
  const env = preset.envelope as PresetEnvelopeWithLegacyRange;
  const outMin =
    typeof env.outMin === 'number' && Number.isFinite(env.outMin)
      ? env.outMin
      : DEFAULT_MIDI_ENVELOPE_REMAPPER_OUTPUT.outMin;
  const outMax =
    typeof env.outMax === 'number' && Number.isFinite(env.outMax)
      ? env.outMax
      : DEFAULT_MIDI_ENVELOPE_REMAPPER_OUTPUT.outMax;
  return { outMin, outMax };
}

function stripPresetOutputRange(preset: MidiEnvelopePreset): MidiEnvelopePreset {
  const env = preset.envelope as PresetEnvelopeWithLegacyRange;
  const { adsr, velocityToPeak } = env;
  return {
    ...preset,
    envelope: {
      adsr: { ...adsr },
      ...(velocityToPeak === false ? { velocityToPeak: false } : {}),
    },
  };
}

function ensureDefaultRemapperForPreset(
  remappers: MidiEnvelopeRemapper[],
  remapperIds: Set<string>,
  preset: MidiEnvelopePreset
): void {
  const remapperId = defaultRemapperIdForPreset(preset.id);
  if (remapperIds.has(remapperId)) return;
  const { outMin, outMax } = extractPresetOutputRange(preset);
  remappers.push({
    id: remapperId,
    envelopePresetId: preset.id,
    outMin,
    outMax,
  });
  remapperIds.add(remapperId);
}

/**
 * Migrate preset-level `outMin`/`outMax` to `midiEnvelopeRemappers` and rewrite bindings.
 * Safe to run on every load after {@link migrateLegacyMidiEnvelopeBindings}.
 */
export function migrateMidiEnvelopePresetToRemappers(graph: NodeGraph): NodeGraph {
  const presets = graph.midiEnvelopePresets ?? [];
  const bindings = graph.midiEnvelopeBindings ?? [];

  if (!presets.length && !bindings.length) {
    return graph;
  }

  const hasLegacyPresetBindings = bindings.some(isLegacyPresetIdMidiEnvelopeBinding);
  const existingRemappers = graph.midiEnvelopeRemappers ?? [];

  if (
    !hasLegacyPresetBindings &&
    bindings.every(
      (b): b is MidiEnvelopeBinding =>
        typeof (b as MidiEnvelopeBinding).remapperId === 'string'
    )
  ) {
    const strippedPresets = presets.map(stripPresetOutputRange);
    const hasLegacyRangeOnPreset = presets.some((p) => {
      const env = p.envelope as PresetEnvelopeWithLegacyRange;
      return typeof env.outMin === 'number' || typeof env.outMax === 'number';
    });
    if (!hasLegacyRangeOnPreset && existingRemappers.length >= presets.length) {
      return {
        ...graph,
        midiEnvelopePresets: strippedPresets.length > 0 ? strippedPresets : undefined,
      };
    }
  }

  const nextRemappers: MidiEnvelopeRemapper[] = [...existingRemappers];
  const remapperIds = new Set(nextRemappers.map((r) => r.id));

  for (const preset of presets) {
    ensureDefaultRemapperForPreset(nextRemappers, remapperIds, preset);
  }

  const nextBindings: MidiEnvelopeBinding[] = [];
  for (const raw of bindings) {
    if (isLegacyPresetIdMidiEnvelopeBinding(raw)) {
      const remapperId = defaultRemapperIdForPreset(raw.presetId);
      const preset = presets.find((p) => p.id === raw.presetId);
      if (preset) {
        ensureDefaultRemapperForPreset(nextRemappers, remapperIds, preset);
      } else if (!remapperIds.has(remapperId)) {
        nextRemappers.push({
          id: remapperId,
          envelopePresetId: raw.presetId,
          ...DEFAULT_MIDI_ENVELOPE_REMAPPER_OUTPUT,
        });
        remapperIds.add(remapperId);
      }
      nextBindings.push({
        id: raw.id,
        remapperId,
        nodeId: raw.nodeId,
        paramName: raw.paramName,
        ...(raw.disabled === true ? { disabled: true } : {}),
      });
    } else {
      nextBindings.push(raw as MidiEnvelopeBinding);
    }
  }

  const strippedPresets = presets.map(stripPresetOutputRange);

  return {
    ...graph,
    midiEnvelopePresets: strippedPresets.length > 0 ? strippedPresets : undefined,
    midiEnvelopeRemappers: nextRemappers.length > 0 ? nextRemappers : undefined,
    midiEnvelopeBindings: nextBindings.length > 0 ? nextBindings : undefined,
  };
}
