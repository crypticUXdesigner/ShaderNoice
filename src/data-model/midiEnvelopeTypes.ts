/**
 * MIDI envelope driver presets, remappers, and bindings — parameter-drivers-v1 / remappers-v1.
 *
 * **Storage:** `NodeGraph.midiEnvelopePresets` + `NodeGraph.midiEnvelopeRemappers` +
 * `NodeGraph.midiEnvelopeBindings` (serialized inside `graph` on `SerializedGraphFile`).
 * Semantically separate from `audioSetup`; note data lives in `audioSetup.arrangementSnapshot`.
 *
 * **Model (remappers-v1):** One envelope preset (tracks + ADSR) has many remappers (output range);
 * bindings reference `remapperId`. Many bindings may share one remapper.
 *
 * **Runtime policy (v1):** monophonic contour per preset via optional `retriggerPolicy` on
 * {@link MidiEnvelopePreset} (`lastNoteWins` default, `holdIfHigher`, `legato`); see
 * `evaluateMidiEnvelopePresetLevelAtTime` in `midiEnvelopeEvaluator.ts`.
 * **Track filter:** `trackIds` must list explicit tracks; empty means no notes are listened to.
 *
 * **Curves (v1):** optional per-phase presets (`attackCurve`, `decayCurve`, `releaseCurve`).
 * Omitted fields evaluate as `linear` for backward-compatible saved graphs.
 */

import type { EnvelopeCurve } from '../utils/envelopeEasing';

export type { EnvelopeCurve };

/** Note-on overlap behavior for a MIDI track set (preset-level). */
export type MidiEnvelopeRetriggerPolicy = 'lastNoteWins' | 'holdIfHigher' | 'legato';

export const MIDI_ENVELOPE_RETRIGGER_POLICIES: readonly MidiEnvelopeRetriggerPolicy[] = [
  'lastNoteWins',
  'holdIfHigher',
  'legato',
] as const;

export function isMidiEnvelopeRetriggerPolicy(value: unknown): value is MidiEnvelopeRetriggerPolicy {
  return (
    typeof value === 'string' &&
    (MIDI_ENVELOPE_RETRIGGER_POLICIES as readonly string[]).includes(value)
  );
}

/** Default when `retriggerPolicy` is omitted on a preset (backward compatible). */
export function resolveMidiEnvelopeRetriggerPolicy(
  policy: MidiEnvelopeRetriggerPolicy | undefined
): MidiEnvelopeRetriggerPolicy {
  return policy ?? 'lastNoteWins';
}

export interface MidiEnvelopeAdsr {
  /** Seconds from note-on to peak (0 → peak). */
  attackSeconds: number;
  /** Seconds from peak to sustain level. */
  decaySeconds: number;
  /** Sustain level as a fraction of peak (0–1). */
  sustainLevel: number;
  /** Seconds from note-off to silence. */
  releaseSeconds: number;
  /** Easing for attack phase; defaults to `linear` when omitted. */
  attackCurve?: EnvelopeCurve;
  /** Easing for decay phase; defaults to `linear` when omitted. */
  decayCurve?: EnvelopeCurve;
  /** Easing for release phase; defaults to `linear` when omitted. */
  releaseCurve?: EnvelopeCurve;
  /**
   * When true (default), sustain hold lasts until note-off in the arrangement.
   * When false, release begins after attack+decay (or at note-off if the note is shorter).
   */
  sustainHoldUsesNoteLength?: boolean;
}

/** ADSR + velocity scaling only (output range lives on {@link MidiEnvelopeRemapper}). */
export interface MidiEnvelopeDefinition {
  adsr: MidiEnvelopeAdsr;
  /** When true (default), note velocity (0–1) scales envelope peak before ADSR. */
  velocityToPeak?: boolean;
}

/** Normalized input gate defaults (missing on load → these values). */
export const DEFAULT_MIDI_ENVELOPE_REMAPPER_INPUT = {
  inMin: 0,
  inMax: 1,
} as const;

/** Shared input gate for a preset remapper — output range lives on each binding. */
export interface MidiEnvelopeRemapper {
  id: string;
  /** Optional display label in overview lists. */
  name?: string;
  envelopePresetId: string;
  /** Normalized gate on envelope shape (0–1) before per-target output range. */
  inMin: number;
  inMax: number;
}

/** Shared envelope preset (library entry). */
export interface MidiEnvelopePreset {
  id: string;
  /** Optional display label in overview lists. */
  label?: string;
  /** Arrangement track ids to listen for note-ons; empty = none (silent until tracks are added). */
  trackIds: string[];
  envelope: MidiEnvelopeDefinition;
  /**
   * How overlapping note-ons retrigger ADSR. Omitted or invalid on load → `lastNoteWins`.
   */
  retriggerPolicy?: MidiEnvelopeRetriggerPolicy;
}

/** One remapper bound to a parameter port (many bindings may share the same `remapperId`). */
export interface MidiEnvelopeBinding {
  id: string;
  remapperId: string;
  nodeId: string;
  paramName: string;
  /** Target output range in parameter units (required when bound to a port). */
  outMin: number;
  outMax: number;
  /**
   * Optional. When true, binding is kept but ignored by JS-side envelope evaluation (driver bypass).
   */
  disabled?: boolean;
}

/** Pre–remappers-v1 binding row referencing a preset directly. */
export interface LegacyMidiEnvelopeBindingWithPresetId {
  id: string;
  presetId: string;
  nodeId: string;
  paramName: string;
  disabled?: boolean;
}

/** Binding merged with preset + remapper for evaluation and UI editing. */
export interface ResolvedMidiEnvelopeBinding extends MidiEnvelopeBinding {
  trackIds: string[];
  envelope: MidiEnvelopeDefinition & {
    inMin: number;
    inMax: number;
    outMin: number;
    outMax: number;
  };
}

/** Pre–task-08 inline binding shape (migrated on deserialize). */
export interface LegacyMidiEnvelopeBinding {
  id: string;
  nodeId: string;
  paramName: string;
  trackIds: string[];
  envelope: MidiEnvelopeDefinition & { outMin?: number; outMax?: number };
  disabled?: boolean;
  presetId?: string;
}

export function isMidiEnvelopeBindingBound(
  binding: Pick<MidiEnvelopeBinding, 'nodeId' | 'paramName'>
): boolean {
  return binding.nodeId.length > 0 && binding.paramName.length > 0;
}

export function isLegacyInlineMidiEnvelopeBinding(
  val: unknown
): val is LegacyMidiEnvelopeBinding {
  if (!val || typeof val !== 'object') return false;
  const o = val as Record<string, unknown>;
  return typeof o.envelope === 'object' && o.envelope !== null;
}

export function isLegacyPresetIdMidiEnvelopeBinding(
  val: unknown
): val is LegacyMidiEnvelopeBindingWithPresetId {
  if (!val || typeof val !== 'object') return false;
  const o = val as Record<string, unknown>;
  return typeof o.presetId === 'string' && typeof o.remapperId !== 'string';
}

export const DEFAULT_MIDI_ENVELOPE_ADSR: MidiEnvelopeAdsr = {
  attackSeconds: 0.02,
  decaySeconds: 0.12,
  sustainLevel: 0.65,
  releaseSeconds: 0.25,
};

export const DEFAULT_MIDI_ENVELOPE_DEFINITION: MidiEnvelopeDefinition = {
  adsr: DEFAULT_MIDI_ENVELOPE_ADSR,
  velocityToPeak: true,
};

export const DEFAULT_MIDI_ENVELOPE_REMAPPER_OUTPUT = {
  outMin: 0,
  outMax: 1,
} as const;

/** Input when creating a binding/preset from code or tests (range may be supplied once). */
export type MidiEnvelopeCreateEnvelope = MidiEnvelopeDefinition & {
  outMin?: number;
  outMax?: number;
};
