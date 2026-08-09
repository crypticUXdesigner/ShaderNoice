import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TimeManager } from './TimeManager';
import type { PreviewDependencyMask } from '../../compile-contract';

function staticDeps(): PreviewDependencyMask {
  return {
    usesWallTime: false,
    usesTimelineTime: false,
    usesAudioUniforms: false,
    usesRadialPulseVirtualDrive: false,
    usesRadialPulseSpawnUniformPass: false,
    usesResolutionUniform: true,
    usesMouseUniforms: false,
    usesFrameIndex: false
  };
}

function audioDeps(): PreviewDependencyMask {
  return { ...staticDeps(), usesAudioUniforms: true };
}

function radialDriveDeps(): PreviewDependencyMask {
  return {
    ...staticDeps(),
    usesRadialPulseVirtualDrive: true,
    usesRadialPulseSpawnUniformPass: true,
  };
}

describe('TimeManager (preview scheduling)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not render each tick when paused, static deps, and only wall time advances', () => {
    const tm = new TimeManager();
    const render = vi.fn();
    const markDirty = vi.fn();
    const renderer = { markDirty, render } as import('./TimeManager').ITimeManagerRasterSink;
    const updateAudio = vi.fn();
    const shader = { setTime: vi.fn() };

    tm.markDirty(renderer, 'compilation');
    tm.updateTime(0, shader as never, renderer, { audioUniforms: updateAudio }, {
      previewDependencies: staticDeps(),
      timelinePlaying: false
    });
    expect(render).toHaveBeenCalledTimes(1);

    render.mockClear();
    updateAudio.mockClear();
    tm.updateTime(1, shader as never, renderer, { audioUniforms: updateAudio }, {
      previewDependencies: staticDeps(),
      timelinePlaying: false
    });
    expect(render).not.toHaveBeenCalled();
    expect(updateAudio).not.toHaveBeenCalled();
  });

  it('throttles audio uniform pass when paused with audio deps', () => {
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(0);
    const tm = new TimeManager();
    const render = vi.fn();
    const renderer = { markDirty: vi.fn(), render } as import('./TimeManager').ITimeManagerRasterSink;
    const updateAudio = vi.fn();
    const shader = { setTime: vi.fn() };

    const opts = { previewDependencies: audioDeps(), timelinePlaying: false };

    tm.markDirty(renderer, 'compilation');
    tm.updateTime(0, shader as never, renderer, { audioUniforms: updateAudio }, opts);
    expect(updateAudio).toHaveBeenCalledTimes(1);
    updateAudio.mockClear();
    render.mockClear();

    nowSpy.mockReturnValue(20);
    tm.updateTime(0.02, shader as never, renderer, { audioUniforms: updateAudio }, opts);
    expect(updateAudio).not.toHaveBeenCalled();

    nowSpy.mockReturnValue(100);
    tm.updateTime(0.04, shader as never, renderer, { audioUniforms: updateAudio }, opts);
    expect(updateAudio).toHaveBeenCalledTimes(1);
  });

  it('throttles analyser pass when paused with radial pulse virtual-drive deps (spawn path)', () => {
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(0);
    const tm = new TimeManager();
    const render = vi.fn();
    const renderer = { markDirty: vi.fn(), render } as import('./TimeManager').ITimeManagerRasterSink;
    const updateAudio = vi.fn();
    const shader = { setTime: vi.fn() };

    const opts = { previewDependencies: radialDriveDeps(), timelinePlaying: false };

    tm.markDirty(renderer, 'compilation');
    tm.updateTime(0, shader as never, renderer, { audioUniforms: updateAudio }, opts);
    expect(updateAudio).toHaveBeenCalledTimes(1);
    updateAudio.mockClear();

    nowSpy.mockReturnValue(20);
    tm.updateTime(0.02, shader as never, renderer, { audioUniforms: updateAudio }, opts);
    expect(updateAudio).not.toHaveBeenCalled();

    nowSpy.mockReturnValue(100);
    tm.updateTime(0.04, shader as never, renderer, { audioUniforms: updateAudio }, opts);
    expect(updateAudio).toHaveBeenCalledTimes(1);
  });

  it('runs MIDI envelope pass on timeline scrub without audio deps', () => {
    const tm = new TimeManager();
    const render = vi.fn();
    const renderer = { markDirty: vi.fn(), render } as import('./TimeManager').ITimeManagerRasterSink;
    const updateMidi = vi.fn();
    const shader = { setTime: vi.fn() };

    tm.markDirty(renderer, 'compilation');
    tm.updateTime(0, shader as never, renderer, { midiEnvelopeUniforms: updateMidi }, {
      previewDependencies: staticDeps(),
      timelinePlaying: false,
      midiEnvelopeDriversActive: true,
      timelineTime: 0,
    });
    expect(updateMidi).toHaveBeenCalledTimes(1);
    updateMidi.mockClear();
    render.mockClear();

    tm.updateTime(0.02, shader as never, renderer, { midiEnvelopeUniforms: updateMidi }, {
      previewDependencies: staticDeps(),
      timelinePlaying: false,
      midiEnvelopeDriversActive: true,
      timelineTime: 0.02,
    });
    expect(updateMidi).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('does not run audio pass when only MIDI callback is registered', () => {
    const tm = new TimeManager();
    const renderer = { markDirty: vi.fn(), render: vi.fn() } as import('./TimeManager').ITimeManagerRasterSink;
    const updateAudio = vi.fn();
    const updateMidi = vi.fn();
    const shader = { setTime: vi.fn() };

    tm.markDirty(renderer, 'compilation');
    tm.updateTime(0, shader as never, renderer, { midiEnvelopeUniforms: updateMidi }, {
      previewDependencies: staticDeps(),
      timelinePlaying: true,
      midiEnvelopeDriversActive: true,
      timelineTime: 0,
    });
    expect(updateMidi).toHaveBeenCalledTimes(1);
    expect(updateAudio).not.toHaveBeenCalled();
  });
});
