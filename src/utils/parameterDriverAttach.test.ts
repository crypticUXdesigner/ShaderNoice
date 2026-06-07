import { describe, expect, it } from 'vitest';

import type { NodeGraph } from '../data-model/types';

import type { AudioSetup } from '../data-model/audioSetupTypes';

import {

  applyAudioDriverVirtualWireAttachEffects,

  applyMidiRemapperConnectDefaults,

  detachAnimationDriverForParam,

  detachAudioDriverForParam,

  prepareGraphForAnimationDriverAttach,

  prepareGraphForAudioDriverAttach,

  findAudioDriverConnection,

  findAutomationLaneForParam,

} from './parameterDriverAttach';

import type { ParameterSpec } from '../types/nodeSpec';

import {

  addMidiEnvelopeBinding,

  bindMidiEnvelopeRemapperToParam,

  connectMidiEnvelopeRemapperToParam,

} from '../data-model/immutableUpdatesMidiEnvelope';

import { getVirtualNodeId } from './virtualNodes';

import { defaultRemapperIdForPreset } from '../data-model/midiEnvelopeRemapperMigration';



const emptyAudioSetup: AudioSetup = { files: [], bands: [], remappers: [] };



function baseGraph(overrides: Partial<NodeGraph> = {}): NodeGraph {

  return {

    id: 'graph-test',

    name: 'Test',

    version: '2.0',

    nodes: [
      { id: 'n1', type: 'test', parameters: {}, position: { x: 0, y: 0 } },
      { id: 'n2', type: 'test', parameters: {}, position: { x: 0, y: 0 } },
    ],

    connections: [],

    viewState: { zoom: 1, panX: 0, panY: 0, selectedNodeIds: [] },

    ...overrides,

  };

}



const evaluableLane = {

  id: 'lane-1',

  nodeId: 'n1',

  paramName: 'amount',

  regions: [

    {

      id: 'region-1',

      startTime: 0,

      duration: 10,

      loop: false,

      curve: { keyframes: [{ time: 0, value: 0 }, { time: 1, value: 1 }] },

    },

  ],

};



describe('parameterDriverAttach', () => {

  it('findAudioDriverConnection returns virtual-node wire only', () => {

    const virtualNodeId = getVirtualNodeId('remap-r1');

    const graph = baseGraph({

      connections: [

        {

          id: 'c-audio',

          sourceNodeId: virtualNodeId,

          sourcePort: 'out',

          targetNodeId: 'n1',

          targetParameter: 'amount',

        },

        {

          id: 'c-graph',

          sourceNodeId: 'src',

          sourcePort: 'out',

          targetNodeId: 'n1',

          targetParameter: 'other',

        },

      ],

    });

    expect(findAudioDriverConnection(graph, 'n1', 'amount')?.id).toBe('c-audio');

    expect(findAudioDriverConnection(graph, 'n1', 'other')).toBeUndefined();

  });



  it('prepareGraphForAudioDriverAttach removes automation lane for param', () => {

    const graph = baseGraph({

      automation: { bpm: 120, durationSeconds: 10, lanes: [evaluableLane] },

    });

    expect(findAutomationLaneForParam(graph, 'n1', 'amount')).toBeDefined();

    const next = prepareGraphForAudioDriverAttach(graph, 'n1', 'amount');

    expect(findAutomationLaneForParam(next, 'n1', 'amount')).toBeUndefined();

    expect(next.automation?.lanes).toHaveLength(0);

  });



  it('prepareGraphForAudioDriverAttach unbinds MIDI envelope for param', () => {

    const graph = addMidiEnvelopeBinding(baseGraph(), 'n1', 'amount');

    const next = prepareGraphForAudioDriverAttach(graph, 'n1', 'amount');

    expect(next.midiEnvelopePresets).toHaveLength(1);

    expect(next.midiEnvelopeBindings).toBeUndefined();

  });



  it('prepareGraphForAnimationDriverAttach removes audio driver only', () => {

    const virtualNodeId = getVirtualNodeId('remap-r1');

    const graph = baseGraph({

      connections: [

        {

          id: 'c-audio',

          sourceNodeId: virtualNodeId,

          sourcePort: 'out',

          targetNodeId: 'n1',

          targetParameter: 'amount',

        },

        {

          id: 'c-graph',

          sourceNodeId: 'src',

          sourcePort: 'out',

          targetNodeId: 'n1',

          targetParameter: 'amount',

        },

      ],

    });

    const next = prepareGraphForAnimationDriverAttach(graph, 'n1', 'amount');

    expect(findAudioDriverConnection(next, 'n1', 'amount')).toBeUndefined();

    expect(next.connections.some((c) => c.id === 'c-graph')).toBe(true);

  });



  it('applyAudioDriverVirtualWireAttachEffects always sets override even when mode was multiply', () => {

    const virtualNodeId = getVirtualNodeId('remap-r1');

    const graph = baseGraph({

      nodes: [

        {

          id: 'n1',

          type: 'test',

          parameters: { amount: 0.5 },

          position: { x: 0, y: 0 },

          parameterInputModes: { amount: 'multiply' },

        },

      ],

      connections: [

        {

          id: 'c1',

          sourceNodeId: virtualNodeId,

          sourcePort: 'out',

          targetNodeId: 'n1',

          targetParameter: 'amount',

        },

      ],

    });

    const { graph: g2 } = applyAudioDriverVirtualWireAttachEffects(

      graph,

      emptyAudioSetup,

      virtualNodeId,

      'n1',

      'amount',

      undefined

    );

    expect(g2.nodes[0].parameterInputModes?.amount).toBe('override');

  });



  it('applyAudioDriverVirtualWireAttachEffects sets connection Out from param spec without clobbering remapper gate', () => {

    const virtualNodeId = getVirtualNodeId('remap-r1');

    const graph = baseGraph({

      nodes: [

        {

          id: 'n1',

          type: 'test',

          parameters: { amount: 0.5 },

          position: { x: 0, y: 0 },

        },

        {

          id: 'n2',

          type: 'test',

          parameters: { strength: 0.5 },

          position: { x: 0, y: 0 },

        },

      ],

      connections: [

        {

          id: 'c-first',

          sourceNodeId: virtualNodeId,

          sourcePort: 'out',

          targetNodeId: 'n1',

          targetParameter: 'amount',

          driverOutMin: -0.5,

          driverOutMax: 4,

        },

        {

          id: 'c-second',

          sourceNodeId: virtualNodeId,

          sourcePort: 'out',

          targetNodeId: 'n2',

          targetParameter: 'strength',

        },

      ],

    });

    const audioSetup: AudioSetup = {

      files: [],

      bands: [],

      remappers: [

        {

          id: 'r1',

          name: 'R1',

          bandId: 'b1',

          inMin: 0.2,

          inMax: 0.8,

        },

      ],

    };

    const spec = { type: 'float', default: 0, min: 0, max: 1.6 } as ParameterSpec;

    const { graph: g2, audioSetup: a2 } = applyAudioDriverVirtualWireAttachEffects(

      graph,

      audioSetup,

      virtualNodeId,

      'n2',

      'strength',

      spec

    );

    expect(g2.connections.find((c) => c.id === 'c-first')).toMatchObject({

      driverOutMin: -0.5,

      driverOutMax: 4,

    });

    expect(g2.connections.find((c) => c.id === 'c-second')).toMatchObject({

      driverOutMin: 0,

      driverOutMax: 1.6,

    });

    expect(a2.remappers[0]).toMatchObject({ inMin: 0.2, inMax: 0.8 });

    expect(a2.remappers[0]).not.toHaveProperty('outMin');

  });



  it('second MIDI connect preserves peer binding Out and remapper gate', () => {

    let graph = addMidiEnvelopeBinding(baseGraph(), 'n1', 'amount', {

      envelope: {

        adsr: { attackSeconds: 0.01, decaySeconds: 0.05, sustainLevel: 0.8, releaseSeconds: 0.1 },

        outMin: -0.5,

        outMax: 4,

      },

    });

    const presetId = graph.midiEnvelopePresets![0]!.id;

    const remapperId = defaultRemapperIdForPreset(presetId);

    graph = updateRemapperGate(graph, remapperId);

    graph = connectMidiEnvelopeRemapperToParam(graph, remapperId, 'n2', 'other', {

      outMin: 0,

      outMax: 1.6,

    });

    const remapper = graph.midiEnvelopeRemappers!.find((r) => r.id === remapperId)!;

    expect(remapper).toMatchObject({ inMin: 0.15, inMax: 0.85 });

    expect(graph.midiEnvelopeBindings!.find((b) => b.nodeId === 'n1')!).toMatchObject({

      outMin: -0.5,

      outMax: 4,

    });

    expect(graph.midiEnvelopeBindings!.find((b) => b.nodeId === 'n2')!).toMatchObject({

      outMin: 0,

      outMax: 1.6,

    });

  });



  it('applyMidiRemapperConnectDefaults updates binding Out only', () => {

    let graph = addMidiEnvelopeBinding(baseGraph(), 'n1', 'amount');

    const remapperId = graph.midiEnvelopeBindings![0]!.remapperId;

    const spec = { type: 'float', default: 0, min: 0, max: 2 } as ParameterSpec;

    graph = applyMidiRemapperConnectDefaults(graph, remapperId, 'n1', 'amount', spec);

    expect(graph.midiEnvelopeBindings![0]).toMatchObject({ outMin: 0, outMax: 2 });

  });



  it('detach helpers are no-ops when nothing to remove', () => {

    const graph = baseGraph();

    expect(detachAnimationDriverForParam(graph, 'n1', 'amount')).toBe(graph);

    expect(detachAudioDriverForParam(graph, 'n1', 'amount')).toBe(graph);

  });

});



function updateRemapperGate(graph: NodeGraph, remapperId: string): NodeGraph {

  const remappers = graph.midiEnvelopeRemappers ?? [];

  return {

    ...graph,

    midiEnvelopeRemappers: remappers.map((r) =>

      r.id === remapperId ? { ...r, inMin: 0.15, inMax: 0.85 } : r

    ),

  };

}

