import { describe, expect, it } from 'vitest';

import type { NodeGraph } from './types';

import {

  addMidiEnvelopeBinding,

  bindMidiEnvelopeRemapperToParam,

  bindMidiEnvelopePresetToParam,

  connectMidiEnvelopeRemapperToParam,

  connectMidiEnvelopePresetToParam,

  findMidiEnvelopeBindingForParam,

  findMidiEnvelopePreset,

  findMidiEnvelopeRemapper,

  removeMidiEnvelopePreset,

  updateMidiEnvelopePreset,

  updateMidiEnvelopeRemapper,

} from './immutableUpdatesMidiEnvelope';

import { defaultRemapperIdForPreset } from './midiEnvelopeRemapperMigration';

import { migrateLegacyMidiEnvelopeBindings } from './midiEnvelopePresetMigration';

import { serializeGraph, deserializeGraphUnvalidated } from './serialization';

import type { LegacyMidiEnvelopeBinding } from './midiEnvelopeTypes';



function baseGraph(): NodeGraph {

  return {

    id: 'graph-1',

    name: 'Test',

    version: '2.0',

    nodes: [

      { id: 'n1', type: 'constant-float', parameters: { value: 0.5 }, position: { x: 0, y: 0 } },

      { id: 'n2', type: 'constant-float', parameters: { value: 0.25 }, position: { x: 100, y: 0 } },

    ],

    connections: [],

  };

}



describe('MIDI envelope preset sharing', () => {

  it('connects the same preset to two parameters without cloning ADSR', () => {

    let graph = addMidiEnvelopeBinding(baseGraph(), 'n1', 'value', {

      trackIds: ['track-a'],

      envelope: {

        adsr: { attackSeconds: 0.05, decaySeconds: 0.1, sustainLevel: 0.7, releaseSeconds: 0.3 },

        outMin: 0.1,

        outMax: 0.9,

      },

    });

    const presetId = graph.midiEnvelopePresets![0]!.id;

    const remapperId = defaultRemapperIdForPreset(presetId);



    graph = connectMidiEnvelopeRemapperToParam(graph, remapperId, 'n2', 'value');



    expect(graph.midiEnvelopePresets).toHaveLength(1);

    expect(graph.midiEnvelopeBindings).toHaveLength(2);

    expect(graph.midiEnvelopeBindings!.every((b) => b.remapperId === remapperId)).toBe(true);



    const bindingA = findMidiEnvelopeBindingForParam(graph, 'n1', 'value');

    const bindingB = findMidiEnvelopeBindingForParam(graph, 'n2', 'value');

    expect(bindingA?.id).not.toBe(bindingB?.id);

    expect(findMidiEnvelopeRemapper(graph, remapperId)?.outMax).toBe(0.9);

  });



  it('updates preset ADSR for all bindings using it', () => {

    let graph = addMidiEnvelopeBinding(baseGraph(), 'n1', 'value', { trackIds: ['track-a'] });

    const presetId = graph.midiEnvelopePresets![0]!.id;

    const remapperId = defaultRemapperIdForPreset(presetId);

    graph = bindMidiEnvelopeRemapperToParam(graph, remapperId, 'n2', 'value');



    graph = updateMidiEnvelopePreset(graph, presetId, {

      envelope: {

        adsr: { attackSeconds: 0.5, decaySeconds: 0.2, sustainLevel: 0.4, releaseSeconds: 0.6 },

      },

    });

    graph = updateMidiEnvelopeRemapper(graph, remapperId, { outMin: 0, outMax: 2 });



    const preset = findMidiEnvelopePreset(graph, presetId);

    expect(preset?.envelope.adsr.attackSeconds).toBe(0.5);

    expect(findMidiEnvelopeRemapper(graph, remapperId)?.outMax).toBe(2);

    expect(graph.midiEnvelopeBindings).toHaveLength(2);

  });



  it('delete preset removes all bindings and remappers', () => {

    let graph = addMidiEnvelopeBinding(baseGraph(), 'n1', 'value');

    const presetId = graph.midiEnvelopePresets![0]!.id;

    graph = bindMidiEnvelopeRemapperToParam(graph, defaultRemapperIdForPreset(presetId), 'n2', 'value');



    graph = removeMidiEnvelopePreset(graph, presetId);



    expect(graph.midiEnvelopePresets).toBeUndefined();

    expect(graph.midiEnvelopeRemappers).toBeUndefined();

    expect(graph.midiEnvelopeBindings).toBeUndefined();

    expect(findMidiEnvelopeBindingForParam(graph, 'n1', 'value')).toBeUndefined();

    expect(findMidiEnvelopeBindingForParam(graph, 'n2', 'value')).toBeUndefined();

  });



  it('migrates legacy inline bindings to preset + binding (idempotent)', () => {

    const legacy: LegacyMidiEnvelopeBinding = {

      id: 'legacy-bind',

      nodeId: 'n1',

      paramName: 'value',

      trackIds: ['track-a'],

      envelope: {

        adsr: { attackSeconds: 0.01, decaySeconds: 0.05, sustainLevel: 0.8, releaseSeconds: 0.1 },

        outMin: 0.2,

        outMax: 0.9,

      },

    };

    const legacyGraph: NodeGraph = {

      ...baseGraph(),

      midiEnvelopeBindings: [legacy],

    };



    const migrated = migrateLegacyMidiEnvelopeBindings(legacyGraph);

    expect(migrated.midiEnvelopePresets).toHaveLength(1);

    expect(migrated.midiEnvelopePresets![0]!.id).toBe('legacy-bind');

    expect((migrated.midiEnvelopePresets![0]!.envelope as { outMin?: number }).outMin).toBe(0.2);

    expect(migrated.midiEnvelopeBindings).toHaveLength(1);

    expect((migrated.midiEnvelopeBindings![0] as { presetId?: string }).presetId).toBe('legacy-bind');

    expect(migrated.midiEnvelopeBindings![0]!.nodeId).toBe('n1');



    const again = migrateLegacyMidiEnvelopeBindings(migrated);

    expect(again.midiEnvelopePresets).toEqual(migrated.midiEnvelopePresets);

    expect(again.midiEnvelopeBindings).toEqual(migrated.midiEnvelopeBindings);

  });



  it('round-trips presets, remappers, and bindings through serialization', () => {

    let graph = addMidiEnvelopeBinding(baseGraph(), 'n1', 'value', { trackIds: ['track-a'] });

    const presetId = graph.midiEnvelopePresets![0]!.id;

    const remapperId = defaultRemapperIdForPreset(presetId);

    graph = bindMidiEnvelopeRemapperToParam(graph, remapperId, 'n2', 'value');



    const result = deserializeGraphUnvalidated(serializeGraph(graph));

    expect(result.errors).toHaveLength(0);

    expect(result.graph?.midiEnvelopePresets).toHaveLength(1);

    expect(result.graph?.midiEnvelopeRemappers).toHaveLength(1);

    expect(result.graph?.midiEnvelopeBindings).toHaveLength(2);

    expect(result.graph!.midiEnvelopeBindings!.every((b) => b.remapperId === remapperId)).toBe(

      true

    );

  });

});

