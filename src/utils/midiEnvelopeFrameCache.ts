/**
 * Per-transport-time MIDI envelope evaluation cache.
 * Evaluates preset ADSR once per unique envelope preset per timeline sample; remapper range per binding.
 */

import type { ArrangementNote, ArrangementSnapshot } from '../audiotool/arrangement/types';
import type { NodeGraph } from '../data-model/types';
import type {
  MidiEnvelopeDefinition,
  MidiEnvelopeRetriggerPolicy,
  ResolvedMidiEnvelopeBinding,
} from '../data-model/midiEnvelopeTypes';
import { resolveMidiEnvelopeRetriggerPolicy } from '../data-model/midiEnvelopeTypes';
import { isMidiEnvelopeBindingBound } from '../data-model/midiEnvelopeTypes';
import { resolveMidiEnvelopeBinding } from '../data-model/immutableUpdatesMidiEnvelope';
import {
  evaluateMidiEnvelopeBindingAtTime,
  evaluateMidiEnvelopePresetLevelAtTime,
  type MidiEnvelopePresetLevel,
  type MidiEnvelopeUniformUpdate,
} from './midiEnvelopeEvaluator';

interface BindingCacheEntry {
  binding: ResolvedMidiEnvelopeBinding;
  envelopePresetId: string;
  notes: readonly ArrangementNote[];
  envelope: MidiEnvelopeDefinition;
  retriggerPolicy: MidiEnvelopeRetriggerPolicy;
}

let cachedSnapshot: ArrangementSnapshot | undefined;
let cachedBindingsRef: NodeGraph['midiEnvelopeBindings'];
let cachedPresetsRef: NodeGraph['midiEnvelopePresets'];
let cachedRemappersRef: NodeGraph['midiEnvelopeRemappers'];
let entries: BindingCacheEntry[] = [];
const frameValuesByParamKey = new Map<string, number>();
const frameValuesByBindingId = new Map<string, number>();
/** Preset-level ADSR shape cache for the current transport sample (cleared each sync). */
const levelByPresetId = new Map<string, MidiEnvelopePresetLevel>();
let lastTransportTime = NaN;
let frameRevision = 0;

/** Reused each collect call; treat return as ephemeral. */
const collectedMidiEnvelopeUniformUpdatesScratch: MidiEnvelopeUniformUpdate[] = [];

export function midiEnvelopeParamKey(nodeId: string, paramName: string): string {
  return `${nodeId}.${paramName}`;
}

/** Inverse of {@link midiEnvelopeParamKey}; node ids are UUIDs (no dots). */
export function parseMidiEnvelopeParamKey(
  key: string
): { nodeId: string; paramName: string } | null {
  const dot = key.indexOf('.');
  if (dot <= 0 || dot === key.length - 1) return null;
  return { nodeId: key.slice(0, dot), paramName: key.slice(dot + 1) };
}

/** Static graph parameter value to restore when a MIDI driver is disconnected. */
export function resolveMidiDriverRestoredUniformValue(
  graph: NodeGraph,
  nodeId: string,
  paramName: string
): number | undefined {
  const node = graph.nodes.find((n) => n.id === nodeId);
  if (!node) return undefined;
  const raw = node.parameters[paramName];
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined;
}

function filterNotesPreservingSort(
  notes: readonly ArrangementNote[],
  trackIds: string[]
): readonly ArrangementNote[] {
  if (!trackIds.length) return [];
  const allowed = new Set(trackIds);
  return notes.filter((n) => allowed.has(n.trackId));
}

function midiEnvelopeCacheInputsChanged(
  graph: NodeGraph,
  snapshot: ArrangementSnapshot,
  bindings: NonNullable<NodeGraph['midiEnvelopeBindings']>
): boolean {
  return (
    cachedSnapshot !== snapshot ||
    cachedBindingsRef !== bindings ||
    cachedPresetsRef !== graph.midiEnvelopePresets ||
    cachedRemappersRef !== graph.midiEnvelopeRemappers
  );
}

/** Per-binding resolved config for one evaluation pass (export-local or preview cache). */
export function buildMidiEnvelopeBindingCacheEntries(
  graph: NodeGraph,
  snapshot: ArrangementSnapshot,
  bindings: NonNullable<NodeGraph['midiEnvelopeBindings']>
): BindingCacheEntry[] {
  const result: BindingCacheEntry[] = [];
  const allNotes = snapshot.notes ?? [];
  for (const binding of bindings) {
    if (!isMidiEnvelopeBindingBound(binding)) continue;
    const resolved = resolveMidiEnvelopeBinding(graph, binding);
    if (!resolved) continue;
    const remapper = graph.midiEnvelopeRemappers?.find((r) => r.id === binding.remapperId);
    if (!remapper) continue;
    const { outMin: _outMin, outMax: _outMax, ...envelopeOnly } = resolved.envelope;
    const preset = graph.midiEnvelopePresets?.find((p) => p.id === remapper.envelopePresetId);
    result.push({
      binding: resolved,
      envelopePresetId: remapper.envelopePresetId,
      notes: filterNotesPreservingSort(allNotes, resolved.trackIds),
      envelope: envelopeOnly,
      retriggerPolicy: resolveMidiEnvelopeRetriggerPolicy(preset?.retriggerPolicy),
    });
  }
  return result;
}

export interface MidiEnvelopeUniformValuesAtTime {
  valuesByParamKey: ReadonlyMap<string, number>;
  valuesByBindingId: ReadonlyMap<string, number>;
  levelByPresetId: ReadonlyMap<string, MidiEnvelopePresetLevel>;
}

/**
 * Pure per-transport-time MIDI envelope evaluation (local Maps only).
 * Used by export and by preview frame cache — preview must not call this during
 * live jobs without going through {@link syncMidiEnvelopeFrame} module cache.
 */
export function evaluateMidiEnvelopeUniformsAtTime(
  entries: readonly BindingCacheEntry[],
  transportTime: number
): MidiEnvelopeUniformValuesAtTime {
  const levelByPresetId = new Map<string, MidiEnvelopePresetLevel>();
  const valuesByParamKey = new Map<string, number>();
  const valuesByBindingId = new Map<string, number>();

  for (const { envelopePresetId, notes, envelope, retriggerPolicy } of entries) {
    if (levelByPresetId.has(envelopePresetId)) continue;
    levelByPresetId.set(
      envelopePresetId,
      evaluateMidiEnvelopePresetLevelAtTime(notes, envelope, transportTime, retriggerPolicy)
    );
  }

  for (const { binding, envelopePresetId } of entries) {
    if (binding.disabled) continue;
    const presetLevel = levelByPresetId.get(envelopePresetId)!;
    const value = evaluateMidiEnvelopeBindingAtTime(binding, [], transportTime, presetLevel);
    valuesByParamKey.set(midiEnvelopeParamKey(binding.nodeId, binding.paramName), value);
    valuesByBindingId.set(binding.id, value);
  }

  return { valuesByParamKey, valuesByBindingId, levelByPresetId };
}

function rebuildBindingCache(
  graph: NodeGraph,
  snapshot: ArrangementSnapshot,
  bindings: NonNullable<NodeGraph['midiEnvelopeBindings']>
): void {
  entries = buildMidiEnvelopeBindingCacheEntries(graph, snapshot, bindings);
  cachedSnapshot = snapshot;
  cachedBindingsRef = bindings;
  cachedPresetsRef = graph.midiEnvelopePresets;
  cachedRemappersRef = graph.midiEnvelopeRemappers;
}

export function hasActiveMidiEnvelopeBindings(graph: NodeGraph | null | undefined): boolean {
  const bindings = graph?.midiEnvelopeBindings;
  if (!bindings?.length) return false;
  return bindings.some((b) => isMidiEnvelopeBindingBound(b));
}

export function invalidateMidiEnvelopeFrameCache(): void {
  cachedSnapshot = undefined;
  cachedBindingsRef = undefined;
  cachedPresetsRef = undefined;
  cachedRemappersRef = undefined;
  entries = [];
  frameValuesByParamKey.clear();
  frameValuesByBindingId.clear();
  levelByPresetId.clear();
  lastTransportTime = NaN;
  frameRevision++;
}

/** @internal Vitest isolation */
export function resetMidiEnvelopeFrameCacheForTests(): void {
  invalidateMidiEnvelopeFrameCache();
}

/**
 * Evaluate all bound MIDI envelopes at `transportTime` when snapshot/bindings/config/time changed.
 */
export function syncMidiEnvelopeFrame(
  graph: NodeGraph | null | undefined,
  snapshot: ArrangementSnapshot | undefined,
  transportTime: number,
  force = false
): void {
  const bindings = graph?.midiEnvelopeBindings;
  if (!graph || !bindings?.length || !snapshot) {
    if (cachedSnapshot !== undefined || entries.length > 0) {
      invalidateMidiEnvelopeFrameCache();
    }
    return;
  }

  if (midiEnvelopeCacheInputsChanged(graph, snapshot, bindings)) {
    rebuildBindingCache(graph, snapshot, bindings);
    lastTransportTime = NaN;
  }

  if (!force && transportTime === lastTransportTime) {
    return;
  }

  frameValuesByParamKey.clear();
  frameValuesByBindingId.clear();
  levelByPresetId.clear();

  const evaluated = evaluateMidiEnvelopeUniformsAtTime(entries, transportTime);
  for (const [key, value] of evaluated.valuesByParamKey) {
    frameValuesByParamKey.set(key, value);
  }
  for (const [key, value] of evaluated.valuesByBindingId) {
    frameValuesByBindingId.set(key, value);
  }
  for (const [key, level] of evaluated.levelByPresetId) {
    levelByPresetId.set(key, level);
  }

  lastTransportTime = transportTime;
  frameRevision++;
}

export function getMidiEnvelopeFrameValue(nodeId: string, paramName: string): number | undefined {
  return frameValuesByParamKey.get(midiEnvelopeParamKey(nodeId, paramName));
}

export function getMidiEnvelopeFrameValueByBindingId(bindingId: string): number | undefined {
  return frameValuesByBindingId.get(bindingId);
}

/** Normalized ADSR shape (0–1) for a preset at the current transport sample; undefined before sync. */
export function getMidiEnvelopeFramePresetShape(presetId: string): number | undefined {
  return levelByPresetId.get(presetId)?.shape;
}

export function getMidiEnvelopeFrameRevision(): number {
  return frameRevision;
}

/**
 * @internal Vitest — same buffer is returned across calls when length is reset each invocation.
 */
export function getMidiEnvelopeUniformUpdatesScratchBufferForTests(): MidiEnvelopeUniformUpdate[] {
  return collectedMidiEnvelopeUniformUpdatesScratch;
}

export function collectMidiEnvelopeUniformUpdatesFromFrame(
  graph: NodeGraph | null | undefined,
  transportTime: number,
  snapshot: ArrangementSnapshot | undefined,
  previousValues: Map<string, number>,
  threshold: number,
  forcePushAll = false
): MidiEnvelopeUniformUpdate[] {
  syncMidiEnvelopeFrame(graph, snapshot, transportTime, forcePushAll);

  const updates = collectedMidiEnvelopeUniformUpdatesScratch;
  updates.length = 0;

  const activeKeys = new Set<string>();
  const bindings = graph?.midiEnvelopeBindings;
  if (bindings?.length && snapshot) {
    for (const binding of bindings) {
      if (!isMidiEnvelopeBindingBound(binding)) continue;
      const key = midiEnvelopeParamKey(binding.nodeId, binding.paramName);
      activeKeys.add(key);
      const value = frameValuesByParamKey.get(key);
      if (value === undefined) continue;
      const prev = previousValues.get(key);
      if (forcePushAll || prev === undefined || Math.abs(value - prev) > threshold) {
        updates.push({ nodeId: binding.nodeId, paramName: binding.paramName, value });
        previousValues.set(key, value);
      }
    }
  }

  if (!graph) return updates;

  for (const [key, prev] of previousValues) {
    if (activeKeys.has(key)) continue;
    const parsed = parseMidiEnvelopeParamKey(key);
    if (!parsed) {
      previousValues.delete(key);
      continue;
    }
    const restore = resolveMidiDriverRestoredUniformValue(
      graph,
      parsed.nodeId,
      parsed.paramName
    );
    previousValues.delete(key);
    if (restore === undefined) continue;
    if (forcePushAll || Math.abs(restore - prev) > threshold) {
      updates.push({
        nodeId: parsed.nodeId,
        paramName: parsed.paramName,
        value: restore,
      });
    }
  }

  return updates;
}
