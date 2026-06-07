/**
 * Merge offline audio, MIDI envelope, arrangement loop-index, and radial-pulse spawn
 * uniform updates for export frames.
 */

import type { AudioSetup } from '../data-model/audioSetupTypes';
import type { NodeGraph } from '../data-model/types';
import { getArrangementLoopExportUniformUpdates } from './exportArrangementLoopUniforms';
import {
  createExportFrameUniformScratch,
  type ExportFrameUniformScratch,
} from './exportRadialPulseSpawn';
import { getMidiEnvelopeExportUniformUpdates } from './offlineMidiEnvelopeUniforms';
import type { FrameAudioState, OfflineAudioProvider } from './OfflineAudioProvider';

export type { ExportFrameUniformScratch } from './exportRadialPulseSpawn';
export { createExportFrameUniformScratch } from './exportRadialPulseSpawn';

export interface BuildExportFrameStateParams {
  graph: NodeGraph;
  audioSetup: AudioSetup | null | undefined;
  frameIndex: number;
  frameRate: number;
  startTimeSeconds: number;
  /** When absent, only MIDI + timeline time are computed (no audio channel samples). */
  offlineAudio?: OfflineAudioProvider | null;
  /**
   * Exact transport time for still-image export / scrub preview (bypasses frame-center math).
   * Video export omits this and uses offline audio or `startTimeSeconds + (frameIndex + 0.5) / frameRate`.
   */
  timelineTimeOverride?: number;
  /**
   * Shader `uTime` clock (defaults to `startTimeSeconds + frameIndex / frameRate`).
   * Radial-pulse spawn slots use this time, not transport time.
   */
  shaderTime?: number;
  /**
   * Persistent scratch for frame-to-frame state (video export). When omitted and the graph has
   * `radial-pulse` nodes, a per-call ephemeral scratch is used.
   */
  scratch?: ExportFrameUniformScratch;
  /**
   * When true, replay stateful preview drivers from shader time 0 → current frame (still-image scrub).
   * Defaults to true when `timelineTimeOverride` is set, false for sequential video frames.
   */
  replayStatefulDrivers?: boolean;
}

function graphHasRadialPulse(graph: NodeGraph): boolean {
  return graph.nodes.some((n) => n.type === 'radial-pulse');
}

/**
 * Build per-frame export state: audio channel samples (when provider present),
 * merged uniform updates (audio + MIDI + arrangement loops + radial-pulse spawns),
 * and transport `timelineTime`.
 */
export function buildExportFrameState({
  graph,
  audioSetup,
  frameIndex,
  frameRate,
  startTimeSeconds,
  offlineAudio,
  timelineTimeOverride,
  shaderTime: shaderTimeParam,
  scratch: scratchParam,
  replayStatefulDrivers: replayStatefulDriversParam,
}: BuildExportFrameStateParams): FrameAudioState {
  let channelSamples: Float32Array[] = [];
  let uniformUpdates: FrameAudioState['uniformUpdates'] = [];
  let timelineTime: number;

  if (offlineAudio) {
    const audioState = offlineAudio.getFrameState(frameIndex);
    channelSamples = audioState.channelSamples;
    uniformUpdates = audioState.uniformUpdates.slice();
    timelineTime = timelineTimeOverride ?? audioState.timelineTime;
  } else {
    timelineTime =
      timelineTimeOverride ?? startTimeSeconds + (frameIndex + 0.5) / frameRate;
  }

  const shaderTime = shaderTimeParam ?? startTimeSeconds + frameIndex / frameRate;
  const replayStatefulDrivers =
    replayStatefulDriversParam ?? timelineTimeOverride != null;

  const midiUpdates = getMidiEnvelopeExportUniformUpdates(
    graph,
    audioSetup?.arrangementSnapshot,
    timelineTime
  );
  if (midiUpdates.length > 0) {
    uniformUpdates.push(...midiUpdates);
  }

  const arrangementLoopUpdates = getArrangementLoopExportUniformUpdates(
    graph,
    audioSetup,
    timelineTime
  );
  if (arrangementLoopUpdates.length > 0) {
    uniformUpdates.push(...arrangementLoopUpdates);
  }

  if (graphHasRadialPulse(graph) && Number.isFinite(shaderTime)) {
    let scratch = scratchParam;
    let ephemeral: ExportFrameUniformScratch | null = null;
    if (!scratch) {
      ephemeral = createExportFrameUniformScratch();
      scratch = ephemeral;
    }

    const spawnUpdates = replayStatefulDrivers
      ? scratch.radialPulseSpawn.simulateToShaderTime({
          graph,
          audioSetup,
          offlineAudio: offlineAudio ?? null,
          targetShaderTime: shaderTime,
        })
      : scratch.radialPulseSpawn.advanceFrame({
          graph,
          audioSetup,
          offlineAudio: offlineAudio ?? null,
          shaderTime,
        });

    if (spawnUpdates.length > 0) {
      uniformUpdates.push(...spawnUpdates);
    }
  }

  return { channelSamples, uniformUpdates, timelineTime };
}
