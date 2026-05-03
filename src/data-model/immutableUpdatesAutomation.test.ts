import { describe, it, expect } from 'vitest';
import { createEmptyGraph } from './utils';
import {
  addAutomationLane,
  addAutomationRegion,
  updateAutomationRegion,
} from './immutableUpdatesAutomation';

const curve = {
  keyframes: [
    { time: 0, value: 0 },
    { time: 1, value: 1 },
  ],
  interpolation: 'linear' as const,
};

describe('updateAutomationRegion overlap resolution', () => {
  it('extends right edge into next region by trimming duration, not moving start', () => {
    let g = createEmptyGraph('t');
    g = {
      ...g,
      automation: { bpm: 120, durationSeconds: 60, lanes: [] },
    };
    g = addAutomationLane(g, { id: 'lane1', nodeId: 'n1', paramName: 'p' });
    g = addAutomationRegion(g, 'lane1', {
      id: 'a',
      startTime: 0,
      duration: 8,
      loop: false,
      curve,
    });
    g = addAutomationRegion(g, 'lane1', {
      id: 'b',
      startTime: 10,
      duration: 5,
      loop: false,
      curve,
    });

    const lane = g.automation!.lanes[0];
    const idxA = lane.regions.findIndex((r) => r.id === 'a');
    expect(idxA).toBe(0);

    g = updateAutomationRegion(g, 'lane1', 'a', { duration: 15 });
    const a = g.automation!.lanes[0].regions.find((r) => r.id === 'a')!;
    expect(a.startTime).toBe(0);
    expect(a.duration).toBe(10);
  });

  it('extends automation.durationSeconds when a new region ends past the old cap', () => {
    let g = createEmptyGraph('t');
    g = {
      ...g,
      automation: { bpm: 120, durationSeconds: 12, lanes: [] },
    };
    g = addAutomationLane(g, { id: 'lane1', nodeId: 'n1', paramName: 'p' });
    g = addAutomationRegion(g, 'lane1', {
      id: 'a',
      startTime: 8,
      duration: 8,
      loop: false,
      curve,
    });
    expect(g.automation!.durationSeconds).toBeGreaterThanOrEqual(16);
    const a = g.automation!.lanes[0].regions.find((r) => r.id === 'a')!;
    expect(a.startTime).toBe(8);
    expect(a.duration).toBe(8);
  });

  it('pushes start when moved into another region (left overlap)', () => {
    let g = createEmptyGraph('t');
    g = {
      ...g,
      automation: { bpm: 120, durationSeconds: 60, lanes: [] },
    };
    g = addAutomationLane(g, { id: 'lane1', nodeId: 'n1', paramName: 'p' });
    g = addAutomationRegion(g, 'lane1', {
      id: 'left',
      startTime: 0,
      duration: 4,
      loop: false,
      curve,
    });
    g = addAutomationRegion(g, 'lane1', {
      id: 'right',
      startTime: 8,
      duration: 4,
      loop: false,
      curve,
    });

    g = updateAutomationRegion(g, 'lane1', 'right', { startTime: 2 });
    const r = g.automation!.lanes[0].regions.find((x) => x.id === 'right')!;
    expect(r.startTime).toBe(4);
    expect(r.duration).toBe(4);
  });

  it('updateAutomationRegion grows automation.durationSeconds when region end exceeds cap', () => {
    let g = createEmptyGraph('t');
    g = { ...g, automation: { bpm: 120, durationSeconds: 10, lanes: [] } };
    g = addAutomationLane(g, { id: 'lane1', nodeId: 'n1', paramName: 'p' });
    g = addAutomationRegion(g, 'lane1', {
      id: 'a',
      startTime: 0,
      duration: 4,
      loop: false,
      curve,
    });
    g = updateAutomationRegion(g, 'lane1', 'a', { duration: 20 });
    expect(g.automation!.durationSeconds).toBeGreaterThanOrEqual(20);
    const a = g.automation!.lanes[0].regions.find((r) => r.id === 'a')!;
    expect(a.duration).toBe(20);
  });
});
