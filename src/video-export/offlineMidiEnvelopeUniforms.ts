/**
 * Export-safe MIDI envelope uniform evaluation.
 *
 * Uses per-call local state via {@link evaluateMidiEnvelopeUniformsAtTime} — does not
 * read or write preview {@link syncMidiEnvelopeFrame} module globals, so an export job
 * cannot corrupt live preview driver readouts mid-render.
 */

import type { ArrangementSnapshot } from '../audiotool/arrangement/types';
import type { NodeGraph } from '../data-model/types';
import { isMidiEnvelopeBindingBound } from '../data-model/midiEnvelopeTypes';
import {
  buildMidiEnvelopeBindingCacheEntries,
  evaluateMidiEnvelopeUniformsAtTime,
  midiEnvelopeParamKey,
} from '../utils/midiEnvelopeFrameCache';
import type { MidiEnvelopeUniformUpdate } from '../utils/midiEnvelopeEvaluator';

/**
 * Evaluate bound MIDI envelope driver uniforms at `transportTime` for offline export.
 * Pushes every bound, enabled param (no change-threshold skip).
 */
export function getMidiEnvelopeExportUniformUpdates(
  graph: NodeGraph | null | undefined,
  snapshot: ArrangementSnapshot | undefined,
  transportTime: number
): MidiEnvelopeUniformUpdate[] {
  const bindings = graph?.midiEnvelopeBindings;
  if (!graph || !bindings?.length || !snapshot) {
    return [];
  }

  const entries = buildMidiEnvelopeBindingCacheEntries(graph, snapshot, bindings);
  const { valuesByParamKey } = evaluateMidiEnvelopeUniformsAtTime(entries, transportTime);

  const updates: MidiEnvelopeUniformUpdate[] = [];
  for (const binding of bindings) {
    if (!isMidiEnvelopeBindingBound(binding)) continue;
    const value = valuesByParamKey.get(midiEnvelopeParamKey(binding.nodeId, binding.paramName));
    if (value === undefined) continue;
    updates.push({ nodeId: binding.nodeId, paramName: binding.paramName, value });
  }
  return updates;
}
