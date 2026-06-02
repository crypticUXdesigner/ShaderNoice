import { describe, it, expect } from 'vitest';
import { createEmptyGraph } from './utils';
import {
  addDefaultAutomationDriverForParam,
  buildDefaultAutomationCurveForParam,
  resolveDefaultAutomationRegionDurationSeconds,
} from './immutableUpdatesAutomation';
import { automationLaneHasEvaluableRegions } from '../utils/automationEvaluator';
import type { ParameterSpec } from '../types/nodeSpec';

describe('buildDefaultAutomationCurveForParam', () => {
  it('seeds a flat bezier curve at the normalized current param value', () => {
    const node = {
      id: 'n1',
      type: 'test',
      parameters: { amount: 0.25 },
      position: { x: 0, y: 0 },
    };
    const spec: ParameterSpec = {
      type: 'float',
      label: 'Amount',
      min: 0,
      max: 1,
      default: 0.5,
    };
    const curve = buildDefaultAutomationCurveForParam(node, 'amount', spec);
    expect(curve).toEqual({
      keyframes: [
        { time: 0, value: 0.25 },
        { time: 1, value: 0.25 },
      ],
      interpolation: 'bezier',
    });
  });

  it('returns undefined for non-float parameters', () => {
    const node = {
      id: 'n1',
      type: 'test',
      parameters: { count: 3 },
      position: { x: 0, y: 0 },
    };
    const spec: ParameterSpec = { type: 'int', label: 'Count', default: 0 };
    expect(buildDefaultAutomationCurveForParam(node, 'count', spec)).toBeUndefined();
  });
});

describe('resolveDefaultAutomationRegionDurationSeconds', () => {
  it('prefers transport duration when longer than automation duration', () => {
    const graph = {
      ...createEmptyGraph('t'),
      automation: { bpm: 120, durationSeconds: 30, lanes: [] },
    };
    expect(resolveDefaultAutomationRegionDurationSeconds(graph, 180)).toBe(180);
  });

  it('falls back to automation duration when transport is absent', () => {
    const graph = {
      ...createEmptyGraph('t'),
      automation: { bpm: 120, durationSeconds: 45, lanes: [] },
    };
    expect(resolveDefaultAutomationRegionDurationSeconds(graph, null)).toBe(45);
  });
});

describe('addDefaultAutomationDriverForParam', () => {
  it('creates lane + full-length evaluable region from port add flow', () => {
    const graph = {
      ...createEmptyGraph('t'),
      nodes: [
        {
          id: 'node-1',
          type: 'color-gradient',
          parameters: { amount: 0.6 },
          position: { x: 0, y: 0 },
        },
      ],
      automation: { bpm: 120, durationSeconds: 60, lanes: [] },
    };
    const spec: ParameterSpec = {
      type: 'float',
      label: 'Amount',
      min: 0,
      max: 1,
      default: 0.5,
    };
    const updated = addDefaultAutomationDriverForParam(
      graph,
      'node-1',
      'amount',
      'lane-1',
      'region-1',
      graph.nodes[0],
      spec,
      { transportDurationSeconds: 90 }
    );
    const lane = updated.automation!.lanes.find((l) => l.id === 'lane-1');
    expect(lane).toBeDefined();
    expect(lane!.nodeId).toBe('node-1');
    expect(lane!.paramName).toBe('amount');
    expect(automationLaneHasEvaluableRegions(lane!)).toBe(true);
    const region = lane!.regions[0];
    expect(region.startTime).toBe(0);
    expect(region.duration).toBe(90);
    expect(region.curve.keyframes).toEqual([
      { time: 0, value: 0.6 },
      { time: 1, value: 0.6 },
    ]);
  });
});
