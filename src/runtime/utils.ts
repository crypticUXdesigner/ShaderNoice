/**
 * Runtime Utility Functions
 * 
 * Uniform name mapping function that matches the compiler's naming convention.
 */

import type { AutomationCurve, AutomationState } from '../data-model/types';

function jsonNumber(n: number): string {
  return JSON.stringify(n);
}

/** Curve keyframes keep graph order (shader semantics can depend on keyframe sequence). */
function digestAutomationCurve(curve: AutomationCurve): string {
  let s = curve.interpolation;
  for (const kf of curve.keyframes ?? []) {
    s += '\x1f';
    s += jsonNumber(kf.time);
    s += ',';
    s += jsonNumber(kf.value);
  }
  return s;
}

/**
 * Stable compile-identity substring for automation (replaces full JSON.stringify of automation).
 * Lanes and regions are sorted by id so array order alone does not change identity.
 */
export function digestAutomationForCompileIdentity(automation: AutomationState | null | undefined): string {
  if (automation == null) return '';
  const lanes = [...(automation.lanes ?? [])].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const parts: string[] = [
    'bpm:',
    jsonNumber(automation.bpm),
    '|dur:',
    jsonNumber(automation.durationSeconds),
  ];
  for (const lane of lanes) {
    parts.push('|L:', lane.id, '|', lane.nodeId, '|', lane.paramName, '|d:', lane.disabled ? '1' : '0');
    const regions = [...(lane.regions ?? [])].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    for (const r of regions) {
      parts.push(
        '|R:',
        r.id,
        '|',
        jsonNumber(r.startTime),
        '|',
        jsonNumber(r.duration),
        '|',
        r.loop ? '1' : '0',
        '|C:',
        digestAutomationCurve(r.curve)
      );
    }
  }
  return parts.join('');
}

/** Raw `nodeId` + `paramName` → sanitized uniform name (sanitization is lossy; never key on sanitized form alone). */
const uniformNameCache = new Map<string, string>();

function uniformNameCacheKey(nodeId: string, paramName: string): string {
  return `${nodeId}\0${paramName}`;
}

/**
 * Compute uniform name without cache (matches compiler sanitizeUniformName).
 * Exposed for tests that assert cache results stay identical to the uncached path.
 */
export function computeUniformNameUncached(nodeId: string, paramName: string): string {
  // Sanitize node ID: replace non-alphanumeric with underscore
  let sanitizedId = nodeId.replace(/[^a-zA-Z0-9]/g, '_');

  // If starts with digit, prefix with 'n'
  if (/^\d/.test(sanitizedId)) {
    sanitizedId = 'n' + sanitizedId;
  }

  // Sanitize parameter name: remove non-alphanumeric, capitalize first letter
  let sanitizedParam = paramName.replace(/[^a-zA-Z0-9]/g, '');
  sanitizedParam = sanitizedParam.charAt(0).toUpperCase() + sanitizedParam.slice(1);

  return `u${sanitizedId}${sanitizedParam}`;
}

/**
 * Generate uniform name from node ID and parameter name.
 * This matches the compiler's sanitizeUniformName function exactly.
 *
 * @param nodeId - Node ID (e.g., "node-123")
 * @param paramName - Parameter name (e.g., "scale")
 * @returns Uniform name (e.g., "uNode_123Scale")
 */
export function getUniformName(nodeId: string, paramName: string): string {
  const key = uniformNameCacheKey(nodeId, paramName);
  const cached = uniformNameCache.get(key);
  if (cached !== undefined) return cached;
  const name = computeUniformNameUncached(nodeId, paramName);
  uniformNameCache.set(key, name);
  return name;
}

/** @internal Vitest — clear module cache between cases. */
export function clearUniformNameCacheForTests(): void {
  uniformNameCache.clear();
}

/** @internal Vitest — current cache size. */
export function getUniformNameCacheSizeForTests(): number {
  return uniformNameCache.size;
}

/**
 * Hash a graph structure to detect changes.
 * Includes automation so that adding/editing lanes or curves triggers recompile (shader uses evalAutomation_*).
 * Includes per-node `bypassed` so toggling Power triggers a structural recompile (the compiler
 * drops bypassed nodes from execution order — different GLSL/WGSL output, different uniforms).
 */
export function hashGraph(graph: import('../data-model/types').NodeGraph): string {
  const nodeIds = graph.nodes.map(n => n.id).sort().join(',');
  const bypassed = graph.nodes
    .filter((n) => n.bypassed)
    .map((n) => n.id)
    .sort()
    .join(',');
  const connectionIds = graph.connections.map(c => c.id).sort().join(',');
  const connections = graph.connections
    .map(
      (c) =>
        `${c.sourceNodeId}:${c.sourcePort}->${c.targetNodeId}:${c.targetPort ?? ''}:${c.targetParameter ?? ''}:${c.disabled ? '1' : '0'}:${c.driverOutMin ?? ''}:${c.driverOutMax ?? ''}`
    )
    .sort()
    .join(',');
  const automation = digestAutomationForCompileIdentity(graph.automation);
  return `${nodeIds}|${bypassed}|${connectionIds}|${connections}|${automation}`;
}
