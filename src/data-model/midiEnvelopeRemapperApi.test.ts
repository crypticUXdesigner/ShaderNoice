import { describe, expect, it } from 'vitest';

import type { NodeGraph } from './types';

import {

  addMidiEnvelopeBinding,

  addMidiEnvelopeRemapper,

  connectMidiEnvelopeRemapperToParam,

  duplicateMidiEnvelopeRemapper,

  findMidiEnvelopeBindingForParam,

  findMidiEnvelopePreset,

  findMidiEnvelopeRemapper,

  removeMidiEnvelopeRemapper,

  resolveMidiEnvelopeBinding,

  updateMidiEnvelopeBindingOut,

  updateMidiEnvelopeRemapper,

} from './immutableUpdatesMidiEnvelope';

import { defaultRemapperIdForPreset } from './midiEnvelopeRemapperMigration';

import { validateMidiEnvelopePresetsAndBindings } from './validation';

import type { NodeSpecification } from './validationTypes';



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



const nodeSpecs: NodeSpecification[] = [

  {

    id: 'constant-float',

    displayName: 'Constant',

    category: 'input',

    parameters: { value: { type: 'float', label: 'Value', default: 0 } },

  },

];



describe('MIDI envelope remapper API', () => {

  it('connects the same remapper to two parameters', () => {

    let graph = addMidiEnvelopeBinding(baseGraph(), 'n1', 'value', {

      envelope: { adsr: { attackSeconds: 0.02, decaySeconds: 0.1, sustainLevel: 0.5, releaseSeconds: 0.2 }, outMin: 0, outMax: 5 },

    });

    const presetId = graph.midiEnvelopePresets![0]!.id;

    const remapperId = defaultRemapperIdForPreset(presetId);



    graph = connectMidiEnvelopeRemapperToParam(graph, remapperId, 'n2', 'value');



    expect(graph.midiEnvelopeBindings).toHaveLength(2);

    expect(graph.midiEnvelopeBindings!.every((b) => b.remapperId === remapperId)).toBe(true);

    expect(findMidiEnvelopeBindingForParam(graph, 'n2', 'value')?.remapperId).toBe(remapperId);

  });



  it('update binding Out affects only that binding; gate stays on remapper', () => {

    let graph = addMidiEnvelopeBinding(baseGraph(), 'n1', 'value');

    const remapperId = defaultRemapperIdForPreset(graph.midiEnvelopePresets![0]!.id);

    graph = connectMidiEnvelopeRemapperToParam(graph, remapperId, 'n2', 'value');



    const bindingB = findMidiEnvelopeBindingForParam(graph, 'n2', 'value')!;

    graph = updateMidiEnvelopeBindingOut(graph, bindingB.id, { outMin: -1, outMax: 3 });



    const bindingA = findMidiEnvelopeBindingForParam(graph, 'n1', 'value')!;

    expect(resolveMidiEnvelopeBinding(graph, bindingA)?.envelope.outMax).toBe(1);

    expect(resolveMidiEnvelopeBinding(graph, bindingB)?.envelope.outMax).toBe(3);

    expect(resolveMidiEnvelopeBinding(graph, bindingB)?.envelope.outMin).toBe(-1);

    expect(findMidiEnvelopeRemapper(graph, remapperId)).not.toHaveProperty('outMax');

  });



  it('removeMidiEnvelopeRemapper disconnects all targets', () => {

    let graph = addMidiEnvelopeBinding(baseGraph(), 'n1', 'value');

    const remapperId = defaultRemapperIdForPreset(graph.midiEnvelopePresets![0]!.id);

    graph = connectMidiEnvelopeRemapperToParam(graph, remapperId, 'n2', 'value');



    graph = removeMidiEnvelopeRemapper(graph, remapperId);



    expect(graph.midiEnvelopeRemappers).toBeUndefined();

    expect(graph.midiEnvelopeBindings).toBeUndefined();

    expect(findMidiEnvelopeBindingForParam(graph, 'n1', 'value')).toBeUndefined();

    expect(findMidiEnvelopePreset(graph, graph.midiEnvelopePresets![0]!.id)).toBeDefined();

  });



  it('duplicateMidiEnvelopeRemapper copies gate with a new id', () => {

    let graph = addMidiEnvelopeBinding(baseGraph(), 'n1', 'value', {

      envelope: { adsr: { attackSeconds: 0.02, decaySeconds: 0.1, sustainLevel: 0.5, releaseSeconds: 0.2 }, outMin: 0, outMax: 2 },

    });

    const remapperId = defaultRemapperIdForPreset(graph.midiEnvelopePresets![0]!.id);

    graph = updateMidiEnvelopeRemapper(graph, remapperId, { name: 'Main', inMin: 0.2, inMax: 0.8 });



    graph = duplicateMidiEnvelopeRemapper(graph, remapperId, { newId: 'remap-copy' });



    expect(graph.midiEnvelopeRemappers).toHaveLength(2);

    const copy = findMidiEnvelopeRemapper(graph, 'remap-copy');

    expect(copy?.inMin).toBe(0.2);

    expect(copy?.inMax).toBe(0.8);

    expect(copy).not.toHaveProperty('outMax');

    expect(copy?.name).toBe('Main 2');

    expect(copy?.envelopePresetId).toBe(graph.midiEnvelopePresets![0]!.id);

  });



  it('addMidiEnvelopeRemapper without bindings warns on validate', () => {

    let graph = addMidiEnvelopeBinding(baseGraph(), 'n1', 'value');

    const presetId = graph.midiEnvelopePresets![0]!.id;

    graph = addMidiEnvelopeRemapper(graph, presetId, {

      id: 'orphan-remap',

      inMin: 0,

      inMax: 1,

    });



    const warnings: string[] = [];

    validateMidiEnvelopePresetsAndBindings(graph, nodeSpecs, warnings);

    expect(warnings.some((w) => w.includes('orphan-remap') && w.includes('no parameter bindings'))).toBe(

      true

    );

  });

});

