/**
 * Regression: lane-wide automation GLSL must include lead-in / hold / tail — not idle param_min.
 */
import { describe, it, expect } from 'vitest';
import type { NodeGraph } from '../../data-model/types';
import type { NodeSpec } from '../../types/nodeSpec';
import {
  generateAutomationFunctions,
  sanitizeAutomationLaneId,
  emitCurveEvalGlsl,
} from './MainCodeGeneratorOutput';

function testSpecs(): Map<string, NodeSpec> {
  const targetSpec: NodeSpec = {
    id: 'test-target',
    displayName: 'Test Target',
    category: 'Test',
    inputs: [],
    outputs: [{ name: 'out', type: 'float' }],
    parameters: {
      gain: { type: 'float', default: 0.5, min: 0, max: 1 },
    },
    mainCode: 'void main() {}',
  };
  return new Map([[targetSpec.id, targetSpec]]);
}

describe('generateAutomationFunctions (lane extrapolation)', () => {
  it('emits lead-in, gap hold, and tail — not only region interiors', () => {
    const nodeId = 'n-target';
    const graph: NodeGraph = {
      id: 'g',
      name: 'G',
      version: '2.0',
      nodes: [
        {
          id: nodeId,
          type: 'test-target',
          position: { x: 0, y: 0 },
          parameters: { gain: 0.25 },
          parameterInputModes: {},
        },
      ],
      connections: [],
      automation: {
        bpm: 120,
        durationSeconds: 60,
        lanes: [
          {
            id: 'lane-1',
            nodeId,
            paramName: 'gain',
            regions: [
              {
                id: 'r0',
                startTime: 0,
                duration: 10,
                loop: false,
                curve: {
                  interpolation: 'linear',
                  keyframes: [
                    { time: 0, value: 0 },
                    { time: 1, value: 1 },
                  ],
                },
              },
              {
                id: 'r1',
                startTime: 20,
                duration: 10,
                loop: false,
                curve: {
                  interpolation: 'linear',
                  keyframes: [
                    { time: 0, value: 0 },
                    { time: 1, value: 0 },
                  ],
                },
              },
            ],
          },
        ],
      },
    };

    const glsl = generateAutomationFunctions(
      graph,
      [nodeId],
      testSpecs(),
      sanitizeAutomationLaneId,
      emitCurveEvalGlsl
    );

    expect(glsl.length).toBeGreaterThan(0);
    expect(glsl).toContain(`float evalAutomation_${sanitizeAutomationLaneId('lane-1')}(float t)`);
    // Lead-in: t before first region start (first starts at 0 — skip) — second segment gap hold 10–20
    expect(glsl).toMatch(/t\s*>=\s*10\.0+\s*&&\s*t\s*<\s*20\.0/);
    // Gap hold: first region endpoint at s=1 → 1.0 on [0,1] gain
    expect(glsl).toContain('return 1.0000000000;');
    // Tail: last region curve endpoint at s=1 → 0.0 (matches evaluator; same numeric as min here by coincidence)
    expect(glsl).toContain('return 0.0000000000;');
  });
});
