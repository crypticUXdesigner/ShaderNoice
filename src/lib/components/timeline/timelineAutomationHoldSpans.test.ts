import { describe, it, expect } from 'vitest';
import type { AutomationLane } from '../../../data-model/types';
import { getAutomationHoldSpanTimeRanges } from './timelineAutomationHoldSpans';

function laneFromRegions(regions: AutomationLane['regions']): AutomationLane {
  return {
    id: 'lane',
    nodeId: 'n1',
    paramName: 'p',
    regions,
  };
}

describe('getAutomationHoldSpanTimeRanges', () => {
  it('returns lead-in before first region', () => {
    const lane = laneFromRegions([
      {
        id: 'r1',
        startTime: 5,
        duration: 10,
        loop: false,
        curve: { interpolation: 'linear', keyframes: [{ time: 0, value: 0 }] },
      },
    ]);
    expect(getAutomationHoldSpanTimeRanges(lane, 60)).toEqual([
      { start: 0, end: 5 },
      { start: 15, end: 60 },
    ]);
  });

  it('returns gap between two non-looping regions', () => {
    const lane = laneFromRegions([
      {
        id: 'a',
        startTime: 0,
        duration: 10,
        loop: false,
        curve: { interpolation: 'linear', keyframes: [{ time: 0, value: 0 }] },
      },
      {
        id: 'b',
        startTime: 20,
        duration: 10,
        loop: false,
        curve: { interpolation: 'linear', keyframes: [{ time: 0, value: 0 }] },
      },
    ]);
    expect(getAutomationHoldSpanTimeRanges(lane, 60)).toEqual([
      { start: 10, end: 20 },
      { start: 30, end: 60 },
    ]);
  });

  it('ignores empty regions', () => {
    const lane = laneFromRegions([
      {
        id: 'empty',
        startTime: 0,
        duration: 5,
        loop: false,
        curve: { interpolation: 'linear', keyframes: [] },
      },
      {
        id: 'real',
        startTime: 5,
        duration: 10,
        loop: false,
        curve: { interpolation: 'linear', keyframes: [{ time: 0, value: 0 }] },
      },
    ]);
    expect(getAutomationHoldSpanTimeRanges(lane, 60)).toEqual([
      { start: 0, end: 5 },
      { start: 15, end: 60 },
    ]);
  });

  it('no tail span when last region loops', () => {
    const lane = laneFromRegions([
      {
        id: 'loop',
        startTime: 0,
        duration: 10,
        loop: true,
        curve: { interpolation: 'linear', keyframes: [{ time: 0, value: 0 }] },
      },
    ]);
    expect(getAutomationHoldSpanTimeRanges(lane, 60)).toEqual([]);
  });
});
