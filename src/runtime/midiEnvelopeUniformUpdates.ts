/**
 * Push MIDI envelope driver values to shader uniforms each frame (JS-side, not GLSL bake).
 */

import type { NodeGraph } from '../data-model/types';
import type { ArrangementSnapshot } from '../audiotool/arrangement/types';
import { collectMidiEnvelopeUniformUpdatesFromFrame } from '../utils/midiEnvelopeFrameCache';

const VALUE_CHANGE_THRESHOLD = 1e-5;

export function applyMidiEnvelopeUniformUpdates(
  graph: NodeGraph | null,
  transportTime: number,
  snapshot: ArrangementSnapshot | undefined,
  setParameter: (nodeId: string, paramName: string, value: number) => void,
  setParameters: (updates: Array<{ nodeId: string; paramName: string; value: number }>) => void,
  previousValues: Map<string, number>,
  forcePushAll = false
): void {
  const updates = collectMidiEnvelopeUniformUpdatesFromFrame(
    graph,
    transportTime,
    snapshot,
    previousValues,
    VALUE_CHANGE_THRESHOLD,
    forcePushAll
  );
  if (updates.length === 0) return;
  if (updates.length === 1) {
    const u = updates[0]!;
    setParameter(u.nodeId, u.paramName, u.value);
    return;
  }
  setParameters(updates);
}
