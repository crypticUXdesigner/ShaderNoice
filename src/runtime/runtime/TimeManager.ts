/**
 * Time Manager
 *
 * Manages time tracking and dirty state for conditional rendering.
 * Extracted from RuntimeManager to improve separation of concerns.
 */

import type { PreviewDependencyMask } from '../../compile-contract';
import type { PreviewProgramInstance } from '../types';
import type { IRenderBackend } from '../renderBackends/IRenderBackend';

/** Clock/present path only needs mark+draw from the backend. */
export type ITimeManagerRasterSink = Pick<IRenderBackend, 'markDirty' | 'render'>;

export interface TimeManagerUniformCallbacks {
  audioUniforms?: (shaderInstance: PreviewProgramInstance) => void;
  midiEnvelopeUniforms?: (shaderInstance: PreviewProgramInstance) => void;
}

export interface TimeManagerUpdateOptions {
  /** From last successful compile; null = legacy full-rate behavior. */
  previewDependencies: PreviewDependencyMask | null;
  /** Timeline transport playing (full-rate preview while true). */
  timelinePlaying: boolean;
  /** Bound MIDI envelope drivers with arrangement snapshot present. */
  midiEnvelopeDriversActive?: boolean;
  /** Timeline transport time in seconds (MIDI envelope + scrub cadence). */
  timelineTime?: number;
}

/**
 * Time Manager
 *
 * Tracks time for shader uniforms and manages dirty state for rendering.
 */
export class TimeManager {
  private lastTime: number = 0;
  private lastTimelineTime: number = 0;
  private isDirty: boolean = false;
  private readonly TIME_CHANGE_THRESHOLD = 0.01; // Only update if change > 0.01s
  /** Last time we ran an audio-uniform pass when paused + audio-reactive (plan §3.6 cap). */
  private lastPausedAudioUniformMs = 0;
  /** Last time we ran a MIDI-envelope pass when paused + MIDI drivers active. */
  private lastPausedMidiEnvelopeUniformMs = 0;
  private static readonly PAUSED_DRIVER_MIN_INTERVAL_MS = 1000 / 15;

  /**
   * Update time uniform if it changed meaningfully or if dirty.
   * When `previewDependencies` is set, skips per-frame audio/analyser work unless the shader
   * uses audio uniforms, radial-pulse spawn passes (virtual Drive and/or loop-interval preview),
   * or the timeline is playing (pattern B — no orphan uploads when idle).
   *
   * @param time - Current wall time value
   * @param shaderInstance - Shader instance to update
   * @param rasterSink - Preview backend (mark dirty + present)
   * @param callbacks - Optional per-frame uniform driver callbacks
   * @returns true if time was updated and render ran, false otherwise
   */
  updateTime(
    time: number,
    shaderInstance: PreviewProgramInstance | null,
    rasterSink: ITimeManagerRasterSink,
    callbacks?: TimeManagerUniformCallbacks,
    options?: TimeManagerUpdateOptions
  ): boolean {
    if (!shaderInstance) return false;

    const deps = options?.previewDependencies ?? null;
    const playing = options?.timelinePlaying ?? false;
    const hasDeps = deps !== null;
    const timelineTime = options?.timelineTime ?? time;
    const midiActive = options?.midiEnvelopeDriversActive ?? false;

    const timeChanged = Math.abs(time - this.lastTime) > this.TIME_CHANGE_THRESHOLD;
    const timelineTimeChanged =
      Math.abs(timelineTime - this.lastTimelineTime) > this.TIME_CHANGE_THRESHOLD;
    const wallOrTimelineDrives =
      !hasDeps || !!(deps && (deps.usesWallTime || deps.usesTimelineTime));
    const needsFrameStepping = !!(deps?.usesFrameIndex);
    const needRenderByClock = wallOrTimelineDrives && (timeChanged || needsFrameStepping);

    const spawnPass = !!(deps?.usesRadialPulseSpawnUniformPass);
    const needsAnalyserCadence =
      !hasDeps ||
      !!(deps && (deps.usesAudioUniforms || deps.usesRadialPulseSpawnUniformPass));

    let shouldRunAudioUniformPass = false;
    if (callbacks?.audioUniforms) {
      if (!hasDeps) {
        shouldRunAudioUniformPass = true;
      } else if (playing) {
        shouldRunAudioUniformPass = true;
      } else if (this.isDirty) {
        shouldRunAudioUniformPass = true;
      } else if (spawnPass && needRenderByClock) {
        shouldRunAudioUniformPass = true;
      } else if (needsAnalyserCadence) {
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        if (now - this.lastPausedAudioUniformMs >= TimeManager.PAUSED_DRIVER_MIN_INTERVAL_MS) {
          shouldRunAudioUniformPass = true;
          this.lastPausedAudioUniformMs = now;
        }
      }
    }

    let shouldRunMidiEnvelopePass = false;
    if (callbacks?.midiEnvelopeUniforms && midiActive) {
      if (!hasDeps) {
        shouldRunMidiEnvelopePass = true;
      } else if (playing) {
        shouldRunMidiEnvelopePass = true;
      } else if (this.isDirty) {
        shouldRunMidiEnvelopePass = true;
      } else if (timelineTimeChanged) {
        shouldRunMidiEnvelopePass = true;
      } else {
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        if (now - this.lastPausedMidiEnvelopeUniformMs >= TimeManager.PAUSED_DRIVER_MIN_INTERVAL_MS) {
          shouldRunMidiEnvelopePass = true;
          this.lastPausedMidiEnvelopeUniformMs = now;
        }
      }
    }

    if (shouldRunAudioUniformPass && callbacks?.audioUniforms) {
      callbacks.audioUniforms(shaderInstance);
    }
    if (shouldRunMidiEnvelopePass && callbacks?.midiEnvelopeUniforms) {
      callbacks.midiEnvelopeUniforms(shaderInstance);
    }

    if (shouldRunMidiEnvelopePass) {
      this.lastTimelineTime = timelineTime;
    }

    const needRenderForPausedAudio = shouldRunAudioUniformPass && needsAnalyserCadence && !playing;
    const needRenderForPausedMidi =
      shouldRunMidiEnvelopePass && midiActive && !playing && timelineTimeChanged;

    if (!this.isDirty && !playing && !needRenderByClock && !needRenderForPausedAudio && !needRenderForPausedMidi) {
      return false;
    }

    this.lastTime = time;
    shaderInstance.setTime(time);

    rasterSink.markDirty('time');
    rasterSink.render();
    this.isDirty = false;

    return true;
  }

  /**
   * Mark runtime as dirty (something changed that requires render).
   *
   * @param rasterSink - Preview backend (mark dirty)
   * @param reason - Reason for marking dirty
   */
  markDirty(rasterSink: ITimeManagerRasterSink, reason: string): void {
    this.isDirty = true;
    rasterSink.markDirty(reason);
  }

  /**
   * Render if dirty.
   *
   * @param rasterSink - Preview backend (present)
   * @returns true if rendered, false if not dirty
   */
  renderIfDirty(rasterSink: ITimeManagerRasterSink): boolean {
    if (this.isDirty) {
      rasterSink.render();
      this.isDirty = false;
      return true;
    }
    return false;
  }

  /**
   * Get last time value.
   */
  getLastTime(): number {
    return this.lastTime;
  }

  /**
   * Check if currently dirty.
   */
  isCurrentlyDirty(): boolean {
    return this.isDirty;
  }

  /**
   * Reset dirty state.
   */
  clearDirty(): void {
    this.isDirty = false;
  }

  /**
   * Reset time tracking.
   */
  reset(): void {
    this.lastTime = 0;
    this.lastTimelineTime = 0;
    this.isDirty = false;
    this.lastPausedAudioUniformMs = 0;
    this.lastPausedMidiEnvelopeUniformMs = 0;
  }
}
