/**
 * Serialization and Deserialization for Node-Based Shader System (v2.0)
 * 
 * This module provides functions to serialize node graphs to JSON and
 * deserialize JSON back to node graphs, with error handling and validation.
 */

import {
  type NodeGraph,
  type SerializedGraphFile,
  GRAPH_FILE_FORMAT,
  isKnownGraphFileFormat,
} from './types';
import type { ArrangementSnapshot } from '../audiotool/arrangement/types';
import type { AudioSetup } from './audioSetupTypes';
import type {
  MidiEnvelopeBinding,
  MidiEnvelopePreset,
  MidiEnvelopeDefinition,
  MidiEnvelopeAdsr,
  MidiEnvelopeRemapper,
} from './midiEnvelopeTypes';
import { DEFAULT_MIDI_ENVELOPE_ADSR, DEFAULT_MIDI_ENVELOPE_REMAPPER_OUTPUT } from './midiEnvelopeTypes';
import { migrateLegacyMidiEnvelopeBindings } from './midiEnvelopePresetMigration';
import { migrateMidiEnvelopePresetToRemappers } from './midiEnvelopeRemapperMigration';
import { isEnvelopeCurve } from '../utils/envelopeEasing';
import { validateGraph, validateMidiEnvelopeBindingsAgainstSnapshot } from './validation';
import type { NodeSpecification } from './validation';
import { migrateBandRemapToRemappers } from './audioBandRemapMigration';
import { migrateMixedWaveSignalShapes } from './mixedWaveSignalShapeMigration';
import { migrateShapesNodeMerges } from './shapesNodeMergeMigration';
import { ensureBandAttackReleaseHalfLives } from './audioSmoothingMigration';
import { ensureBandMode } from './audioBandModeMigration';
import { migrateDomainRepetitionToTiling } from './tilingUnifyMigration';
import { migrateRemoveColorMapNodes } from './colorMapNodeRemovalMigration';

const CURRENT_FORMAT_VERSION = '2.0' as const;

function isSupportedFormatVersion(val: unknown): val is typeof CURRENT_FORMAT_VERSION {
  return val === CURRENT_FORMAT_VERSION;
}

interface MigrationContext {
  graph: NodeGraph;
  audioSetup?: AudioSetup;
}

/**
 * Registry for file-format–level migrations keyed by SerializedGraphFile.formatVersion.
 *
 * Today we only support formatVersion "2.0". The registry is structured so future versions
 * (e.g. "2.1", "3.0") can add ordered MigrationStep lists without changing deserializeGraph.
 * To add a new version: add a key (e.g. "2.1") with an array of MigrationStep functions;
 * then extend isSupportedFormatVersion and CURRENT_FORMAT_VERSION as needed so the new
 * version is accepted and migrations run.
 *
 * Only migrations that depend on the on-disk formatVersion belong here. App-level graph
 * migrations that are independent of formatVersion (e.g. noise-node shape changes or
 * stripping legacy audio nodes for presets) are composed at a higher layer (see presetManager)
 * and intentionally remain outside this registry.
 */
type MigrationStep = (ctx: MigrationContext) => MigrationContext;

const MIGRATIONS_BY_VERSION: Record<string, MigrationStep[]> = {
  [CURRENT_FORMAT_VERSION]: [
    (ctx: MigrationContext): MigrationContext => ({
      ...ctx,
      graph: migrateDomainRepetitionToTiling(ctx.graph),
    }),
    (ctx: MigrationContext): MigrationContext => ({
      ...ctx,
      graph: migrateShapesNodeMerges(ctx.graph),
    }),
    (ctx: MigrationContext): MigrationContext => ({
      ...ctx,
      graph: migrateMixedWaveSignalShapes(ctx.graph),
    }),
    (ctx: MigrationContext): MigrationContext => {
      const audio = ctx.audioSetup;
      if (!audio || audio.bands.length === 0) return ctx;
      const migrated = migrateBandRemapToRemappers(ctx.graph, audio);
      return { graph: migrated.graph, audioSetup: migrated.audioSetup };
    },
    (ctx: MigrationContext): MigrationContext => {
      const audio = ctx.audioSetup;
      if (!audio || audio.bands.length === 0) return ctx;
      return { ...ctx, audioSetup: ensureBandAttackReleaseHalfLives(audio) };
    },
    (ctx: MigrationContext): MigrationContext => {
      const audio = ctx.audioSetup;
      if (!audio || audio.bands.length === 0) return ctx;
      return { ...ctx, audioSetup: ensureBandMode(audio) };
    },
    (ctx: MigrationContext): MigrationContext => ({
      ...ctx,
      graph: migrateRemoveColorMapNodes(ctx.graph),
    }),
  ],
};

function applyMigrationsForVersion(
  formatVersion: unknown,
  ctx: MigrationContext
): MigrationContext {
  if (!isSupportedFormatVersion(formatVersion)) {
    return ctx;
  }
  const steps = MIGRATIONS_BY_VERSION[CURRENT_FORMAT_VERSION] ?? [];
  return steps.reduce((acc, step) => step(acc), ctx);
}

export interface SerializeGraphOptions {
  /** Optional starting track id for preset/copy (playlist); stored so paste/load can restore current track. */
  startingTrackId?: string;
}

/**
 * Serializes a node graph to JSON string.
 * Includes audioSetup when provided (panel audio configuration, primarySource, playlistState).
 *
 * @param graph - The graph to serialize
 * @param pretty - Whether to pretty-print the JSON (default: true)
 * @param audioSetup - Optional panel audio setup (files, bands, remappers, primarySource, playlistState)
 * @param options - Optional startingTrackId for preset/copy
 * @returns JSON string representation of the graph
 */
export function serializeGraph(
  graph: NodeGraph,
  pretty: boolean = true,
  audioSetup?: AudioSetup,
  options?: SerializeGraphOptions
): string {
  const wrapper: SerializedGraphFile = {
    format: GRAPH_FILE_FORMAT,
    formatVersion: CURRENT_FORMAT_VERSION,
    graph,
    ...(audioSetup && { audioSetup }),
    ...(options?.startingTrackId && { startingTrackId: options.startingTrackId }),
  };

  return JSON.stringify(wrapper, null, pretty ? 2 : 0);
}

/**
 * Result of deserialization operation.
 */
export interface DeserializationResult {
  graph: NodeGraph | null;
  /** Present when file included audioSetup; undefined when absent or invalid. */
  audioSetup?: AudioSetup;
  /** Starting track id from file (for preset/copy); app may set playlist currentIndex from this. */
  startingTrackId?: string;
  errors: string[];
  warnings: string[];
}

/**
 * Deserializes a JSON string to a node graph.
 * 
 * @param json - JSON string to deserialize
 * @param nodeSpecs - Optional array of node specifications for validation
 * @returns Deserialization result with graph and any errors/warnings
 */
export function deserializeGraph(
  json: string,
  nodeSpecs: NodeSpecification[] = []
): DeserializationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const data = JSON.parse(json);

    if (!isKnownGraphFileFormat(data.format)) {
      errors.push(
        'Invalid file format: expected "shadernoice-node-graph" (or legacy "shader-composer-node-graph")'
      );
      return { graph: null, errors, warnings };
    }

    if (!isSupportedFormatVersion(data.formatVersion)) {
      errors.push(`Unsupported format version: ${data.formatVersion} (expected "${CURRENT_FORMAT_VERSION}")`);
      return { graph: null, errors, warnings };
    }

    if (!data.graph) {
      errors.push('Missing graph data in file');
      return { graph: null, errors, warnings };
    }

    let graphResult = data.graph as NodeGraph;
    let audioSetup =
      data.audioSetup && typeof data.audioSetup === 'object'
        ? sanitizeAudioSetup(data.audioSetup as Record<string, unknown>)
        : undefined;

    // Apply format-version migrations *before* validation so legacy node types can be rewritten
    // into current specs (e.g. node merges / renames).
    const migrated = applyMigrationsForVersion(data.formatVersion, {
      graph: graphResult,
      audioSetup,
    });
    graphResult = migrated.graph;
    audioSetup = migrated.audioSetup;

    graphResult = sanitizeGraphMidiEnvelopeBindings(graphResult);

    const validationResult = validateGraph(graphResult, nodeSpecs);
    errors.push(...validationResult.errors);
    warnings.push(...validationResult.warnings);
    warnings.push(...validateMidiEnvelopeBindingsAgainstSnapshot(graphResult, audioSetup?.arrangementSnapshot));

    if (validationResult.errors.length > 0) {
      return { graph: null, errors, warnings };
    }

    const startingTrackId = typeof data.startingTrackId === 'string' ? data.startingTrackId : undefined;
    if (audioSetup && startingTrackId && audioSetup.playlistState?.order) {
      const idx = audioSetup.playlistState.order.indexOf(startingTrackId);
      if (idx >= 0) {
        audioSetup = { ...audioSetup, playlistState: { ...audioSetup.playlistState, currentIndex: idx } };
      }
    }

    return { graph: graphResult, audioSetup, startingTrackId, errors, warnings };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`JSON parse error: ${message}`);
    return { graph: null, errors, warnings };
  }
}

/**
 * Deserializes a JSON string to a node graph without validation.
 * Use this when you want to load a graph and validate it separately.
 * 
 * @param json - JSON string to deserialize
 * @returns Deserialization result with graph and any parse errors
 */
export function deserializeGraphUnvalidated(json: string): DeserializationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const data = JSON.parse(json);

    if (!isKnownGraphFileFormat(data.format)) {
      errors.push(
        'Invalid file format: expected "shadernoice-node-graph" (or legacy "shader-composer-node-graph")'
      );
      return { graph: null, errors, warnings };
    }

    if (!isSupportedFormatVersion(data.formatVersion)) {
      errors.push(`Unsupported format version: ${data.formatVersion} (expected "${CURRENT_FORMAT_VERSION}")`);
      return { graph: null, errors, warnings };
    }

    if (!data.graph) {
      errors.push('Missing graph data in file');
      return { graph: null, errors, warnings };
    }

    let graphResult = data.graph as NodeGraph;
    let audioSetup =
      data.audioSetup && typeof data.audioSetup === 'object'
        ? sanitizeAudioSetup(data.audioSetup as Record<string, unknown>)
        : undefined;

    const migrated = applyMigrationsForVersion(data.formatVersion, {
      graph: graphResult,
      audioSetup,
    });
    graphResult = migrated.graph;
    audioSetup = migrated.audioSetup;

    const startingTrackId = typeof data.startingTrackId === 'string' ? data.startingTrackId : undefined;
    if (audioSetup && startingTrackId && audioSetup.playlistState?.order) {
      const idx = audioSetup.playlistState.order.indexOf(startingTrackId);
      if (idx >= 0) {
        audioSetup = { ...audioSetup, playlistState: { ...audioSetup.playlistState, currentIndex: idx } };
      }
    }

    return { graph: graphResult, audioSetup, startingTrackId, errors, warnings };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`JSON parse error: ${message}`);
    return { graph: null, errors, warnings };
  }
}

function isValidArrangementSnapshot(val: unknown): val is ArrangementSnapshot {
  if (!val || typeof val !== 'object') return false;
  const o = val as Record<string, unknown>;
  const source = o.source;
  if (!source || typeof source !== 'object') return false;
  const src = source as Record<string, unknown>;
  return (
    Array.isArray(o.tracks) &&
    Array.isArray(o.regions) &&
    typeof o.bpm === 'number' &&
    Number.isFinite(o.bpm) &&
    typeof o.durationSeconds === 'number' &&
    Number.isFinite(o.durationSeconds) &&
    typeof src.trackName === 'string' &&
    typeof src.projectName === 'string' &&
    typeof src.commitIndex === 'number'
  );
}

function sanitizeAudioSetup(val: Record<string, unknown>): AudioSetup | undefined {
  if (
    !Array.isArray(val.files) ||
    !Array.isArray(val.bands) ||
    !Array.isArray(val.remappers)
  ) {
    return undefined;
  }
  const setup: AudioSetup = {
    files: val.files as AudioSetup['files'],
    bands: val.bands as AudioSetup['bands'],
    remappers: val.remappers as AudioSetup['remappers'],
  };
  if (val.primarySource !== undefined) {
    setup.primarySource = val.primarySource as AudioSetup['primarySource'];
  }
  if (val.playlistState !== undefined) {
    setup.playlistState = val.playlistState as AudioSetup['playlistState'];
  }
  if (isValidArrangementSnapshot(val.arrangementSnapshot)) {
    setup.arrangementSnapshot = val.arrangementSnapshot;
    if (typeof val.arrangementImportedAt === 'string') {
      setup.arrangementImportedAt = val.arrangementImportedAt;
    }
  }
  return setup;
}

function sanitizeAdsr(val: unknown): MidiEnvelopeAdsr {
  const o = val && typeof val === 'object' ? (val as Record<string, unknown>) : {};
  const num = (
    key: 'attackSeconds' | 'decaySeconds' | 'sustainLevel' | 'releaseSeconds',
    fallback: number
  ): number => {
    const v = o[key];
    return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback;
  };
  const curve = (key: 'attackCurve' | 'decayCurve' | 'releaseCurve') =>
    isEnvelopeCurve(o[key]) ? o[key] : 'linear';
  const sustain = num('sustainLevel', DEFAULT_MIDI_ENVELOPE_ADSR.sustainLevel);
  const adsr: MidiEnvelopeAdsr = {
    attackSeconds: num('attackSeconds', DEFAULT_MIDI_ENVELOPE_ADSR.attackSeconds),
    decaySeconds: num('decaySeconds', DEFAULT_MIDI_ENVELOPE_ADSR.decaySeconds),
    sustainLevel: Math.max(0, Math.min(1, sustain)),
    releaseSeconds: num('releaseSeconds', DEFAULT_MIDI_ENVELOPE_ADSR.releaseSeconds),
  };
  const attackCurve = curve('attackCurve');
  const decayCurve = curve('decayCurve');
  const releaseCurve = curve('releaseCurve');
  if (attackCurve !== 'linear') adsr.attackCurve = attackCurve;
  if (decayCurve !== 'linear') adsr.decayCurve = decayCurve;
  if (releaseCurve !== 'linear') adsr.releaseCurve = releaseCurve;
  if (o.sustainHoldUsesNoteLength === false) {
    adsr.sustainHoldUsesNoteLength = false;
  }
  return adsr;
}

function sanitizeEnvelopeDefinition(val: unknown): MidiEnvelopeDefinition {
  const o = val && typeof val === 'object' ? (val as Record<string, unknown>) : {};
  return {
    adsr: sanitizeAdsr(o.adsr),
    velocityToPeak: o.velocityToPeak !== false,
  };
}

/** Preset sanitize during load — keeps legacy out range until remapper migration strips it. */
function sanitizeMidiEnvelopePresetForLoad(val: unknown): MidiEnvelopePreset | null {
  const preset = sanitizeMidiEnvelopePreset(val);
  if (!preset || !val || typeof val !== 'object') return preset;
  const o = val as Record<string, unknown>;
  const env = o.envelope;
  if (!env || typeof env !== 'object') return preset;
  const envO = env as Record<string, unknown>;
  const outMin =
    typeof envO.outMin === 'number' && Number.isFinite(envO.outMin) ? envO.outMin : undefined;
  const outMax =
    typeof envO.outMax === 'number' && Number.isFinite(envO.outMax) ? envO.outMax : undefined;
  if (outMin === undefined && outMax === undefined) return preset;
  return {
    ...preset,
    envelope: {
      ...preset.envelope,
      ...(outMin !== undefined ? { outMin } : {}),
      ...(outMax !== undefined ? { outMax } : {}),
    } as MidiEnvelopePreset['envelope'],
  };
}

function sanitizeMidiEnvelopeRemapper(val: unknown): MidiEnvelopeRemapper | null {
  if (!val || typeof val !== 'object') return null;
  const o = val as Record<string, unknown>;
  if (typeof o.id !== 'string' || typeof o.envelopePresetId !== 'string') return null;
  const outMin =
    typeof o.outMin === 'number' && Number.isFinite(o.outMin)
      ? o.outMin
      : DEFAULT_MIDI_ENVELOPE_REMAPPER_OUTPUT.outMin;
  const outMax =
    typeof o.outMax === 'number' && Number.isFinite(o.outMax)
      ? o.outMax
      : DEFAULT_MIDI_ENVELOPE_REMAPPER_OUTPUT.outMax;
  const name = typeof o.name === 'string' && o.name.trim() ? o.name.trim() : undefined;
  return {
    id: o.id,
    envelopePresetId: o.envelopePresetId,
    outMin,
    outMax,
    ...(name ? { name } : {}),
  };
}

function sanitizeMidiEnvelopePreset(val: unknown): MidiEnvelopePreset | null {
  if (!val || typeof val !== 'object') return null;
  const o = val as Record<string, unknown>;
  if (typeof o.id !== 'string') return null;
  const trackIds = Array.isArray(o.trackIds)
    ? o.trackIds.filter((t): t is string => typeof t === 'string')
    : [];
  const label = typeof o.label === 'string' && o.label.trim() ? o.label.trim() : undefined;
  return {
    id: o.id,
    ...(label ? { label } : {}),
    trackIds,
    envelope: sanitizeEnvelopeDefinition(o.envelope),
  };
}

function sanitizeMidiEnvelopeBinding(val: unknown): MidiEnvelopeBinding | null {
  if (!val || typeof val !== 'object') return null;
  const o = val as Record<string, unknown>;
  if (typeof o.id !== 'string' || typeof o.nodeId !== 'string' || typeof o.paramName !== 'string') {
    return null;
  }
  if (typeof o.remapperId === 'string') {
    return {
      id: o.id,
      remapperId: o.remapperId,
      nodeId: o.nodeId,
      paramName: o.paramName,
      ...(o.disabled === true ? { disabled: true } : {}),
    };
  }
  if (typeof o.presetId === 'string') {
    return null;
  }
  return null;
}

function sanitizeGraphMidiEnvelopeBindings(graph: NodeGraph): NodeGraph {
  const rawPresets = graph.midiEnvelopePresets;
  const rawBindings = graph.midiEnvelopeBindings;
  const rawRemappers = graph.midiEnvelopeRemappers;

  const presets = rawPresets?.length
    ? rawPresets
        .map((p) => sanitizeMidiEnvelopePresetForLoad(p))
        .filter((p): p is MidiEnvelopePreset => p !== null)
    : [];

  const remappers = rawRemappers?.length
    ? rawRemappers
        .map((r) => sanitizeMidiEnvelopeRemapper(r))
        .filter((r): r is MidiEnvelopeRemapper => r !== null)
    : [];

  // Preserve legacy inline / presetId bindings for migration.
  const bindings = rawBindings?.length ? [...rawBindings] : [];

  let next: NodeGraph = {
    ...graph,
    midiEnvelopePresets: presets.length > 0 ? presets : undefined,
    midiEnvelopeRemappers: remappers.length > 0 ? remappers : undefined,
    midiEnvelopeBindings: bindings.length > 0 ? bindings : undefined,
  };

  next = migrateLegacyMidiEnvelopeBindings(next);
  next = migrateMidiEnvelopePresetToRemappers(next);

  const sanitizedRemappers = next.midiEnvelopeRemappers
    ?.map((r) => sanitizeMidiEnvelopeRemapper(r))
    .filter((r): r is MidiEnvelopeRemapper => r !== null);

  const sanitizedBindings = next.midiEnvelopeBindings
    ?.map((b) => sanitizeMidiEnvelopeBinding(b))
    .filter((b): b is MidiEnvelopeBinding => b !== null);

  next = {
    ...next,
    midiEnvelopeRemappers:
      sanitizedRemappers && sanitizedRemappers.length > 0 ? sanitizedRemappers : undefined,
    midiEnvelopeBindings:
      sanitizedBindings && sanitizedBindings.length > 0 ? sanitizedBindings : undefined,
  };

  if (
    !next.midiEnvelopePresets?.length &&
    !next.midiEnvelopeRemappers?.length &&
    !next.midiEnvelopeBindings?.length
  ) {
    const {
      midiEnvelopePresets: _p,
      midiEnvelopeRemappers: _r,
      midiEnvelopeBindings: _b,
      ...rest
    } = next;
    return rest;
  }

  return next;
}
