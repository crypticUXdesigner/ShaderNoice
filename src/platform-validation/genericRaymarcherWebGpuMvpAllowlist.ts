/**
 * WebGPU MVP bounds for `generic-raymarcher` — owned by platform-validation so
 * data-model wire rules and `WgslMvpCompiler` share one allowlist without
 * data-model importing `src/shaders/compilation/*`.
 */

/** Bounded generic-raymarcher pilot: sdf port allow-list (parity with WGSL helpers + marching loop). */
export const GENERIC_RAYMARCHER_WEBGPU_MVP_SDF_TYPES = new Set<string>([
  'mandelbulb-sdf',
  'julia-slab-sdf',
  'mandelbox-sdf',
  'menger-sponge-sdf',
  'sierpinski-tetra-sdf',
  'hex-prism-sdf',
  'repeated-hex-prism-sdf',
  'radial-repeat-sdf',
  'ether-sdf',
  'kifs-sdf',
  'metaballs',
  'box-torus-sdf',
  'sphere-raymarch',
]);

export function genericRaymarcherWebGpuMvpSdfAllowedListSentence(): string {
  return [...GENERIC_RAYMARCHER_WEBGPU_MVP_SDF_TYPES].sort((a, b) => a.localeCompare(b)).join(', ');
}
