/**

 * Per-transport-time MIDI envelope evaluation cache.

 * Evaluates preset ADSR once per unique envelope preset per timeline sample; remapper range per binding.

 */



import type { ArrangementNote, ArrangementSnapshot } from '../audiotool/arrangement/types';

import type { NodeGraph } from '../data-model/types';

import type { MidiEnvelopeDefinition, ResolvedMidiEnvelopeBinding } from '../data-model/midiEnvelopeTypes';

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

}



let cachedSnapshot: ArrangementSnapshot | undefined;

let cachedBindingsRef: NodeGraph['midiEnvelopeBindings'];

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



function filterNotesPreservingSort(

  notes: readonly ArrangementNote[],

  trackIds: string[]

): readonly ArrangementNote[] {

  if (!trackIds.length) return [];

  const allowed = new Set(trackIds);

  return notes.filter((n) => allowed.has(n.trackId));

}



function rebuildBindingCache(

  graph: NodeGraph,

  snapshot: ArrangementSnapshot,

  bindings: NonNullable<NodeGraph['midiEnvelopeBindings']>

): void {

  entries = [];

  const allNotes = snapshot.notes ?? [];

  for (const binding of bindings) {

    if (!isMidiEnvelopeBindingBound(binding)) continue;

    const resolved = resolveMidiEnvelopeBinding(graph, binding);

    if (!resolved) continue;

    const remapper = graph.midiEnvelopeRemappers?.find((r) => r.id === binding.remapperId);

    if (!remapper) continue;

    const { outMin: _outMin, outMax: _outMax, ...envelopeOnly } = resolved.envelope;

    entries.push({

      binding: resolved,

      envelopePresetId: remapper.envelopePresetId,

      notes: filterNotesPreservingSort(allNotes, resolved.trackIds),

      envelope: envelopeOnly,

    });

  }

  cachedSnapshot = snapshot;

  cachedBindingsRef = bindings;

}



export function hasActiveMidiEnvelopeBindings(graph: NodeGraph | null | undefined): boolean {

  const bindings = graph?.midiEnvelopeBindings;

  if (!bindings?.length) return false;

  return bindings.some((b) => isMidiEnvelopeBindingBound(b));

}



export function invalidateMidiEnvelopeFrameCache(): void {

  cachedSnapshot = undefined;

  cachedBindingsRef = undefined;

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

 * Evaluate all bound MIDI envelopes at `transportTime` when snapshot/bindings/time changed.

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



  if (cachedSnapshot !== snapshot || cachedBindingsRef !== bindings) {

    rebuildBindingCache(graph, snapshot, bindings);

    lastTransportTime = NaN;

  }



  if (!force && transportTime === lastTransportTime) {

    return;

  }



  frameValuesByParamKey.clear();

  frameValuesByBindingId.clear();

  levelByPresetId.clear();



  for (const { envelopePresetId, notes, envelope } of entries) {

    if (levelByPresetId.has(envelopePresetId)) continue;

    levelByPresetId.set(

      envelopePresetId,

      evaluateMidiEnvelopePresetLevelAtTime(notes, envelope, transportTime)

    );

  }



  for (const { binding, envelopePresetId } of entries) {

    if (binding.disabled) continue;

    const presetLevel = levelByPresetId.get(envelopePresetId)!;

    const value = evaluateMidiEnvelopeBindingAtTime(

      binding,

      [],

      transportTime,

      presetLevel

    );

    frameValuesByParamKey.set(midiEnvelopeParamKey(binding.nodeId, binding.paramName), value);

    frameValuesByBindingId.set(binding.id, value);

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



  const bindings = graph?.midiEnvelopeBindings;

  if (!bindings?.length || !snapshot) return updates;



  for (const binding of bindings) {

    if (!isMidiEnvelopeBindingBound(binding)) continue;

    const key = midiEnvelopeParamKey(binding.nodeId, binding.paramName);

    const value = frameValuesByParamKey.get(key);

    if (value === undefined) continue;

    const prev = previousValues.get(key);

    if (forcePushAll || prev === undefined || Math.abs(value - prev) > threshold) {

      updates.push({ nodeId: binding.nodeId, paramName: binding.paramName, value });

      previousValues.set(key, value);

    }

  }

  return updates;

}


