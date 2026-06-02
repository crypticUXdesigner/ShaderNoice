import { describe, expect, it } from 'vitest';
import type { NodeGraph } from '../data-model/types';
import { getAutomationExpressionForParam } from '../shaders/compilation/FloatParamExpressions';
import { getAutomationValueForParam } from './automationEvaluator';
import {
  getParamDriverBypassState,
  setParamDriverBypass,
} from './paramDriverBypass';
import { computeEffectiveParameterValue } from './parameterValueCalculator';
import { evaluateMidiEnvelopeSignalForParam } from './midiEnvelopeSignals';
import type { NodeSpec } from '../types/nodeSpec';

function baseGraph(overrides: Partial<NodeGraph> = {}): NodeGraph {
  return {
    id: 'graph-test',
    name: 'Test',
    version: '2.0',
    nodes: [
      {
        id: 'n1',
        type: 'test',
        parameters: { amount: 0.25 },
        position: { x: 0, y: 0 },
      },
    ],
    connections: [],
    viewState: { zoom: 1, panX: 0, panY: 0, selectedNodeIds: [] },
    ...overrides,
  };
}

const floatParamSpec: NodeSpec['parameters'][string] = {
  type: 'float',
  label: 'Amount',
  default: 0.5,
  min: 0,
  max: 1,
};

const nodeSpecs = new Map<string, NodeSpec>([
  [
    'test',
    {
      id: 'test',
      displayName: 'Test',
      category: 'test',
      parameters: { amount: floatParamSpec },
      inputs: [],
      outputs: [],
    },
  ],
]);

describe('paramDriverBypass', () => {
  it('prefers connection over MIDI and animation for bypass target', () => {
    const graph = baseGraph({
      connections: [
        {
          id: 'c1',
          sourceNodeId: 'src',
          sourcePort: 'out',
          targetNodeId: 'n1',
          targetParameter: 'amount',
        },
      ],
      midiEnvelopePresets: [
        {
          id: 'preset-1',
          trackIds: ['t1'],
          envelope: {
            adsr: { attackSeconds: 0.01, decaySeconds: 0.1, sustainLevel: 0.5, releaseSeconds: 0.2 },
          },
        },
      ],
      midiEnvelopeRemappers: [
        { id: 'remapper-preset-1', envelopePresetId: 'preset-1', outMin: 0, outMax: 1 },
      ],
      midiEnvelopeBindings: [
        {
          id: 'b1',
          remapperId: 'remapper-preset-1',
          nodeId: 'n1',
          paramName: 'amount',
        },
      ],
      automation: {
        bpm: 120,
        durationSeconds: 10,
        lanes: [
          {
            id: 'lane-1',
            nodeId: 'n1',
            paramName: 'amount',
            regions: [
              {
                id: 'r1',
                startTime: 0,
                duration: 10,
                loop: false,
                curve: { keyframes: [{ time: 0, value: 1 }, { time: 1, value: 1 }] },
              },
            ],
          },
        ],
      },
    });
    expect(getParamDriverBypassState(graph, 'n1', 'amount')).toMatchObject({
      hasBypassTarget: true,
      targetKind: 'connection',
      connectionId: 'c1',
      bypassed: false,
    });
  });

  it('toggles connection disabled and falls back to static config when bypassed', () => {
    let graph = baseGraph({
      connections: [
        {
          id: 'c1',
          sourceNodeId: 'src',
          sourcePort: 'out',
          targetNodeId: 'n1',
          targetParameter: 'amount',
        },
      ],
    });
    graph = setParamDriverBypass(graph, 'n1', 'amount', true);
    expect(getParamDriverBypassState(graph, 'n1', 'amount').bypassed).toBe(true);
    const node = graph.nodes[0];
    const effective = computeEffectiveParameterValue(
      node,
      'amount',
      floatParamSpec,
      graph,
      nodeSpecs
    );
    expect(effective).toBe(0.25);
  });

  it('toggles animation lane disabled and drops GLSL automation expression', () => {
    let graph = baseGraph({
      automation: {
        bpm: 120,
        durationSeconds: 10,
        lanes: [
          {
            id: 'lane-1',
            nodeId: 'n1',
            paramName: 'amount',
            regions: [
              {
                id: 'r1',
                startTime: 0,
                duration: 10,
                loop: false,
                curve: { keyframes: [{ time: 0, value: 0 }, { time: 1, value: 1 }] },
              },
            ],
          },
        ],
      },
    });
    expect(
      getAutomationExpressionForParam('n1', 'amount', graph, floatParamSpec)
    ).toContain('evalAutomation_');
    graph = setParamDriverBypass(graph, 'n1', 'amount', true);
    expect(getParamDriverBypassState(graph, 'n1', 'amount')).toMatchObject({
      targetKind: 'lane',
      bypassed: true,
    });
    expect(
      getAutomationExpressionForParam('n1', 'amount', graph, floatParamSpec)
    ).toBeNull();
    expect(
      getAutomationValueForParam(graph.nodes[0], 'amount', graph, 5, floatParamSpec)
    ).toBeNull();
  });

  it('toggles MIDI binding disabled and skips envelope evaluation', () => {
    let graph = baseGraph({
      midiEnvelopePresets: [
        {
          id: 'preset-1',
          trackIds: ['t1'],
          envelope: {
            adsr: { attackSeconds: 0.01, decaySeconds: 0.1, sustainLevel: 0.5, releaseSeconds: 0.2 },
          },
        },
      ],
      midiEnvelopeRemappers: [
        { id: 'remapper-preset-1', envelopePresetId: 'preset-1', outMin: 0, outMax: 1 },
      ],
      midiEnvelopeBindings: [
        {
          id: 'b1',
          remapperId: 'remapper-preset-1',
          nodeId: 'n1',
          paramName: 'amount',
        },
      ],
    });
    graph = setParamDriverBypass(graph, 'n1', 'amount', true);
    const { value } = evaluateMidiEnvelopeSignalForParam(
      graph.nodes[0],
      'amount',
      graph,
      1,
      { notes: [], tracks: [], durationSeconds: 10 }
    );
    expect(value).toBeNull();
    graph = setParamDriverBypass(graph, 'n1', 'amount', false);
    expect(getParamDriverBypassState(graph, 'n1', 'amount')).toMatchObject({
      targetKind: 'binding',
      bypassed: false,
    });
    expect(graph.midiEnvelopeBindings?.[0].disabled).toBeUndefined();
  });
});
