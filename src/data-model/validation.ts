/**
 * Validation System for Node-Based Shader System (v2.0)
 *
 * Graph-level validation and re-exports. Node/connection validation in validationNode.ts and validationConnection.ts.
 */

import type { NodeGraph, Connection, ValidationResult, AutomationState, AutomationLane } from './types';
import type { ArrangementSnapshot } from '../audiotool/arrangement/types';
import type { MidiEnvelopeBinding, MidiEnvelopePreset } from './midiEnvelopeTypes';
import { sortEvaluableRegions } from '../utils/automationEvaluator';
import { isPortConnection, getConnectionTargetKey } from './connectionUtils';
import type { NodeSpecification } from './validationTypes';
import { validateNode } from './validationNode';
import { validateConnection } from './validationConnection';

export type { NodeSpecification } from './validationTypes';

/**
 * Overlap (seconds) must exceed this before validation errors. Slightly above 1ms so
 * `30 - 29.999`-class float/snap gaps do not false-positive; real overlaps (e.g. 5s) still fail.
 */
const EVALUABLE_REGION_OVERLAP_TOLERANCE_SEC = 1e-3 + 1e-6;

/**
 * Validates a complete node graph.
 */
export function validateGraph(
  graph: NodeGraph,
  nodeSpecs: NodeSpecification[] = []
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!graph.id) errors.push('Graph missing id');
  if (!graph.name) errors.push('Graph missing name');
  if (graph.name && graph.name.length > 256) errors.push('Graph name exceeds maximum length of 256 characters');
  if (graph.version !== '2.0') errors.push(`Invalid graph version: ${graph.version} (expected "2.0")`);
  if (!Array.isArray(graph.nodes)) errors.push('Graph missing or invalid nodes array');
  if (!Array.isArray(graph.connections)) errors.push('Graph missing or invalid connections array');

  if (!graph.nodes || !graph.connections) {
    return { valid: false, errors, warnings };
  }

  const nodeIds = new Set<string>();
  for (const node of graph.nodes) {
    if (nodeIds.has(node.id)) errors.push(`Duplicate node ID: ${node.id}`);
    nodeIds.add(node.id);
  }
  const connectionIds = new Set<string>();
  for (const conn of graph.connections) {
    if (connectionIds.has(conn.id)) errors.push(`Duplicate connection ID: ${conn.id}`);
    connectionIds.add(conn.id);
  }

  for (const node of graph.nodes) {
    validateNode(node, nodeSpecs, errors, warnings);
  }
  for (const conn of graph.connections) {
    validateConnection(conn, graph, nodeSpecs, errors, warnings);
  }

  const targetKeyToConn = new Map<string, Connection>();
  for (const conn of graph.connections) {
    const key = getConnectionTargetKey(conn);
    if (!key) continue;
    if (targetKeyToConn.has(key)) {
      const existing = targetKeyToConn.get(key)!;
      const targetLabel = isPortConnection(conn) ? `port ${conn.targetPort}` : `parameter ${conn.targetParameter}`;
      errors.push(`Duplicate connection to ${targetLabel} on node ${conn.targetNodeId} (connection ${existing.id})`);
    } else {
      targetKeyToConn.set(key, conn);
    }
  }

  if (graph.viewState) {
    if (typeof graph.viewState.zoom !== 'number') {
      errors.push('View state zoom must be a number');
    } else if (graph.viewState.zoom < 0.10 || graph.viewState.zoom > 10.0) {
      warnings.push(`View state zoom is out of recommended range: ${graph.viewState.zoom}`);
    }
    if (typeof graph.viewState.panX !== 'number') errors.push('View state panX must be a number');
    if (typeof graph.viewState.panY !== 'number') errors.push('View state panY must be a number');
  }

  if (graph.automation) {
    validateAutomation(graph.automation, graph, nodeSpecs, errors, warnings);
  }

  if (
    graph.midiEnvelopePresets?.length ||
    graph.midiEnvelopeRemappers?.length ||
    graph.midiEnvelopeBindings?.length
  ) {
    validateMidiEnvelopePresetsAndBindings(graph, nodeSpecs, warnings);
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validates automation state. Structural/node/param mismatches go to **warnings** so legacy graphs stay inspectable.
 * **Hard errors:** duplicate keyframe times in a curve; overlapping **evaluable** regions on the same lane (same rules as runtime §4.4 — blocks deserialize/save when invalid).
 */
export function validateAutomation(
  automation: AutomationState,
  graph: NodeGraph,
  nodeSpecs: NodeSpecification[],
  errors: string[],
  warnings: string[]
): void {
  if (typeof automation.bpm !== 'number' || automation.bpm <= 0) {
    warnings.push('Automation: bpm must be a positive number');
  }
  if (typeof automation.durationSeconds !== 'number' || automation.durationSeconds < 0) {
    warnings.push('Automation: durationSeconds must be a non-negative number');
  }
  if (!Array.isArray(automation.lanes)) {
    warnings.push('Automation: lanes must be an array');
    return;
  }

  const nodeById = new Map(graph.nodes.map(n => [n.id, n]));

  for (const lane of automation.lanes) {
    if (!lane.id) {
      warnings.push('Automation: lane missing id');
      continue;
    }
    const node = nodeById.get(lane.nodeId);
    if (!node) {
      warnings.push(`Automation lane ${lane.id}: node "${lane.nodeId}" not found`);
      continue;
    }
    const nodeSpec = nodeSpecs.find(s => s.id === node.type);
    if (!nodeSpec) {
      warnings.push(`Automation lane ${lane.id}: no spec for node type "${node.type}"`);
      continue;
    }
    const paramSpec = nodeSpec.parameters?.[lane.paramName];
    if (!paramSpec) {
      warnings.push(`Automation lane ${lane.id}: parameter "${lane.paramName}" not found on node type ${node.type}`);
      continue;
    }
    if (paramSpec.type !== 'float') {
      if (paramSpec.type === 'int') {
        warnings.push(`Automation lane ${lane.id}: parameter "${lane.paramName}" is int; automation supports float parameters only`);
      } else {
        warnings.push(`Automation lane ${lane.id}: parameter "${lane.paramName}" must be float (got ${paramSpec.type})`);
      }
      continue;
    }
    if (!Array.isArray(lane.regions)) {
      warnings.push(`Automation lane ${lane.id}: regions must be an array`);
      continue;
    }
    const sortedRegions = [...lane.regions].sort((a, b) =>
      a.startTime !== b.startTime ? a.startTime - b.startTime : a.id.localeCompare(b.id)
    );
    for (let i = 0; i < sortedRegions.length; i++) {
      const r = sortedRegions[i];
      if (typeof r.startTime !== 'number' || r.startTime < 0) {
        warnings.push(`Automation region ${r.id}: startTime must be >= 0`);
      }
      if (typeof r.duration !== 'number' || r.duration < 0) {
        warnings.push(`Automation region ${r.id}: duration must be >= 0`);
      }
      if (r.curve?.keyframes?.length) {
        const sortedKf = [...r.curve.keyframes].sort((a, b) => a.time - b.time);
        for (let k = 1; k < sortedKf.length; k++) {
          if (sortedKf[k].time === sortedKf[k - 1].time) {
            errors.push(
              `Automation region ${r.id}: duplicate keyframe times at ${sortedKf[k].time} are not allowed`
            );
          }
        }
        for (const kf of r.curve.keyframes) {
          if (typeof kf.time !== 'number' || kf.time < 0 || kf.time > 1) {
            warnings.push(`Automation region ${r.id}: keyframe time must be in [0, 1], got ${kf.time}`);
          }
        }
      }
    }
    const evaluableSorted = sortEvaluableRegions(lane as AutomationLane);
    for (let ei = 0; ei < evaluableSorted.length - 1; ei++) {
      const r = evaluableSorted[ei];
      const next = evaluableSorted[ei + 1];
      const end = r.startTime + r.duration;
      const overlapSec = end - next.startTime;
      if (overlapSec > EVALUABLE_REGION_OVERLAP_TOLERANCE_SEC) {
        errors.push(
          `Automation lane ${lane.id}: overlapping evaluable regions (${r.id} ends at ${end}, ${next.id} starts at ${next.startTime})`
        );
      }
    }
  }
}

/**
 * Validates MIDI envelope presets and bindings. Structural mismatches are warnings so graphs stay loadable.
 */
export function validateMidiEnvelopePresetsAndBindings(
  graph: NodeGraph,
  nodeSpecs: NodeSpecification[],
  warnings: string[]
): void {
  const presets = graph.midiEnvelopePresets ?? [];
  const remappers = graph.midiEnvelopeRemappers ?? [];
  const bindings = graph.midiEnvelopeBindings ?? [];
  const presetById = new Map(presets.map((p) => [p.id, p]));
  const remapperById = new Map(remappers.map((r) => [r.id, r]));
  const seenPresetIds = new Set<string>();
  const seenRemapperIds = new Set<string>();

  for (const preset of presets) {
    if (!preset.id) {
      warnings.push('MIDI envelope preset missing id');
      continue;
    }
    if (seenPresetIds.has(preset.id)) {
      warnings.push(`MIDI envelope: duplicate preset id ${preset.id}`);
    }
    seenPresetIds.add(preset.id);
    validateMidiEnvelopePresetFields(preset, warnings);
  }

  for (const remapper of remappers) {
    if (!remapper.id) {
      warnings.push('MIDI envelope remapper missing id');
      continue;
    }
    if (seenRemapperIds.has(remapper.id)) {
      warnings.push(`MIDI envelope: duplicate remapper id ${remapper.id}`);
    }
    seenRemapperIds.add(remapper.id);
    if (!presetById.has(remapper.envelopePresetId)) {
      warnings.push(
        `MIDI envelope remapper ${remapper.id}: preset "${remapper.envelopePresetId}" not found`
      );
    }
    if (
      typeof remapper.outMin !== 'number' ||
      !Number.isFinite(remapper.outMin) ||
      typeof remapper.outMax !== 'number' ||
      !Number.isFinite(remapper.outMax)
    ) {
      warnings.push(`MIDI envelope remapper ${remapper.id}: outMin/outMax must be finite numbers`);
    }
  }

  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const seenParams = new Set<string>();

  for (const binding of bindings) {
    if (!binding.id) {
      warnings.push('MIDI envelope binding missing id');
      continue;
    }
    if (!binding.remapperId) {
      warnings.push(`MIDI envelope binding ${binding.id}: missing remapperId`);
      continue;
    }
    if (!remapperById.has(binding.remapperId)) {
      warnings.push(
        `MIDI envelope binding ${binding.id}: remapper "${binding.remapperId}" not found`
      );
    }

    const bound = binding.nodeId.length > 0 && binding.paramName.length > 0;
    if (!bound) {
      warnings.push(`MIDI envelope binding ${binding.id}: bindings must reference a parameter port`);
      continue;
    }

    const paramKey = `${binding.nodeId}:${binding.paramName}`;
    if (seenParams.has(paramKey)) {
      warnings.push(
        `MIDI envelope: duplicate binding for parameter ${binding.paramName} on node ${binding.nodeId}`
      );
    }
    seenParams.add(paramKey);

    const node = nodeById.get(binding.nodeId);
    if (!node) {
      warnings.push(`MIDI envelope binding ${binding.id}: node "${binding.nodeId}" not found`);
      continue;
    }
    const nodeSpec = nodeSpecs.find((s) => s.id === node.type);
    if (!nodeSpec) {
      warnings.push(`MIDI envelope binding ${binding.id}: no spec for node type "${node.type}"`);
      continue;
    }
    const paramSpec = nodeSpec.parameters?.[binding.paramName];
    if (!paramSpec) {
      warnings.push(
        `MIDI envelope binding ${binding.id}: parameter "${binding.paramName}" not found on node type ${node.type}`
      );
      continue;
    }
    if (paramSpec.type !== 'float') {
      warnings.push(
        `MIDI envelope binding ${binding.id}: parameter "${binding.paramName}" must be float (got ${paramSpec.type})`
      );
    }
  }

  const boundRemapperIds = new Set(
    bindings
      .filter((b) => b.nodeId.length > 0 && b.paramName.length > 0)
      .map((b) => b.remapperId)
  );
  for (const remapper of remappers) {
    if (!boundRemapperIds.has(remapper.id)) {
      warnings.push(`MIDI envelope remapper ${remapper.id}: no parameter bindings`);
    }
  }
}

function validateMidiEnvelopePresetFields(preset: MidiEnvelopePreset, warnings: string[]): void {
  if (!Array.isArray(preset.trackIds)) {
    warnings.push(`MIDI envelope preset ${preset.id}: trackIds must be an array`);
  }
  const adsr = preset.envelope?.adsr;
  if (!adsr) {
    warnings.push(`MIDI envelope preset ${preset.id}: missing envelope.adsr`);
    return;
  }
  for (const [key, val] of Object.entries({
    attackSeconds: adsr.attackSeconds,
    decaySeconds: adsr.decaySeconds,
    sustainLevel: adsr.sustainLevel,
    releaseSeconds: adsr.releaseSeconds,
  })) {
    if (typeof val !== 'number' || !Number.isFinite(val) || val < 0) {
      warnings.push(`MIDI envelope preset ${preset.id}: adsr.${key} must be a non-negative number`);
    }
  }
  if (typeof adsr.sustainLevel === 'number' && (adsr.sustainLevel < 0 || adsr.sustainLevel > 1)) {
    warnings.push(`MIDI envelope preset ${preset.id}: adsr.sustainLevel must be in [0, 1]`);
  }
}

/** @deprecated Use {@link validateMidiEnvelopePresetsAndBindings}. */
export function validateMidiEnvelopeBindings(
  bindings: MidiEnvelopeBinding[],
  graph: NodeGraph,
  nodeSpecs: NodeSpecification[],
  warnings: string[]
): void {
  validateMidiEnvelopePresetsAndBindings(
    { ...graph, midiEnvelopeBindings: bindings },
    nodeSpecs,
    warnings
  );
}

/** Warn when binding trackIds are absent from an arrangement snapshot. */
export function validateMidiEnvelopeBindingsAgainstSnapshot(
  graph: NodeGraph,
  snapshot: ArrangementSnapshot | undefined
): string[] {
  const warnings: string[] = [];
  const presets = graph.midiEnvelopePresets ?? [];
  const presetById = new Map(presets.map((p) => [p.id, p]));
  const remapperById = new Map(
    (graph.midiEnvelopeRemappers ?? []).map((r) => [r.id, r])
  );
  const bindings = graph.midiEnvelopeBindings;
  if (!bindings?.length || !snapshot) return warnings;

  const trackIds = new Set(snapshot.tracks.map((t) => t.id));
  for (const binding of bindings) {
    const remapper = remapperById.get(binding.remapperId);
    const preset = remapper ? presetById.get(remapper.envelopePresetId) : undefined;
    if (!preset) continue;
    for (const trackId of preset.trackIds) {
      if (!trackIds.has(trackId)) {
        warnings.push(
          `MIDI envelope preset ${preset.id}: track "${trackId}" not found in arrangement snapshot`
        );
      }
    }
  }
  return warnings;
}

export function validateUniqueNodeIds(graph: NodeGraph): string[] {
  const errors: string[] = [];
  const nodeIds = new Set<string>();
  for (const node of graph.nodes) {
    if (nodeIds.has(node.id)) errors.push(`Duplicate node ID: ${node.id}`);
    nodeIds.add(node.id);
  }
  return errors;
}

export function validateUniqueConnectionIds(graph: NodeGraph): string[] {
  const errors: string[] = [];
  const connectionIds = new Set<string>();
  for (const conn of graph.connections) {
    if (connectionIds.has(conn.id)) errors.push(`Duplicate connection ID: ${conn.id}`);
    connectionIds.add(conn.id);
  }
  return errors;
}

export function validateConnectionNodeReferences(graph: NodeGraph): string[] {
  const errors: string[] = [];
  const nodeIds = new Set(graph.nodes.map(n => n.id));
  for (const conn of graph.connections) {
    if (!nodeIds.has(conn.sourceNodeId)) {
      errors.push(`Connection ${conn.id} references non-existent source node: ${conn.sourceNodeId}`);
    }
    if (!nodeIds.has(conn.targetNodeId)) {
      errors.push(`Connection ${conn.id} references non-existent target node: ${conn.targetNodeId}`);
    }
  }
  return errors;
}

export function validateNoDuplicateConnections(
  connection: Connection,
  existingConnections: Connection[]
): { valid: boolean; error?: string } {
  const key = getConnectionTargetKey(connection);
  if (!key) {
    return { valid: false, error: 'Connection must have exactly one of targetPort or targetParameter set' };
  }
  const duplicate = existingConnections.find(c => getConnectionTargetKey(c) === key);
  if (duplicate) {
    const targetLabel = isPortConnection(connection)
      ? `Input port '${connection.targetPort}'`
      : `Parameter '${connection.targetParameter}'`;
    return { valid: false, error: `${targetLabel} on node '${connection.targetNodeId}' already has a connection` };
  }
  return { valid: true };
}
