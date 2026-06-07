/**
 * Immutable updates for MIDI envelope presets, remappers, and bindings on the graph.
 */

import type { NodeGraph } from './types';
import type {
  MidiEnvelopeBinding,
  MidiEnvelopeCreateEnvelope,
  MidiEnvelopeDefinition,
  MidiEnvelopePreset,
  MidiEnvelopeRemapper,
  ResolvedMidiEnvelopeBinding,
} from './midiEnvelopeTypes';
import { isMidiEnvelopeBindingBound } from './midiEnvelopeTypes';
import {
  DEFAULT_MIDI_ENVELOPE_DEFINITION,
  DEFAULT_MIDI_ENVELOPE_REMAPPER_INPUT,
  DEFAULT_MIDI_ENVELOPE_REMAPPER_OUTPUT,
} from './midiEnvelopeTypes';
import { defaultRemapperIdForPreset } from './midiEnvelopeRemapperMigration';
import { duplicateRemapperName } from './audioSetupUpdates';
import { generateUUID } from './utils';

function copyEnvelopeDefinition(envelope: MidiEnvelopeDefinition): MidiEnvelopeDefinition {
  return {
    ...envelope,
    adsr: { ...envelope.adsr },
  };
}

function copyPreset(preset: MidiEnvelopePreset): MidiEnvelopePreset {
  return {
    ...preset,
    trackIds: [...preset.trackIds],
    envelope: copyEnvelopeDefinition(preset.envelope),
  };
}

function copyRemapper(remapper: MidiEnvelopeRemapper): MidiEnvelopeRemapper {
  return { ...remapper };
}

function copyBinding(binding: MidiEnvelopeBinding): MidiEnvelopeBinding {
  return { ...binding };
}

function splitCreateEnvelope(envelope?: MidiEnvelopeCreateEnvelope): {
  presetEnvelope: MidiEnvelopeDefinition;
  outMin: number;
  outMax: number;
} {
  const source = envelope ?? {
    ...DEFAULT_MIDI_ENVELOPE_DEFINITION,
    ...DEFAULT_MIDI_ENVELOPE_REMAPPER_OUTPUT,
  };
  const {
    outMin = DEFAULT_MIDI_ENVELOPE_REMAPPER_OUTPUT.outMin,
    outMax = DEFAULT_MIDI_ENVELOPE_REMAPPER_OUTPUT.outMax,
    adsr,
    velocityToPeak,
  } = source;
  return {
    presetEnvelope: {
      adsr: { ...(adsr ?? DEFAULT_MIDI_ENVELOPE_DEFINITION.adsr) },
      ...(velocityToPeak === false ? { velocityToPeak: false } : {}),
    },
    outMin,
    outMax,
  };
}

export function copyMidiEnvelopePresets(
  presets: MidiEnvelopePreset[] | undefined
): MidiEnvelopePreset[] | undefined {
  if (!presets?.length) return presets;
  return presets.map(copyPreset);
}

export function copyMidiEnvelopeRemappers(
  remappers: MidiEnvelopeRemapper[] | undefined
): MidiEnvelopeRemapper[] | undefined {
  if (!remappers?.length) return remappers;
  return remappers.map(copyRemapper);
}

export function copyMidiEnvelopeBindings(
  bindings: MidiEnvelopeBinding[] | undefined
): MidiEnvelopeBinding[] | undefined {
  if (!bindings?.length) return bindings;
  return bindings.map(copyBinding);
}

export function findMidiEnvelopePreset(
  graph: NodeGraph,
  presetId: string
): MidiEnvelopePreset | undefined {
  return graph.midiEnvelopePresets?.find((p) => p.id === presetId);
}

export function findMidiEnvelopeRemapper(
  graph: NodeGraph,
  remapperId: string
): MidiEnvelopeRemapper | undefined {
  return graph.midiEnvelopeRemappers?.find((r) => r.id === remapperId);
}

export function envelopePresetIdForBinding(
  graph: NodeGraph,
  binding: Pick<MidiEnvelopeBinding, 'remapperId'>
): string | undefined {
  return findMidiEnvelopeRemapper(graph, binding.remapperId)?.envelopePresetId;
}

export function findBindingsForRemapper(
  graph: NodeGraph,
  remapperId: string
): MidiEnvelopeBinding[] {
  return graph.midiEnvelopeBindings?.filter((b) => b.remapperId === remapperId) ?? [];
}

export function findBoundBindingsForRemapper(
  graph: NodeGraph,
  remapperId: string
): MidiEnvelopeBinding[] {
  return findBindingsForRemapper(graph, remapperId).filter(isMidiEnvelopeBindingBound);
}

/** Bindings whose remapper references the given preset. */
export function findBindingsForPreset(
  graph: NodeGraph,
  presetId: string
): MidiEnvelopeBinding[] {
  const remapperIds = new Set(
    graph.midiEnvelopeRemappers
      ?.filter((r) => r.envelopePresetId === presetId)
      .map((r) => r.id) ?? []
  );
  return graph.midiEnvelopeBindings?.filter((b) => remapperIds.has(b.remapperId)) ?? [];
}

export function findBoundBindingsForPreset(
  graph: NodeGraph,
  presetId: string
): MidiEnvelopeBinding[] {
  return findBindingsForPreset(graph, presetId).filter(isMidiEnvelopeBindingBound);
}

export function resolveMidiEnvelopeBinding(
  graph: NodeGraph,
  binding: MidiEnvelopeBinding
): ResolvedMidiEnvelopeBinding | undefined {
  const current =
    graph.midiEnvelopeBindings?.find((b) => b.id === binding.id) ?? binding;
  const remapper = findMidiEnvelopeRemapper(graph, current.remapperId);
  if (!remapper) return undefined;
  const preset = findMidiEnvelopePreset(graph, remapper.envelopePresetId);
  if (!preset) return undefined;
  return {
    ...current,
    trackIds: preset.trackIds,
    envelope: {
      ...copyEnvelopeDefinition(preset.envelope),
      inMin: remapper.inMin,
      inMax: remapper.inMax,
      outMin: current.outMin,
      outMax: current.outMax,
    },
  };
}

export function findMidiEnvelopeBindingForParam(
  graph: NodeGraph,
  nodeId: string,
  paramName: string
): MidiEnvelopeBinding | undefined {
  return graph.midiEnvelopeBindings?.find(
    (b) =>
      isMidiEnvelopeBindingBound(b) && b.nodeId === nodeId && b.paramName === paramName
  );
}

export function hasMidiEnvelopeBindingForParam(
  graph: NodeGraph,
  nodeId: string,
  paramName: string
): boolean {
  return findMidiEnvelopeBindingForParam(graph, nodeId, paramName) !== undefined;
}

function ensureDefaultRemapperForPreset(
  graph: NodeGraph,
  presetId: string
): NodeGraph {
  const remapperId = defaultRemapperIdForPreset(presetId);
  if (findMidiEnvelopeRemapper(graph, remapperId)) return graph;
  const remapper: MidiEnvelopeRemapper = {
    id: remapperId,
    envelopePresetId: presetId,
    inMin: DEFAULT_MIDI_ENVELOPE_REMAPPER_INPUT.inMin,
    inMax: DEFAULT_MIDI_ENVELOPE_REMAPPER_INPUT.inMax,
  };
  const remappers = graph.midiEnvelopeRemappers ?? [];
  return { ...graph, midiEnvelopeRemappers: [...remappers, remapper] };
}

export function addMidiEnvelopePreset(
  graph: NodeGraph,
  options: {
    id?: string;
    label?: string;
    trackIds?: string[];
    envelope?: MidiEnvelopeDefinition;
    outMin?: number;
    outMax?: number;
  } = {}
): NodeGraph {
  const presetId = options.id ?? generateUUID();
  const { presetEnvelope } = splitCreateEnvelope(
    options.envelope
      ? {
          ...options.envelope,
          ...(options.outMin !== undefined ? { outMin: options.outMin } : {}),
          ...(options.outMax !== undefined ? { outMax: options.outMax } : {}),
        }
      : undefined
  );
  const preset: MidiEnvelopePreset = {
    id: presetId,
    ...(options.label ? { label: options.label } : {}),
    trackIds: options.trackIds ? [...options.trackIds] : [],
    envelope: presetEnvelope,
  };
  const presets = graph.midiEnvelopePresets ?? [];
  const withPreset = {
    ...graph,
    midiEnvelopePresets: [...presets, preset],
  };
  return ensureDefaultRemapperForPreset(withPreset, presetId);
}

export function bindMidiEnvelopeRemapperToParam(
  graph: NodeGraph,
  remapperId: string,
  nodeId: string,
  paramName: string,
  options: {
    bindingId?: string;
    replaceExisting?: boolean;
    outMin?: number;
    outMax?: number;
  } = {}
): NodeGraph {
  if (!findMidiEnvelopeRemapper(graph, remapperId)) return graph;

  let next = graph;
  const existingForParam = findMidiEnvelopeBindingForParam(next, nodeId, paramName);
  if (existingForParam) {
    if (existingForParam.remapperId === remapperId && existingForParam.nodeId === nodeId) {
      return next;
    }
    if (options.replaceExisting !== false) {
      next = removeMidiEnvelopeBinding(next, existingForParam.id);
    }
  }

  const outMin = options.outMin ?? DEFAULT_MIDI_ENVELOPE_REMAPPER_OUTPUT.outMin;
  const outMax = options.outMax ?? DEFAULT_MIDI_ENVELOPE_REMAPPER_OUTPUT.outMax;
  const bindings = next.midiEnvelopeBindings ?? [];
  const binding: MidiEnvelopeBinding = {
    id: options.bindingId ?? generateUUID(),
    remapperId,
    nodeId,
    paramName,
    outMin,
    outMax,
  };
  return {
    ...next,
    midiEnvelopeBindings: [...bindings, binding],
  };
}

export function bindMidiEnvelopePresetToParam(
  graph: NodeGraph,
  presetId: string,
  nodeId: string,
  paramName: string,
  options: { bindingId?: string; replaceExisting?: boolean } = {}
): NodeGraph {
  if (!findMidiEnvelopePreset(graph, presetId)) return graph;
  const withRemapper = ensureDefaultRemapperForPreset(graph, presetId);
  return bindMidiEnvelopeRemapperToParam(
    withRemapper,
    defaultRemapperIdForPreset(presetId),
    nodeId,
    paramName,
    options
  );
}

export function addMidiEnvelopeBinding(
  graph: NodeGraph,
  nodeId: string,
  paramName: string,
  options: {
    trackIds?: string[];
    envelope?: MidiEnvelopeCreateEnvelope;
    id?: string;
    presetId?: string;
  } = {}
): NodeGraph {
  const presetId = options.presetId ?? options.id ?? generateUUID();
  const { presetEnvelope, outMin, outMax } = splitCreateEnvelope(options.envelope);
  const withPreset = addMidiEnvelopePreset(graph, {
    id: presetId,
    trackIds: options.trackIds,
    envelope: presetEnvelope,
    outMin,
    outMax,
  });
  return bindMidiEnvelopeRemapperToParam(
    withPreset,
    defaultRemapperIdForPreset(presetId),
    nodeId,
    paramName,
    { bindingId: options.id, outMin, outMax }
  );
}

export function addMidiEnvelopeRemapper(
  graph: NodeGraph,
  envelopePresetId: string,
  options: {
    id?: string;
    name?: string;
    inMin?: number;
    inMax?: number;
  } = {}
): NodeGraph {
  if (!findMidiEnvelopePreset(graph, envelopePresetId)) return graph;
  const remapper: MidiEnvelopeRemapper = {
    id: options.id ?? generateUUID(),
    envelopePresetId,
    ...(options.name !== undefined ? { name: options.name } : {}),
    inMin: options.inMin ?? DEFAULT_MIDI_ENVELOPE_REMAPPER_INPUT.inMin,
    inMax: options.inMax ?? DEFAULT_MIDI_ENVELOPE_REMAPPER_INPUT.inMax,
  };
  const remappers = graph.midiEnvelopeRemappers ?? [];
  return { ...graph, midiEnvelopeRemappers: [...remappers, remapper] };
}

export function removeMidiEnvelopeRemapper(
  graph: NodeGraph,
  remapperId: string
): NodeGraph {
  const remappers = graph.midiEnvelopeRemappers;
  if (!remappers?.length) return graph;
  const nextRemappers = remappers.filter((r) => r.id !== remapperId);
  if (nextRemappers.length === remappers.length) return graph;

  const nextBindings =
    graph.midiEnvelopeBindings?.filter((b) => b.remapperId !== remapperId) ?? [];

  return {
    ...graph,
    midiEnvelopeRemappers: nextRemappers.length > 0 ? nextRemappers : undefined,
    midiEnvelopeBindings: nextBindings.length > 0 ? nextBindings : undefined,
  };
}

export function duplicateMidiEnvelopeRemapper(
  graph: NodeGraph,
  remapperId: string,
  options: { newId?: string } = {}
): NodeGraph {
  const source = findMidiEnvelopeRemapper(graph, remapperId);
  if (!source) return graph;
  const siblingNames = (graph.midiEnvelopeRemappers ?? [])
    .filter((r) => r.envelopePresetId === source.envelopePresetId)
    .map((r) => r.name ?? '');
  const duplicate: MidiEnvelopeRemapper = {
    ...copyRemapper(source),
    id: options.newId ?? generateUUID(),
    name: duplicateRemapperName(source.name ?? '', siblingNames),
  };
  const remappers = graph.midiEnvelopeRemappers ?? [];
  return { ...graph, midiEnvelopeRemappers: [...remappers, duplicate] };
}

export function updateMidiEnvelopeRemapper(
  graph: NodeGraph,
  remapperId: string,
  patch: Partial<Pick<MidiEnvelopeRemapper, 'name' | 'inMin' | 'inMax'>>
): NodeGraph {
  const remappers = graph.midiEnvelopeRemappers;
  if (!remappers?.length) return graph;
  let changed = false;
  const next = remappers.map((r) => {
    if (r.id !== remapperId) return r;
    changed = true;
    return {
      ...r,
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.inMin !== undefined ? { inMin: patch.inMin } : {}),
      ...(patch.inMax !== undefined ? { inMax: patch.inMax } : {}),
    };
  });
  return changed ? { ...graph, midiEnvelopeRemappers: next } : graph;
}

export function updateMidiEnvelopeBindingOut(
  graph: NodeGraph,
  bindingId: string,
  patch: Partial<Pick<MidiEnvelopeBinding, 'outMin' | 'outMax'>>
): NodeGraph {
  const bindings = graph.midiEnvelopeBindings;
  if (!bindings?.length) return graph;
  let changed = false;
  const next = bindings.map((b) => {
    if (b.id !== bindingId) return b;
    changed = true;
    return {
      ...b,
      ...(patch.outMin !== undefined ? { outMin: patch.outMin } : {}),
      ...(patch.outMax !== undefined ? { outMax: patch.outMax } : {}),
    };
  });
  return changed ? { ...graph, midiEnvelopeBindings: next } : graph;
}

export function defaultOutputRangeForPreset(
  graph: NodeGraph,
  presetId: string
): { outMin: number; outMax: number } {
  const binding = findBoundBindingsForPreset(graph, presetId)[0];
  if (binding) {
    return { outMin: binding.outMin, outMax: binding.outMax };
  }
  return { ...DEFAULT_MIDI_ENVELOPE_REMAPPER_OUTPUT };
}

export function updateMidiEnvelopePreset(
  graph: NodeGraph,
  presetId: string,
  patch: Partial<Pick<MidiEnvelopePreset, 'label' | 'trackIds' | 'envelope' | 'retriggerPolicy'>>
): NodeGraph {
  const presets = graph.midiEnvelopePresets;
  if (!presets?.length) return graph;
  let changed = false;
  const next = presets.map((p) => {
    if (p.id !== presetId) return p;
    changed = true;
    return {
      ...p,
      ...(patch.label !== undefined ? { label: patch.label } : {}),
      ...(patch.trackIds !== undefined ? { trackIds: [...patch.trackIds] } : {}),
      ...(patch.envelope !== undefined
        ? { envelope: copyEnvelopeDefinition(patch.envelope) }
        : {}),
      ...(patch.retriggerPolicy !== undefined
        ? { retriggerPolicy: patch.retriggerPolicy }
        : {}),
    };
  });
  return changed ? { ...graph, midiEnvelopePresets: next } : graph;
}

export function updateMidiEnvelopeBinding(
  graph: NodeGraph,
  bindingId: string,
  patch: Partial<Pick<MidiEnvelopeBinding, 'nodeId' | 'paramName' | 'disabled' | 'outMin' | 'outMax'>>
): NodeGraph {
  const bindings = graph.midiEnvelopeBindings;
  if (!bindings?.length) return graph;
  let changed = false;
  const next = bindings.map((b) => {
    if (b.id !== bindingId) return b;
    changed = true;
    return {
      ...b,
      ...(patch.nodeId !== undefined ? { nodeId: patch.nodeId } : {}),
      ...(patch.paramName !== undefined ? { paramName: patch.paramName } : {}),
      ...(patch.outMin !== undefined ? { outMin: patch.outMin } : {}),
      ...(patch.outMax !== undefined ? { outMax: patch.outMax } : {}),
      ...(patch.disabled !== undefined
        ? { disabled: patch.disabled ? true : undefined }
        : {}),
    };
  });
  return changed ? { ...graph, midiEnvelopeBindings: next } : graph;
}

/** Set whether a MIDI envelope binding is bypassed (ignored by evaluation) without removing it. */
export function setMidiEnvelopeBindingDisabled(
  graph: NodeGraph,
  bindingId: string,
  disabled: boolean
): NodeGraph {
  const nextDisabled = disabled ? true : undefined;
  const bindings = graph.midiEnvelopeBindings;
  if (!bindings?.length) return graph;
  const prev = bindings.find((b) => b.id === bindingId);
  if (!prev || prev.disabled === nextDisabled) return graph;
  return updateMidiEnvelopeBinding(graph, bindingId, { disabled });
}

export function removeMidiEnvelopeBinding(
  graph: NodeGraph,
  bindingId: string
): NodeGraph {
  const bindings = graph.midiEnvelopeBindings;
  if (!bindings?.length) return graph;
  const next = bindings.filter((b) => b.id !== bindingId);
  if (next.length === bindings.length) return graph;
  return {
    ...graph,
    midiEnvelopeBindings: next.length > 0 ? next : undefined,
  };
}

export function removeMidiEnvelopePreset(
  graph: NodeGraph,
  presetId: string
): NodeGraph {
  const presets = graph.midiEnvelopePresets;
  if (!presets?.length) return graph;
  const nextPresets = presets.filter((p) => p.id !== presetId);
  if (nextPresets.length === presets.length) return graph;

  const remapperIdsToRemove = new Set(
    graph.midiEnvelopeRemappers
      ?.filter((r) => r.envelopePresetId === presetId)
      .map((r) => r.id) ?? []
  );
  const nextRemappers =
    graph.midiEnvelopeRemappers?.filter((r) => r.envelopePresetId !== presetId) ?? [];
  const nextBindings =
    graph.midiEnvelopeBindings?.filter((b) => !remapperIdsToRemove.has(b.remapperId)) ?? [];

  return {
    ...graph,
    midiEnvelopePresets: nextPresets.length > 0 ? nextPresets : undefined,
    midiEnvelopeRemappers: nextRemappers.length > 0 ? nextRemappers : undefined,
    midiEnvelopeBindings: nextBindings.length > 0 ? nextBindings : undefined,
  };
}

/** Attach a remapper to `(nodeId, paramName)` by adding a binding row. */
export function connectMidiEnvelopeRemapperToParam(
  graph: NodeGraph,
  remapperId: string,
  nodeId: string,
  paramName: string,
  options: {
    bindingId?: string;
    replaceExisting?: boolean;
    outMin?: number;
    outMax?: number;
  } = {}
): NodeGraph {
  return bindMidiEnvelopeRemapperToParam(graph, remapperId, nodeId, paramName, options);
}

/**
 * Attach an existing binding's remapper to another `(nodeId, paramName)`.
 */
export function connectMidiEnvelopeBindingToParam(
  graph: NodeGraph,
  sourceBindingId: string,
  nodeId: string,
  paramName: string
): NodeGraph {
  const source = graph.midiEnvelopeBindings?.find((b) => b.id === sourceBindingId);
  if (!source) return graph;
  return connectMidiEnvelopeRemapperToParam(graph, source.remapperId, nodeId, paramName, {
    outMin: source.outMin,
    outMax: source.outMax,
  });
}

export function connectMidiEnvelopePresetToParam(
  graph: NodeGraph,
  presetId: string,
  nodeId: string,
  paramName: string
): NodeGraph {
  const existingForParam = findMidiEnvelopeBindingForParam(graph, nodeId, paramName);
  const remapperId = defaultRemapperIdForPreset(presetId);
  if (existingForParam?.remapperId === remapperId) return graph;
  return bindMidiEnvelopePresetToParam(graph, presetId, nodeId, paramName);
}

/** Disconnect envelope from a parameter port; preset stays in the library. */
export function unbindMidiEnvelopeBindingForParam(
  graph: NodeGraph,
  nodeId: string,
  paramName: string
): NodeGraph {
  const binding = findMidiEnvelopeBindingForParam(graph, nodeId, paramName);
  if (!binding) return graph;
  return removeMidiEnvelopeBinding(graph, binding.id);
}

/** @deprecated Prefer {@link unbindMidiEnvelopeBindingForParam} for port disconnect. */
export function removeMidiEnvelopeBindingForParam(
  graph: NodeGraph,
  nodeId: string,
  paramName: string
): NodeGraph {
  return unbindMidiEnvelopeBindingForParam(graph, nodeId, paramName);
}
