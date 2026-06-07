import { describe, expect, it } from 'vitest';
import type { NodeGraph } from './types';
import {
  addMidiEnvelopeBinding,
  bindMidiEnvelopePresetToParam,
  findMidiEnvelopeBindingForParam,
} from './immutableUpdatesMidiEnvelope';
import {
  defaultRemapperIdForPreset,
  migrateMidiEnvelopePresetToRemappers,
} from './midiEnvelopeRemapperMigration';
import { deserializeGraph, serializeGraph } from './serialization';
import type { NodeSpecification } from './validation';
import type { LegacyMidiEnvelopeBindingWithPresetId } from './midiEnvelopeTypes';

const nodeSpecs: NodeSpecification[] = [
  {
    id: 'constant-float',
    inputs: [],
    outputs: [{ name: 'out', type: 'float' }],
    parameters: [{ name: 'value', type: 'float', default: 0, min: 0, max: 1 }],
  },
];

function baseGraph(): NodeGraph {
  return {
    id: 'graph-1',
    name: 'Test',
    version: '2.0',
    nodes: [{ id: 'n1', type: 'constant-float', parameters: { value: 0.5 }, position: { x: 0, y: 0 } }],
    connections: [],
  };
}

describe('migrateMidiEnvelopePresetToRemappers', () => {
  it('creates default remapper per preset and rewrites presetId bindings', () => {
    const presetId = 'preset-a';
    const graph: NodeGraph = {
      ...baseGraph(),
      midiEnvelopePresets: [
        {
          id: presetId,
          trackIds: ['track-1'],
          envelope: {
            adsr: {
              attackSeconds: 0.02,
              decaySeconds: 0.1,
              sustainLevel: 0.5,
              releaseSeconds: 0.2,
            },
            outMin: 0.1,
            outMax: 0.9,
          },
        },
      ],
      midiEnvelopeBindings: [
        {
          id: 'bind-1',
          presetId,
          nodeId: 'n1',
          paramName: 'value',
        } as LegacyMidiEnvelopeBindingWithPresetId,
      ],
    };

    const migrated = migrateMidiEnvelopePresetToRemappers(graph);
    const remapperId = defaultRemapperIdForPreset(presetId);

    expect(migrated.midiEnvelopeRemappers).toHaveLength(1);
    expect(migrated.midiEnvelopeRemappers![0]).toMatchObject({
      id: remapperId,
      envelopePresetId: presetId,
      inMin: 0,
      inMax: 1,
    });
    expect(migrated.midiEnvelopeBindings![0]).toMatchObject({ outMin: 0.1, outMax: 0.9 });
    expect(migrated.midiEnvelopePresets![0]!.envelope).not.toHaveProperty('outMin');
    expect(migrated.midiEnvelopePresets![0]!.envelope).not.toHaveProperty('outMax');
    expect(migrated.midiEnvelopeBindings![0]!.remapperId).toBe(remapperId);
    expect(migrated.midiEnvelopeBindings![0]).not.toHaveProperty('presetId');
  });

  it('is idempotent on re-run', () => {
    let graph = addMidiEnvelopeBinding(baseGraph(), 'n1', 'value', {
      envelope: { adsr: { attackSeconds: 0.01, decaySeconds: 0.05, sustainLevel: 0.8, releaseSeconds: 0.1 }, outMin: 0, outMax: 2 },
    });
    const once = migrateMidiEnvelopePresetToRemappers(graph);
    const twice = migrateMidiEnvelopePresetToRemappers(once);
    expect(twice).toEqual(once);
  });

  it('creates remappers for presets with zero bindings', () => {
    const presetId = 'orphan-preset';
    const graph: NodeGraph = {
      ...baseGraph(),
      midiEnvelopePresets: [
        {
          id: presetId,
          trackIds: [],
          envelope: {
            adsr: {
              attackSeconds: 0.02,
              decaySeconds: 0.12,
              sustainLevel: 0.65,
              releaseSeconds: 0.25,
            },
            outMin: 0,
            outMax: 1,
          },
        },
      ],
    };
    const migrated = migrateMidiEnvelopePresetToRemappers(graph);
    expect(migrated.midiEnvelopeRemappers).toHaveLength(1);
    expect(migrated.midiEnvelopeRemappers![0]!.id).toBe(defaultRemapperIdForPreset(presetId));
  });

  it('one preset with two bindings shares one remapper after deserialize', () => {
    const presetId = 'shared-preset';
    const graph: NodeGraph = {
      ...baseGraph(),
      nodes: [
        { id: 'n1', type: 'constant-float', parameters: { value: 0 }, position: { x: 0, y: 0 } },
        { id: 'n2', type: 'constant-float', parameters: { value: 0 }, position: { x: 0, y: 0 } },
      ],
      midiEnvelopePresets: [
        {
          id: presetId,
          trackIds: [],
          envelope: {
            adsr: {
              attackSeconds: 0.02,
              decaySeconds: 0.12,
              sustainLevel: 0.65,
              releaseSeconds: 0.25,
            },
            outMin: 0,
            outMax: 1,
          },
        },
      ],
      midiEnvelopeBindings: [
        { id: 'b1', presetId, nodeId: 'n1', paramName: 'value' },
        { id: 'b2', presetId, nodeId: 'n2', paramName: 'value' },
      ] as LegacyMidiEnvelopeBindingWithPresetId[],
    };

    const result = deserializeGraph(serializeGraph(graph), nodeSpecs);
    expect(result.errors).toHaveLength(0);
    const remapperId = defaultRemapperIdForPreset(presetId);
    expect(result.graph?.midiEnvelopeRemappers).toHaveLength(1);
    expect(result.graph?.midiEnvelopeBindings).toHaveLength(2);
    expect(result.graph?.midiEnvelopeBindings!.every((b) => b.remapperId === remapperId)).toBe(
      true
    );
  });

  it('bindMidiEnvelopePresetToParam shares remapper across two ports', () => {
    let graph = addMidiEnvelopeBinding(baseGraph(), 'n1', 'value');
    const presetId = graph.midiEnvelopePresets![0]!.id;
    graph = bindMidiEnvelopePresetToParam(graph, presetId, 'n2', 'value');
    const remapperId = defaultRemapperIdForPreset(presetId);
    expect(graph.midiEnvelopeBindings!.every((b) => b.remapperId === remapperId)).toBe(true);
    expect(findMidiEnvelopeBindingForParam(graph, 'n2', 'value')?.remapperId).toBe(remapperId);
  });
});
