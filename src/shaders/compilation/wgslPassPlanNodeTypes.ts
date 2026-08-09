/**
 * WebGPU pass-plan effect node kinds (blur / glow-bloom / bokeh / crepuscular-rays).
 * Shared by WgslMvpCompiler emit and wgslSectionHashes fingerprints — keep as the single Set.
 */

/** Grow only alongside a matching compiler branch + runtime/export handlers. */
export const WGSL_WEBGPU_PASS_PLAN_NODE_TYPES = new Set<string>([
  'blur',
  'glow-bloom',
  'bokeh',
  'crepuscular-rays',
]);
