/**
 * Migrate pre–task-08 inline MIDI envelope bindings to preset + binding rows.
 * Idempotent: skips graphs that already use `midiEnvelopePresets` without inline envelopes.
 */

import type { NodeGraph } from './types';
import type {
  LegacyMidiEnvelopeBinding,
  LegacyMidiEnvelopeBindingWithPresetId,
  MidiEnvelopePreset,
} from './midiEnvelopeTypes';
import {
  DEFAULT_MIDI_ENVELOPE_DEFINITION,
  isLegacyInlineMidiEnvelopeBinding,
  isMidiEnvelopeBindingBound,
} from './midiEnvelopeTypes';
import { generateUUID } from './utils';

function copyEnvelopeDefinition(
  envelope: LegacyMidiEnvelopeBinding['envelope'] | undefined
): MidiEnvelopePreset['envelope'] {
  const source = envelope ?? DEFAULT_MIDI_ENVELOPE_DEFINITION;
  return {
    ...source,
    adsr: { ...source.adsr },
  };
}

export function migrateLegacyMidiEnvelopeBindings(graph: NodeGraph): NodeGraph {
  const bindings = graph.midiEnvelopeBindings;
  if (!bindings?.length) {
    if (graph.midiEnvelopePresets?.length) {
      return { ...graph, midiEnvelopeBindings: bindings };
    }
    return graph;
  }

  const hasInlineLegacy = bindings.some(isLegacyInlineMidiEnvelopeBinding);
  if (!hasInlineLegacy) {
    return graph;
  }

  const presets: MidiEnvelopePreset[] = [...(graph.midiEnvelopePresets ?? [])];
  const presetIds = new Set(presets.map((p) => p.id));
  const nextBindings: LegacyMidiEnvelopeBindingWithPresetId[] = [];

  for (const raw of bindings) {
    if (!isLegacyInlineMidiEnvelopeBinding(raw)) {
      const row = raw as unknown as LegacyMidiEnvelopeBindingWithPresetId;
      if (typeof row.presetId === 'string') {
        nextBindings.push(row);
      }
      continue;
    }

    const legacy = raw as LegacyMidiEnvelopeBinding;
    const presetId = legacy.presetId ?? legacy.id;

    if (!presetIds.has(presetId)) {
      presets.push({
        id: presetId,
        trackIds: [...legacy.trackIds],
        envelope: copyEnvelopeDefinition(legacy.envelope),
      });
      presetIds.add(presetId);
    }

    if (isMidiEnvelopeBindingBound(legacy)) {
      nextBindings.push({
        id: legacy.id,
        presetId,
        nodeId: legacy.nodeId,
        paramName: legacy.paramName,
        disabled: legacy.disabled,
      });
    }
  }

  return {
    ...graph,
    midiEnvelopePresets: presets.length > 0 ? presets : undefined,
    midiEnvelopeBindings:
      nextBindings.length > 0
        ? (nextBindings as unknown as NodeGraph['midiEnvelopeBindings'])
        : undefined,
  };
}

/** @internal test helper — build a legacy inline binding graph. */
export function createLegacyInlineBindingGraph(
  graph: NodeGraph,
  legacy: LegacyMidiEnvelopeBinding
): NodeGraph {
  return {
    ...graph,
    midiEnvelopeBindings: [legacy] as unknown as NodeGraph['midiEnvelopeBindings'],
  };
}

/** @internal test helper — ensure migration assigns unique binding ids when splitting clones. */
export function nextMidiEnvelopeBindingId(): string {
  return generateUUID();
}
