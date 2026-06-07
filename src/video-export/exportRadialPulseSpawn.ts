/**
 * Offline export: radial-pulse spawn slot uniforms (`pulseSpawnTimeline*`) at shader time.
 * Mirrors preview `applyRadialPulseSpawnUniforms` using export-safe state (no preview globals).
 */

import type { AudioSetup } from '../data-model/audioSetupTypes';
import type { Connection, NodeGraph } from '../data-model/types';
import { advanceRadialPulseSchmitt } from '../runtime/audio/radialPulseSchmitt';
import { getSignalIdFromVirtualNodeId, isVirtualNodeId } from '../utils/virtualNodes';
import {
  RADIAL_PULSE_SPAWN_SLOT_COUNT,
  radialPulseSpawnTimelineParam,
} from '../shaders/nodes/radial-pulse';
import type { FrameAudioState, OfflineAudioProvider } from './OfflineAudioProvider';

const EXPORT_RADIAL_PULSE_SIM_STEP_SECONDS = 1 / 120;

function findPulseDriveConnection(graph: NodeGraph, nodeId: string): Connection | undefined {
  return graph.connections.find(
    (c) => c.targetNodeId === nodeId && c.targetParameter === 'pulseDrive'
  );
}

function clamp01Param(v: unknown, fallback: number): number {
  if (typeof v !== 'number' || Number.isNaN(v)) return fallback;
  return v;
}

function readPulseFreeRunIntervalSeconds(parameters: Record<string, unknown> | undefined): number {
  const raw = parameters?.pulseFreeRunInterval;
  const v = typeof raw === 'number' && Number.isFinite(raw) ? raw : 2.0;
  return Math.max(0, v);
}

function radialPulseSpawnSlotsUnsetFromGraphParams(parameters: Record<string, unknown> | undefined): boolean {
  for (let i = 0; i < RADIAL_PULSE_SPAWN_SLOT_COUNT; i++) {
    const key = radialPulseSpawnTimelineParam(i);
    const v = parameters?.[key];
    if (typeof v === 'number' && Number.isFinite(v) && v >= -9e9) {
      return false;
    }
  }
  return true;
}

function lookupUniformValue(
  updates: FrameAudioState['uniformUpdates'],
  nodeId: string,
  paramName: string
): number | undefined {
  const hit = updates.find((u) => u.nodeId === nodeId && u.paramName === paramName);
  return hit && Number.isFinite(hit.value) ? hit.value : undefined;
}

/** Resolve virtual audio-signal value from offline analysis uniform updates at `timeSeconds`. */
export function getOfflineVirtualNodeLiveValue(
  virtualNodeId: string,
  audioSetup: AudioSetup | null | undefined,
  offlineAudio: OfflineAudioProvider | null | undefined,
  timeSeconds: number
): number | null {
  if (!audioSetup || !offlineAudio || !isVirtualNodeId(virtualNodeId)) return null;

  const signalId = getSignalIdFromVirtualNodeId(virtualNodeId);
  if (!signalId) return null;

  const updates = offlineAudio.getUniformUpdatesAtTime(timeSeconds);

  const bandRawMatch = signalId.match(/^band-(.+)-raw$/);
  if (bandRawMatch) {
    const bandId = bandRawMatch[1];
    const band = audioSetup.bands.find((b) => b.id === bandId);
    if (!band) return null;
    const v = lookupUniformValue(updates, band.id, 'band');
    return v ?? null;
  }

  const bandRemapMatch = signalId.match(/^band-(.+)-remap$/);
  if (bandRemapMatch) {
    const bandId = bandRemapMatch[1];
    const band = audioSetup.bands.find((b) => b.id === bandId);
    if (!band) return null;
    const v = lookupUniformValue(updates, band.id, 'remap');
    return v ?? null;
  }

  const remapMatch = signalId.match(/^remap-(.+)$/);
  if (remapMatch) {
    const remapperId = remapMatch[1];
    const v = lookupUniformValue(updates, `remap-${remapperId}`, 'out');
    return v ?? null;
  }

  return null;
}

export class ExportRadialPulseSpawnState {
  private readonly armedByNodeId = new Map<string, boolean>();
  private readonly nextSpawnSlotByNodeId = new Map<string, number>();
  private readonly lastFreeRunSpawnAtShaderTimeByNodeId = new Map<string, number>();
  private readonly nextFreeRunSlotByNodeId = new Map<string, number>();
  reset(): void {
    this.armedByNodeId.clear();
    this.nextSpawnSlotByNodeId.clear();
    this.lastFreeRunSpawnAtShaderTimeByNodeId.clear();
    this.nextFreeRunSlotByNodeId.clear();
  }

  /**
   * Replay spawn logic from shader time 0 → `targetShaderTime` (still-image scrub / jump).
   */
  simulateToShaderTime(args: {
    graph: NodeGraph;
    audioSetup: AudioSetup | null | undefined;
    offlineAudio: OfflineAudioProvider | null | undefined;
    targetShaderTime: number;
    stepSeconds?: number;
  }): FrameAudioState['uniformUpdates'] {
    this.reset();
    const step = args.stepSeconds ?? EXPORT_RADIAL_PULSE_SIM_STEP_SECONDS;
    const target = Math.max(0, args.targetShaderTime);

    let t = 0;
    let lastUpdates: FrameAudioState['uniformUpdates'] = [];
    while (t <= target + 1e-9) {
      lastUpdates = this.advanceFrame({
        graph: args.graph,
        audioSetup: args.audioSetup,
        offlineAudio: args.offlineAudio,
        shaderTime: t,
      });
      if (t >= target) break;
      t = Math.min(target, t + step);
    }
    return lastUpdates;
  }

  /**
   * Advance one export frame at `shaderTime` (monotonic in video export).
   * Returns spawn slot writes for this instant only.
   */
  advanceFrame(args: {
    graph: NodeGraph;
    audioSetup: AudioSetup | null | undefined;
    offlineAudio: OfflineAudioProvider | null | undefined;
    shaderTime: number;
  }): FrameAudioState['uniformUpdates'] {
    const { graph, audioSetup, offlineAudio, shaderTime } = args;
    if (!graph.nodes?.length || !Number.isFinite(shaderTime)) {
      return [];
    }

    const updates: FrameAudioState['uniformUpdates'] = [];
    const pulseNodes = graph.nodes.filter((n) => n.type === 'radial-pulse');
    const activeIds = new Set(pulseNodes.map((n) => n.id));

    for (const id of [...this.armedByNodeId.keys()]) {
      if (!activeIds.has(id)) this.armedByNodeId.delete(id);
    }
    for (const id of [...this.nextSpawnSlotByNodeId.keys()]) {
      if (!activeIds.has(id)) this.nextSpawnSlotByNodeId.delete(id);
    }
    for (const id of [...this.lastFreeRunSpawnAtShaderTimeByNodeId.keys()]) {
      if (!activeIds.has(id)) this.lastFreeRunSpawnAtShaderTimeByNodeId.delete(id);
    }
    for (const id of [...this.nextFreeRunSlotByNodeId.keys()]) {
      if (!activeIds.has(id)) this.nextFreeRunSlotByNodeId.delete(id);
    }

    for (const node of pulseNodes) {
      const conn = findPulseDriveConnection(graph, node.id);
      const sourceId = conn?.sourceNodeId;
      const virtualDrive = !!(sourceId && isVirtualNodeId(sourceId));

      if (!virtualDrive) {
        this.armedByNodeId.delete(node.id);
        this.nextSpawnSlotByNodeId.delete(node.id);

        const intervalSec = readPulseFreeRunIntervalSeconds(node.parameters);
        if (intervalSec <= 0 || !radialPulseSpawnSlotsUnsetFromGraphParams(node.parameters)) {
          this.lastFreeRunSpawnAtShaderTimeByNodeId.delete(node.id);
          this.nextFreeRunSlotByNodeId.delete(node.id);
          continue;
        }

        let lastSpawn = this.lastFreeRunSpawnAtShaderTimeByNodeId.get(node.id);
        if (lastSpawn === undefined || shaderTime - lastSpawn >= intervalSec - 1e-6) {
          const slot = this.nextFreeRunSlotByNodeId.get(node.id) ?? 0;
          updates.push({
            nodeId: node.id,
            paramName: radialPulseSpawnTimelineParam(slot),
            value: shaderTime,
          });
          this.nextFreeRunSlotByNodeId.set(node.id, (slot + 1) % RADIAL_PULSE_SPAWN_SLOT_COUNT);
          this.lastFreeRunSpawnAtShaderTimeByNodeId.set(node.id, shaderTime);
        }
        continue;
      }

      this.lastFreeRunSpawnAtShaderTimeByNodeId.delete(node.id);
      this.nextFreeRunSlotByNodeId.delete(node.id);

      const signal = getOfflineVirtualNodeLiveValue(sourceId, audioSetup, offlineAudio, shaderTime);
      if (signal == null || !Number.isFinite(signal)) {
        continue;
      }

      const rise = clamp01Param(node.parameters.pulseRiseThreshold, 0.55);
      const fall = clamp01Param(node.parameters.pulseFallThreshold, 0.35);

      const prevArmed = this.armedByNodeId.get(node.id) ?? true;
      const { armed, fired } = advanceRadialPulseSchmitt(prevArmed, signal, rise, fall);
      this.armedByNodeId.set(node.id, armed);

      if (fired) {
        const slot = this.nextSpawnSlotByNodeId.get(node.id) ?? 0;
        updates.push({
          nodeId: node.id,
          paramName: radialPulseSpawnTimelineParam(slot),
          value: shaderTime,
        });
        this.nextSpawnSlotByNodeId.set(node.id, (slot + 1) % RADIAL_PULSE_SPAWN_SLOT_COUNT);
      }
    }

    return updates;
  }
}

export interface ExportFrameUniformScratch {
  radialPulseSpawn: ExportRadialPulseSpawnState;
}

export function createExportFrameUniformScratch(): ExportFrameUniformScratch {
  return { radialPulseSpawn: new ExportRadialPulseSpawnState() };
}
