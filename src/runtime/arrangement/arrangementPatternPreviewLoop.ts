/**
 * Preview: updates pattern-node `onsetLoopStart` / `onsetLoopEnd` uniforms each frame so the
 * shader only scans onsets in the trailing timeline window (scrub-safe).
 */

import type { AudioSetup } from '../../data-model/audioSetupTypes';
import type { NodeGraph, NodeInstance } from '../../data-model/types';
import {
  getArrangementPatternOnsetBakeCache,
  getArrangementPatternOnsetBakeCacheEntry,
  setArrangementPatternOnsetBakeCache,
} from '../../audiotool/arrangement/arrangementPatternOnsetBakeCache';
import { arrangementTrackFilterCacheKey } from '../../audiotool/arrangement/arrangementTrackFilter';
import {
  isArrangementPatternOnsetNodeType,
  MAX_PATTERN_COMET_ONSET_LOOP,
  MAX_PATTERN_GRAVITY_ONSET_LOOP,
  MAX_PATTERN_ONSET_LOOP,
  MAX_PATTERN_SPARK_GRID_ONSET_LOOP,
  type ArrangementPatternOnsetNodeType,
} from '../../shaders/arrangement/pattern/constants';
import {
  arrangementPatternOnsetVisibleTimeWindow,
  clampOnsetLoopRangeForPreviewBudget,
  filterNotePatternForNode,
  findOnsetIndexRangeForWindow,
  readArrangementPatternPackOptions,
  resolvePatternOnsetPreviewLoopBudget,
} from '../../shaders/arrangement/pattern/notePatternBake';
import type { PreviewProgramInstance } from '../types';

export interface ArrangementLoopUniformUpdate {
  nodeId: string;
  paramName: string;
  value: number;
}

/** Matches `note-ripple-field` `windowSeconds` NodeSpec max. */
const MAX_PATTERN_WINDOW_SECONDS = 8;

/** Matches `velocity-spark-grid` `decay` NodeSpec max. */
const MAX_PATTERN_SPARK_DECAY_SECONDS = 4;

/** Matches `duration-comet-trails` `trailTime` NodeSpec max. */
const MAX_PATTERN_COMET_TRAIL_TIME_SECONDS = 8;

/** Matches `note-gravity-warp` `windowSeconds` NodeSpec max. */
const MAX_PATTERN_GRAVITY_WINDOW_SECONDS = 8;

/** Matches `note-gravity-warp` `decay` NodeSpec max. */
const MAX_PATTERN_GRAVITY_DECAY_SECONDS = 8;

function readOnsetWindowSeconds(node: NodeInstance): number {
  if (node.type === 'velocity-spark-grid') {
    const raw = node.parameters?.decay;
    const v = typeof raw === 'number' && Number.isFinite(raw) ? raw : 0.55;
    return Math.min(MAX_PATTERN_SPARK_DECAY_SECONDS, Math.max(0.05, v));
  }
  if (node.type === 'duration-comet-trails') {
    const raw = node.parameters?.trailTime;
    const v = typeof raw === 'number' && Number.isFinite(raw) ? raw : 1.4;
    return Math.min(MAX_PATTERN_COMET_TRAIL_TIME_SECONDS, Math.max(0.1, v));
  }
  if (node.type === 'note-gravity-warp') {
    const windowRaw = node.parameters?.windowSeconds ?? node.parameters?.window;
    const windowV =
      typeof windowRaw === 'number' && Number.isFinite(windowRaw) ? windowRaw : 2.0;
    const windowSec = Math.min(
      MAX_PATTERN_GRAVITY_WINDOW_SECONDS,
      Math.max(0.1, windowV)
    );
    const decayRaw = node.parameters?.decay;
    const decayV =
      typeof decayRaw === 'number' && Number.isFinite(decayRaw) && decayRaw > 0
        ? decayRaw
        : windowSec;
    const decaySec = Math.min(MAX_PATTERN_GRAVITY_DECAY_SECONDS, Math.max(0.1, decayV));
    return Math.max(windowSec, decaySec);
  }
  if (node.type === 'pitch-class-compass') {
    const raw = node.parameters?.windowSeconds;
    const v = typeof raw === 'number' && Number.isFinite(raw) ? raw : 2;
    return Math.min(MAX_PATTERN_WINDOW_SECONDS, Math.max(0.1, v));
  }
  const raw = node.parameters?.windowSeconds;
  const v = typeof raw === 'number' && Number.isFinite(raw) ? raw : 2;
  return Math.min(MAX_PATTERN_WINDOW_SECONDS, Math.max(0.1, v));
}

/**
 * Onsets used for preview loop-index uniforms. Prefer the main-thread bake cache (mirrors compiled
 * shader tables). Repack only when the track filter key changed — not every frame.
 */
function bakedOnsetsForNode(node: NodeInstance, snapshot: NonNullable<AudioSetup['arrangementSnapshot']>) {
  const trackFilterKey = arrangementTrackFilterCacheKey(readArrangementPatternPackOptions(node));
  const cached = getArrangementPatternOnsetBakeCacheEntry(node.id);
  if (cached?.onsets && cached.trackFilterKey === trackFilterKey) {
    return cached.onsets;
  }
  const live = filterNotePatternForNode(snapshot, node).onsets;
  setArrangementPatternOnsetBakeCache(node.id, live, trackFilterKey);
  return live;
}

/** Per-pixel onset scan cap in generated shader (must match node WGSL/GLSL helpers). */
function shaderOnsetIterationCap(nodeType: ArrangementPatternOnsetNodeType): number {
  switch (nodeType) {
    case 'note-gravity-warp':
      return MAX_PATTERN_GRAVITY_ONSET_LOOP;
    case 'velocity-spark-grid':
      return MAX_PATTERN_SPARK_GRID_ONSET_LOOP;
    case 'duration-comet-trails':
      return MAX_PATTERN_COMET_ONSET_LOOP;
    case 'note-ripple-field':
    case 'pitch-class-compass':
      return MAX_PATTERN_ONSET_LOOP;
  }
}

/** Collect per-frame `onsetLoopStart` / `onsetLoopEnd` for arrangement pattern nodes (preview + export). */
export function collectArrangementPatternOnsetLoopUniformUpdates(args: {
  graph: NodeGraph | null | undefined;
  timelineTime: number;
  audioSetup?: AudioSetup | null;
}): ArrangementLoopUniformUpdate[] {
  const { graph, timelineTime, audioSetup } = args;
  if (!graph?.nodes?.length || !Number.isFinite(timelineTime)) {
    return [];
  }

  const snapshot = audioSetup?.arrangementSnapshot;
  const updates: ArrangementLoopUniformUpdate[] = [];

  for (const node of graph.nodes) {
    if (!isArrangementPatternOnsetNodeType(node.type)) continue;

    const baked = snapshot ? bakedOnsetsForNode(node, snapshot) : getArrangementPatternOnsetBakeCache(node.id);
    if (!baked?.length) {
      updates.push(
        { nodeId: node.id, paramName: 'onsetLoopStart', value: 0 },
        { nodeId: node.id, paramName: 'onsetLoopEnd', value: 0 }
      );
      continue;
    }

    const { windowStart, windowEnd } = arrangementPatternOnsetVisibleTimeWindow(
      timelineTime,
      readOnsetWindowSeconds(node)
    );
    const windowRange = findOnsetIndexRangeForWindow(baked, windowStart, windowEnd);
    const loopBudget = Math.min(
      shaderOnsetIterationCap(node.type),
      resolvePatternOnsetPreviewLoopBudget(baked.length)
    );
    const { start, end } = clampOnsetLoopRangeForPreviewBudget(
      baked,
      windowRange,
      timelineTime,
      loopBudget
    );
    updates.push(
      { nodeId: node.id, paramName: 'onsetLoopStart', value: start },
      { nodeId: node.id, paramName: 'onsetLoopEnd', value: end }
    );
  }

  return updates;
}

export function applyArrangementPatternOnsetLoopUniforms(args: {
  graph: NodeGraph | null | undefined;
  shaderInstance: PreviewProgramInstance | null | undefined;
  timelineTime: number;
  audioSetup?: AudioSetup | null;
}): void {
  const { graph, shaderInstance, timelineTime, audioSetup } = args;
  if (!shaderInstance) return;

  for (const u of collectArrangementPatternOnsetLoopUniformUpdates({ graph, timelineTime, audioSetup })) {
    shaderInstance.setParameter(u.nodeId, u.paramName, u.value);
  }
}
