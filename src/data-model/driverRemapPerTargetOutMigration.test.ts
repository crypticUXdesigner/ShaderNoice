import { describe, expect, it } from 'vitest';
import type { NodeGraph } from './types';
import type { AudioSetup } from './audioSetupTypes';
import { getVirtualNodeId } from './virtualNodes';
import {
  migrateAudioRemapperOutToConnections,
  migrateDriverRemapOutToTargets,
  migrateMidiRemapperOutToBindings,
} from './driverRemapPerTargetOutMigration';
import { deserializeGraph, serializeGraph } from './serialization';
import type { NodeSpecification } from './validation';
import { addMidiEnvelopeBinding, bindMidiEnvelopeRemapperToParam } from './immutableUpdatesMidiEnvelope';
import { defaultRemapperIdForPreset } from './midiEnvelopeRemapperMigration';

const nodeSpecs: NodeSpecification[] = [
  {
    id: 'constant-float',
    inputs: [],
    outputs: [{ name: 'out', type: 'float' }],
    parameters: { value: { type: 'float', default: 0, min: 0, max: 1 } },
  },
];

function baseGraph(overrides: Partial<NodeGraph> = {}): NodeGraph {
  return {
    id: 'graph-1',
    name: 'Test',
    version: '2.0',
    nodes: [
      { id: 'n1', type: 'constant-float', parameters: { value: 0 }, position: { x: 0, y: 0 } },
      { id: 'n2', type: 'constant-float', parameters: { value: 0 }, position: { x: 0, y: 0 } },
    ],
    connections: [],
    ...overrides,
  };
}

describe('driverRemapPerTargetOutMigration', () => {
  it('copies legacy audio remapper Out to each connection and strips remapper Out', () => {
    const remapperId = 'r1';
    const graph = baseGraph({
      connections: [
        {
          id: 'c1',
          sourceNodeId: getVirtualNodeId(`remap-${remapperId}`),
          sourcePort: 'out',
          targetNodeId: 'n1',
          targetParameter: 'value',
        },
        {
          id: 'c2',
          sourceNodeId: getVirtualNodeId(`remap-${remapperId}`),
          sourcePort: 'out',
          targetNodeId: 'n2',
          targetParameter: 'value',
        },
      ],
    });
    const audioSetup: AudioSetup = {
      files: [],
      bands: [{ id: 'b1', name: 'B1', sourceFileId: 'f1', frequencyBands: [[0, 1]], fftSize: 2048 }],
      remappers: [
        {
          id: remapperId,
          name: 'R1',
          bandId: 'b1',
          inMin: 0.2,
          inMax: 0.8,
          outMin: -0.5,
          outMax: 4,
        } as AudioSetup['remappers'][number] & { outMin: number; outMax: number },
      ],
    };

    const migrated = migrateAudioRemapperOutToConnections(graph, audioSetup);
    expect(migrated.graph.connections[0]).toMatchObject({ driverOutMin: -0.5, driverOutMax: 4 });
    expect(migrated.graph.connections[1]).toMatchObject({ driverOutMin: -0.5, driverOutMax: 4 });
    expect(migrated.audioSetup!.remappers[0]).toEqual({
      id: remapperId,
      name: 'R1',
      bandId: 'b1',
      inMin: 0.2,
      inMax: 0.8,
    });
    expect(migrated.audioSetup!.remappers[0]).not.toHaveProperty('outMin');
  });

  it('deserialize round-trips legacy audio remapper Out onto connections', () => {
    const remapperId = 'r1';
    const graph = baseGraph({
      connections: [
        {
          id: 'c1',
          sourceNodeId: getVirtualNodeId(`remap-${remapperId}`),
          sourcePort: 'out',
          targetNodeId: 'n1',
          targetParameter: 'value',
        },
        {
          id: 'c2',
          sourceNodeId: getVirtualNodeId(`remap-${remapperId}`),
          sourcePort: 'out',
          targetNodeId: 'n2',
          targetParameter: 'value',
        },
      ],
    });
    const audioSetup: AudioSetup = {
      files: [],
      bands: [{ id: 'b1', name: 'B1', sourceFileId: 'f1', frequencyBands: [[0, 1]], fftSize: 2048 }],
      remappers: [
        {
          id: remapperId,
          name: 'R1',
          bandId: 'b1',
          inMin: 0.2,
          inMax: 0.8,
          outMin: -0.5,
          outMax: 4,
        } as AudioSetup['remappers'][number] & { outMin: number; outMax: number },
      ],
    };

    const result = deserializeGraph(serializeGraph(graph, false, audioSetup), nodeSpecs);
    expect(result.errors).toHaveLength(0);
    expect(result.graph!.connections[0]).toMatchObject({ driverOutMin: -0.5, driverOutMax: 4 });
    expect(result.graph!.connections[1]).toMatchObject({ driverOutMin: -0.5, driverOutMax: 4 });
    expect(result.audioSetup!.remappers[0]).toEqual({
      id: remapperId,
      name: 'R1',
      bandId: 'b1',
      inMin: 0.2,
      inMax: 0.8,
    });
    expect(result.audioSetup!.remappers[0]).not.toHaveProperty('outMin');
  });

  it('copies legacy MIDI remapper Out to bindings and strips remapper Out', () => {
    const graph = baseGraph({
      midiEnvelopePresets: [
        {
          id: 'preset-1',
          trackIds: [],
          envelope: {
            adsr: { attackSeconds: 0.02, decaySeconds: 0.1, sustainLevel: 0.5, releaseSeconds: 0.2 },
          },
        },
      ],
      midiEnvelopeRemappers: [
        {
          id: 'remap-1',
          envelopePresetId: 'preset-1',
          inMin: 0,
          inMax: 1,
          outMin: 0.1,
          outMax: 0.9,
        } as never,
      ],
      midiEnvelopeBindings: [
        {
          id: 'b1',
          remapperId: 'remap-1',
          nodeId: 'n1',
          paramName: 'value',
          outMin: 0,
          outMax: 1,
        },
        {
          id: 'b2',
          remapperId: 'remap-1',
          nodeId: 'n2',
          paramName: 'value',
          outMin: 0,
          outMax: 1,
        },
      ],
    });

    const migrated = migrateMidiRemapperOutToBindings(graph);
    expect(migrated.midiEnvelopeBindings![0]).toMatchObject({ outMin: 0.1, outMax: 0.9 });
    expect(migrated.midiEnvelopeBindings![1]).toMatchObject({ outMin: 0.1, outMax: 0.9 });
    expect(migrated.midiEnvelopeRemappers![0]).not.toHaveProperty('outMin');
  });

  it('deserialize applies migration for multi-target MIDI preset bindings', () => {
    const presetId = 'preset-shared';
    const graph: NodeGraph = {
      ...baseGraph(),
      midiEnvelopePresets: [
        {
          id: presetId,
          trackIds: [],
          envelope: {
            adsr: { attackSeconds: 0.02, decaySeconds: 0.12, sustainLevel: 0.65, releaseSeconds: 0.25 },
            outMin: 0.2,
            outMax: 0.8,
          } as never,
        },
      ],
      midiEnvelopeBindings: [
        { id: 'b1', presetId, nodeId: 'n1', paramName: 'value' },
        { id: 'b2', presetId, nodeId: 'n2', paramName: 'value' },
      ] as never[],
    };

    const result = deserializeGraph(serializeGraph(graph), nodeSpecs);
    expect(result.errors).toHaveLength(0);
    const bindings = result.graph!.midiEnvelopeBindings!;
    expect(bindings).toHaveLength(2);
    expect(bindings.every((b) => b.outMin === 0.2 && b.outMax === 0.8)).toBe(true);
    expect(result.graph!.midiEnvelopeRemappers![0]).not.toHaveProperty('outMin');
  });

  it('migrateDriverRemapOutToTargets is idempotent', () => {
    let graph = addMidiEnvelopeBinding(baseGraph(), 'n1', 'value', {
      envelope: { adsr: { attackSeconds: 0.01, decaySeconds: 0.05, sustainLevel: 0.8, releaseSeconds: 0.1 }, outMin: 0, outMax: 2 },
    });
    graph = bindMidiEnvelopeRemapperToParam(
      graph,
      defaultRemapperIdForPreset(graph.midiEnvelopePresets![0]!.id),
      'n2',
      'value',
      { outMin: 0.5, outMax: 1.5 }
    );
    const once = migrateDriverRemapOutToTargets(graph, { files: [], bands: [], remappers: [] });
    const twice = migrateDriverRemapOutToTargets(once.graph, once.audioSetup);
    expect(twice).toEqual(once);
  });
});
