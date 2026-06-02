/** Max region start/end boundary events in a compile-time bake table. */
export const MAX_PATTERN_BOUNDARY_EVENTS = 256;

/** Max boundary events a pattern fragment shader may scan per pixel. */
export const MAX_PATTERN_BOUNDARY_LOOP = 128;

/** Max boundary events scanned per pixel in `boundary-shutter-rays` (task 07A cap). */
export const MAX_PATTERN_SHUTTER_BOUNDARY_LOOP = 96;

/** Max tracks in per-track energy / lattice pattern loops. */
export const MAX_PATTERN_TRACK_LOOP = 16;

/** Max onsets a windowed pattern fragment shader may scan per pixel (preview-clamped). */
export const MAX_PATTERN_ONSET_LOOP = 512;

/** Max onsets scanned per pixel in `velocity-spark-grid` (task 06B cap). */
export const MAX_PATTERN_SPARK_GRID_ONSET_LOOP = 256;

/** Max onsets scanned per pixel in `duration-comet-trails` (task 07B cap). */
export const MAX_PATTERN_COMET_ONSET_LOOP = 256;

/** Max onsets scanned per pixel in `note-gravity-warp` (task 07D cap). */
export const MAX_PATTERN_GRAVITY_ONSET_LOOP = 96;

/** Max active pitch-class sites in a single pattern-node shader loop. */
export const MAX_PATTERN_ACTIVE_SITES = 24;

/** Default fixed-width time bin size (seconds) for pattern bakes. */
export const DEFAULT_PATTERN_BIN_WIDTH_SECONDS = 0.05;

/**
 * Max pitch-class bake width in vec4 units (`ARR_PATTERN_PC_*` stores 3 vec4 per time bin).
 * Many GLSL drivers reject a single private const array above ~1024 vec4.
 */
export const MAX_PATTERN_PC_BAKE_VEC4S = 1024;

/** Upper bound on compile-time time-bin table length (GLSL/WGSL constant arrays). */
export const MAX_PATTERN_TIME_BINS = Math.floor(MAX_PATTERN_PC_BAKE_VEC4S / 3);

/** Node types that consume {@link packArrangementNoteOnsetsForGlsl} + preview onset loop uniforms. */
export const ARRANGEMENT_PATTERN_ONSET_NODE_TYPES = [
  'note-ripple-field',
  'pitch-class-compass',
  'velocity-spark-grid',
  'duration-comet-trails',
  'note-gravity-warp',
] as const;

/** Max time bins scanned when sampling pitch-class energy with a release tail. */
export const MAX_PATTERN_RELEASE_BIN_LOOP = 64;

/** Max time bins scanned when aggregating note density over a trailing window. */
export const MAX_PATTERN_WINDOW_BIN_LOOP = 64;

/** Node types that inject {@link injectArrangementPatternNoteBake} (onsets and/or bin tables). */
export const ARRANGEMENT_PATTERN_NOTE_BAKE_NODE_TYPES = [
  ...ARRANGEMENT_PATTERN_ONSET_NODE_TYPES,
  'pitch-class-compass',
  'rhythm-stripe-field',
  'chord-voronoi-bloom',
] as const;

export type ArrangementPatternNoteBakeNodeType =
  (typeof ARRANGEMENT_PATTERN_NOTE_BAKE_NODE_TYPES)[number];

export function isArrangementPatternNoteBakeNodeType(
  nodeType: string
): nodeType is ArrangementPatternNoteBakeNodeType {
  return (ARRANGEMENT_PATTERN_NOTE_BAKE_NODE_TYPES as readonly string[]).includes(nodeType);
}

export type ArrangementPatternOnsetNodeType = (typeof ARRANGEMENT_PATTERN_ONSET_NODE_TYPES)[number];

export function isArrangementPatternOnsetNodeType(
  nodeType: string
): nodeType is ArrangementPatternOnsetNodeType {
  return (ARRANGEMENT_PATTERN_ONSET_NODE_TYPES as readonly string[]).includes(nodeType);
}

/** Node types that consume {@link packArrangementRegionBoundariesForGlsl} bakes. */
export const ARRANGEMENT_PATTERN_REGION_NODE_TYPES = ['boundary-shutter-rays'] as const;

export type ArrangementPatternRegionNodeType = (typeof ARRANGEMENT_PATTERN_REGION_NODE_TYPES)[number];

export function isArrangementPatternRegionNodeType(
  nodeType: string
): nodeType is ArrangementPatternRegionNodeType {
  return (ARRANGEMENT_PATTERN_REGION_NODE_TYPES as readonly string[]).includes(nodeType);
}

/** Node types that consume per-track energy bins from 02B. */
export const ARRANGEMENT_PATTERN_TRACK_ENERGY_NODE_TYPES = ['track-halo-lattice'] as const;

export type ArrangementPatternTrackEnergyNodeType =
  (typeof ARRANGEMENT_PATTERN_TRACK_ENERGY_NODE_TYPES)[number];

export function isArrangementPatternTrackEnergyNodeType(
  nodeType: string
): nodeType is ArrangementPatternTrackEnergyNodeType {
  return (ARRANGEMENT_PATTERN_TRACK_ENERGY_NODE_TYPES as readonly string[]).includes(nodeType);
}

/** All arrangement pattern node ids (tasks 03–07D). */
export const ARRANGEMENT_PATTERN_NODE_TYPES = [
  'note-ripple-field',
  'pitch-class-compass',
  ...ARRANGEMENT_PATTERN_REGION_NODE_TYPES,
  'rhythm-stripe-field',
  'velocity-spark-grid',
  ...ARRANGEMENT_PATTERN_TRACK_ENERGY_NODE_TYPES,
  'duration-comet-trails',
  'chord-voronoi-bloom',
  'note-gravity-warp',
] as const;

export type ArrangementPatternNodeType = (typeof ARRANGEMENT_PATTERN_NODE_TYPES)[number];

export function isArrangementPatternNodeType(nodeType: string): nodeType is ArrangementPatternNodeType {
  return (ARRANGEMENT_PATTERN_NODE_TYPES as readonly string[]).includes(nodeType);
}

/** True when the graph needs shared arrangement-pattern GLSL/WGSL helpers emitted once. */
export function graphUsesArrangementPatternSharedHelpers(
  nodes: readonly { id: string; type: string }[],
  executionOrder: readonly string[]
): boolean {
  const active = new Set(executionOrder);
  for (const node of nodes) {
    if (!active.has(node.id)) continue;
    if (isArrangementPatternNodeType(node.type)) return true;
  }
  return false;
}
