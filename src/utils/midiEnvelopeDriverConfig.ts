/**
 * Detect MIDI envelope driver config changes between immutable graph snapshots.
 * Preset/remapper edits replace those arrays while often reusing `midiEnvelopeBindings` ref.
 */

import type { NodeGraph } from '../data-model/types';

export function midiEnvelopeDriverConfigChanged(
  oldGraph: NodeGraph | null | undefined,
  newGraph: NodeGraph
): boolean {
  if (!oldGraph) return false;
  return (
    oldGraph.midiEnvelopePresets !== newGraph.midiEnvelopePresets ||
    oldGraph.midiEnvelopeRemappers !== newGraph.midiEnvelopeRemappers ||
    oldGraph.midiEnvelopeBindings !== newGraph.midiEnvelopeBindings
  );
}
