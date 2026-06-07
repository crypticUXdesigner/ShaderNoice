/**
 * MIDI envelope ADSR evaluation from arrangement snapshot notes.
 *
 * **Policy (v1):** monophonic contour per preset — `lastNoteWins` (default), `holdIfHigher`,
 * or `legato` on {@link MidiEnvelopePreset.retriggerPolicy}; see `evaluateMidiEnvelopePresetLevelAtTime`.
 *
 * Evaluation splits into preset-level normalized shape (0–1) and remapper-level output range.
 */

import type { ArrangementNote, ArrangementSnapshot } from '../audiotool/arrangement/types';
import type { NodeGraph, NodeInstance } from '../data-model/types';
import type {
  MidiEnvelopeDefinition,
  MidiEnvelopeRetriggerPolicy,
  ResolvedMidiEnvelopeBinding,
  MidiEnvelopeAdsr,
} from '../data-model/midiEnvelopeTypes';
import { resolveMidiEnvelopeRetriggerPolicy } from '../data-model/midiEnvelopeTypes';
import { findMidiEnvelopeBindingForParam, resolveMidiEnvelopeBinding } from '../data-model/immutableUpdatesMidiEnvelope';
import { remapValue } from '../runtime/audio/remapValue';
import { applyDriverRemap } from './driverRemap';
import { applyEnvelopeCurve, type EnvelopeCurve } from './envelopeEasing';

const MIN_PHASE_SECONDS = 1e-6;

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function phaseProgress(elapsed: number, duration: number, curve: EnvelopeCurve = 'linear'): number {
  if (duration <= MIN_PHASE_SECONDS) return 1;
  const linear = clamp01(elapsed / duration);
  return applyEnvelopeCurve(linear, curve);
}

/** When sustain does not follow note length, release starts here (still respects early note-off). */
export function resolveMidiEnvelopeReleaseStartSeconds(
  noteStartSeconds: number,
  noteOffSeconds: number,
  adsr: MidiEnvelopeAdsr
): number {
  if (adsr.sustainHoldUsesNoteLength !== false) {
    return noteOffSeconds;
  }
  const afterDecay =
    noteStartSeconds +
    Math.max(0, adsr.attackSeconds) +
    Math.max(0, adsr.decaySeconds);
  return Math.min(noteOffSeconds, afterDecay);
}

/**
 * Compute raw envelope level (0–peak) for a single note at transport time `t`.
 */
export function computeAdsrLevelAtTime(
  transportTime: number,
  noteStartSeconds: number,
  noteOffSeconds: number,
  adsr: MidiEnvelopeAdsr,
  peak: number
): number {
  const { attackSeconds, decaySeconds, sustainLevel, releaseSeconds } = adsr;
  const attackCurve = adsr.attackCurve ?? 'linear';
  const decayCurve = adsr.decayCurve ?? 'linear';
  const releaseCurve = adsr.releaseCurve ?? 'linear';
  const sustainVal = peak * clamp01(sustainLevel);

  if (transportTime < noteStartSeconds) return 0;

  const releaseStartSeconds = resolveMidiEnvelopeReleaseStartSeconds(
    noteStartSeconds,
    noteOffSeconds,
    adsr
  );

  if (transportTime >= releaseStartSeconds) {
    const releaseElapsed = transportTime - releaseStartSeconds;
    if (releaseSeconds <= MIN_PHASE_SECONDS) return 0;
    if (releaseElapsed >= releaseSeconds) return 0;
    const releaseProgress = phaseProgress(releaseElapsed, releaseSeconds, releaseCurve);
    return sustainVal * (1 - releaseProgress);
  }

  const elapsed = transportTime - noteStartSeconds;

  if (elapsed < attackSeconds) {
    const attackProgress = phaseProgress(elapsed, attackSeconds, attackCurve);
    return peak * attackProgress;
  }

  const afterAttack = elapsed - attackSeconds;
  if (afterAttack < decaySeconds) {
    const decayProgress = phaseProgress(afterAttack, decaySeconds, decayCurve);
    return peak - (peak - sustainVal) * decayProgress;
  }

  return sustainVal;
}

function filterNotesForBinding(
  notes: readonly ArrangementNote[],
  trackIds: string[]
): ArrangementNote[] {
  if (!trackIds.length) return [];
  const allowed = new Set(trackIds);
  return notes.filter((n) => allowed.has(n.trackId));
}

/**
 * Last-note-wins on a sorted note slice (global snapshot order preserved after track filter).
 * Among equal `startSeconds`, the earliest note in slice order wins (matches legacy linear scan).
 */
export function findActiveNoteInSortedFilteredNotes(
  notes: readonly ArrangementNote[],
  transportTime: number
): ArrangementNote | null {
  if (notes.length === 0 || transportTime < notes[0]!.startSeconds) {
    return null;
  }

  let lo = 0;
  let hi = notes.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (notes[mid]!.startSeconds <= transportTime) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  const lastIdx = lo - 1;
  if (lastIdx < 0) return null;

  const maxStart = notes[lastIdx]!.startSeconds;
  let firstIdx = lastIdx;
  while (firstIdx > 0 && notes[firstIdx - 1]!.startSeconds === maxStart) {
    firstIdx--;
  }
  return notes[firstIdx]!;
}

/** Index of the active note in a sorted filtered slice; -1 when none. */
export function findActiveNoteIndexInSortedFilteredNotes(
  notes: readonly ArrangementNote[],
  transportTime: number
): number {
  if (notes.length === 0 || transportTime < notes[0]!.startSeconds) {
    return -1;
  }

  let lo = 0;
  let hi = notes.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (notes[mid]!.startSeconds <= transportTime) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  const lastIdx = lo - 1;
  if (lastIdx < 0) return -1;

  const maxStart = notes[lastIdx]!.startSeconds;
  let firstIdx = lastIdx;
  while (firstIdx > 0 && notes[firstIdx - 1]!.startSeconds === maxStart) {
    firstIdx--;
  }
  return firstIdx;
}

function findPriorNoteWithContribution(
  notes: readonly ArrangementNote[],
  activeIndex: number,
  envelope: MidiEnvelopeDefinition,
  transportTime: number
): ArrangementNote | null {
  for (let i = activeIndex - 1; i >= 0; i--) {
    const prior = notes[i]!;
    const priorLevel = computePresetLevelFromActiveNote(envelope, prior, transportTime);
    if (priorLevel.shape > MIN_PHASE_SECONDS) {
      return prior;
    }
  }
  return null;
}

function computeActiveShapeWithLegatoAttackSkipped(
  envelope: MidiEnvelopeDefinition,
  active: ArrangementNote,
  transportTime: number
): number {
  const peak =
    envelope.velocityToPeak !== false ? clamp01(active.velocity) : 1;
  const attackSeconds = Math.max(0, envelope.adsr.attackSeconds);
  const elapsed = transportTime - active.startSeconds;

  if (elapsed < attackSeconds) {
    return 1;
  }

  const noteOff = active.startSeconds + active.durationSeconds;
  const rawLevel = computeAdsrLevelAtTime(
    transportTime,
    active.startSeconds,
    noteOff,
    envelope.adsr,
    peak
  );
  return peak > MIN_PHASE_SECONDS ? clamp01(rawLevel / peak) : 0;
}

function evaluatePresetLevelWithPolicy(
  filteredNotes: readonly ArrangementNote[],
  envelope: MidiEnvelopeDefinition,
  transportTime: number,
  policy: MidiEnvelopeRetriggerPolicy
): MidiEnvelopePresetLevel {
  const activeIndex = findActiveNoteIndexInSortedFilteredNotes(filteredNotes, transportTime);
  if (activeIndex < 0) return SILENT_PRESET_LEVEL;

  const active = filteredNotes[activeIndex]!;
  const activeLevel = computePresetLevelFromActiveNote(envelope, active, transportTime);

  if (policy === 'lastNoteWins') {
    return activeLevel;
  }

  const prior = findPriorNoteWithContribution(
    filteredNotes,
    activeIndex,
    envelope,
    transportTime
  );
  if (!prior) {
    return activeLevel;
  }

  const priorLevel = computePresetLevelFromActiveNote(envelope, prior, transportTime);

  if (policy === 'holdIfHigher') {
    return {
      shape: Math.max(activeLevel.shape, priorLevel.shape),
      peak: activeLevel.peak,
    };
  }

  const priorElapsed = transportTime - prior.startSeconds;
  if (priorElapsed < envelope.adsr.attackSeconds) {
    return activeLevel;
  }

  const legatoShape = Math.max(
    priorLevel.shape,
    computeActiveShapeWithLegatoAttackSkipped(envelope, active, transportTime)
  );
  return { shape: legatoShape, peak: activeLevel.peak };
}

/**
 * Find the active note for last-note-wins monophonic policy at transport time `t`.
 * Expects `notes` sorted by `startSeconds` (arrangement snapshot contract).
 */
export function findActiveNoteForBinding(
  notes: ArrangementNote[],
  transportTime: number
): ArrangementNote | null {
  return findActiveNoteInSortedFilteredNotes(notes, transportTime);
}

/** Normalized ADSR shape (0–1) plus velocity peak used for output-range scaling. */
export interface MidiEnvelopePresetLevel {
  shape: number;
  peak: number;
}

const SILENT_PRESET_LEVEL: MidiEnvelopePresetLevel = { shape: 0, peak: 1 };

function computePresetLevelFromActiveNote(
  envelope: MidiEnvelopeDefinition,
  active: ArrangementNote,
  transportTime: number
): MidiEnvelopePresetLevel {
  const peak =
    envelope.velocityToPeak !== false
      ? clamp01(active.velocity)
      : 1;

  const noteOff = active.startSeconds + active.durationSeconds;
  const rawLevel = computeAdsrLevelAtTime(
    transportTime,
    active.startSeconds,
    noteOff,
    envelope.adsr,
    peak
  );

  const shape = peak > MIN_PHASE_SECONDS ? clamp01(rawLevel / peak) : 0;
  return { shape, peak };
}

/**
 * Preset-level normalized ADSR shape for a prefiltered sorted note slice (frame-cache hot path).
 */
export function evaluateMidiEnvelopePresetLevelAtTime(
  filteredNotes: readonly ArrangementNote[],
  envelope: MidiEnvelopeDefinition,
  transportTime: number,
  retriggerPolicy?: MidiEnvelopeRetriggerPolicy
): MidiEnvelopePresetLevel {
  if (!filteredNotes.length) return SILENT_PRESET_LEVEL;

  return evaluatePresetLevelWithPolicy(
    filteredNotes,
    envelope,
    transportTime,
    resolveMidiEnvelopeRetriggerPolicy(retriggerPolicy)
  );
}

/**
 * Raw ADSR level (0–1 shape before outMin/outMax remap) for a preset at transport time.
 * Returns 0 when snapshot/notes are missing or no note has started yet.
 */
export function evaluateMidiEnvelopeLevelForPresetAtTime(
  snapshot: ArrangementSnapshot | undefined,
  trackIds: string[],
  envelope: MidiEnvelopeDefinition,
  transportTime: number,
  retriggerPolicy?: MidiEnvelopeRetriggerPolicy
): number {
  const notes = snapshot?.notes;
  if (!notes?.length) return 0;

  const filtered = filterNotesForBinding(notes, trackIds);
  return evaluateMidiEnvelopePresetLevelAtTime(
    filtered,
    envelope,
    transportTime,
    retriggerPolicy
  ).shape;
}

/**
 * Raw ADSR level (0–1 before outMin/outMax remap) for a binding at transport time.
 * Returns 0 when snapshot/notes are missing or no note has started yet.
 */
export function evaluateMidiEnvelopeLevelAtTime(
  snapshot: ArrangementSnapshot | undefined,
  binding: ResolvedMidiEnvelopeBinding,
  transportTime: number
): number {
  return evaluateMidiEnvelopeLevelForPresetAtTime(
    snapshot,
    binding.trackIds,
    binding.envelope,
    transportTime
  );
}

/**
 * Remap normalized envelope shape (0–1) to parameter output range.
 */
export function remapMidiEnvelopeOutput(
  level: number,
  outMin: number,
  outMax: number
): number {
  return remapValue(level, 0, 1, outMin, outMax);
}

type RemapperEnvelopeRange = MidiEnvelopeDefinition & {
  inMin?: number;
  inMax?: number;
  outMin: number;
  outMax: number;
};

/**
 * Apply remapper in-gate then output range to a preset-level shape, including velocity-scaled outMax.
 */
export function remapMidiEnvelopeBindingOutput(
  presetLevel: MidiEnvelopePresetLevel,
  envelope: RemapperEnvelopeRange
): number {
  const inMin = envelope.inMin ?? 0;
  const inMax = envelope.inMax ?? 1;
  const { outMin, outMax } = envelope;
  const gated = applyDriverRemap(presetLevel.shape, inMin, inMax, 0, 1);
  const velScale = envelope.velocityToPeak !== false ? presetLevel.peak : 1;
  const effectiveOutMax = outMin + velScale * (outMax - outMin);
  return remapValue(gated, 0, 1, outMin, effectiveOutMax);
}

/**
 * Evaluate one binding using a prefiltered sorted note slice (frame-cache hot path).
 */
export function evaluateMidiEnvelopeBindingAtTime(
  binding: ResolvedMidiEnvelopeBinding,
  filteredNotes: readonly ArrangementNote[],
  transportTime: number,
  presetLevel?: MidiEnvelopePresetLevel,
  retriggerPolicy?: MidiEnvelopeRetriggerPolicy
): number {
  const level =
    presetLevel ??
    evaluateMidiEnvelopePresetLevelAtTime(
      filteredNotes,
      binding.envelope,
      transportTime,
      retriggerPolicy
    );

  return remapMidiEnvelopeBindingOutput(level, binding.envelope);
}

/**
 * Evaluate binding output in parameter range at transport time.
 */
export function evaluateMidiEnvelopeAtTime(
  snapshot: ArrangementSnapshot | undefined,
  binding: ResolvedMidiEnvelopeBinding,
  transportTime: number,
  retriggerPolicy?: MidiEnvelopeRetriggerPolicy
): number {
  const notes = snapshot?.notes;
  if (!notes?.length) {
    return remapMidiEnvelopeBindingOutput(SILENT_PRESET_LEVEL, binding.envelope);
  }

  const filtered = filterNotesForBinding(notes, binding.trackIds);
  return evaluateMidiEnvelopeBindingAtTime(
    binding,
    filtered,
    transportTime,
    undefined,
    retriggerPolicy
  );
}

/**
 * Helper for effective-parameter path: get MIDI envelope value for a node's parameter at time `t`.
 * Returns null when no binding exists or snapshot is absent.
 * Prefer {@link evaluateMidiEnvelopeSignalForParam} on hot UI paths (uses frame cache).
 */
export function getMidiEnvelopeValueForParam(
  node: NodeInstance,
  paramName: string,
  graph: NodeGraph,
  transportTime: number,
  snapshot: ArrangementSnapshot | undefined
): number | null {
  const binding = findMidiEnvelopeBindingForParam(graph, node.id, paramName);
  if (!binding || !snapshot) return null;
  const resolved = resolveMidiEnvelopeBinding(graph, binding);
  if (!resolved) return null;
  const remapper = graph.midiEnvelopeRemappers?.find((r) => r.id === binding.remapperId);
  const preset = remapper
    ? graph.midiEnvelopePresets?.find((p) => p.id === remapper.envelopePresetId)
    : undefined;
  return evaluateMidiEnvelopeAtTime(
    snapshot,
    resolved,
    transportTime,
    preset?.retriggerPolicy
  );
}

export interface MidiEnvelopeUniformUpdate {
  nodeId: string;
  paramName: string;
  value: number;
}

