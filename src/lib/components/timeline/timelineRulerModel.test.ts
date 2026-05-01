import { describe, expect, it } from 'vitest';
import { buildTimelineRulerData, pickRulerBarStep } from './timelineRulerModel';

describe('timelineRulerModel', () => {
  it('pickRulerBarStep uses 1 when few bars in view', () => {
    expect(pickRulerBarStep(10)).toBe(1);
  });

  it('buildTimelineRulerData returns null when duration is zero', () => {
    expect(
      buildTimelineRulerData({
        duration: 0,
        bpm: 120,
        hasAudio: false,
        visibleDuration: 10,
        panOffset: 0,
      })
    ).toBeNull();
  });

  it('buildTimelineRulerData returns ticks for normal viewport', () => {
    const data = buildTimelineRulerData({
      duration: 60,
      bpm: 120,
      hasAudio: true,
      visibleDuration: 30,
      panOffset: 0,
    });
    expect(data).not.toBeNull();
    expect(data!.hasAudio).toBe(true);
    expect(data!.barSeconds).toBeCloseTo(0.5);
    expect(data!.ticks.length).toBeGreaterThan(0);
  });
});
