/**

 * Signal bridge for MIDI envelope driver evaluation (JS-side, like automationSignals).

 */



import type { NodeGraph, NodeInstance } from '../data-model/types';

import type { ArrangementSnapshot } from '../audiotool/arrangement/types';

import { findMidiEnvelopeBindingForParam } from '../data-model/immutableUpdatesMidiEnvelope';

import {

  getMidiEnvelopeFrameValue,

  syncMidiEnvelopeFrame,

} from './midiEnvelopeFrameCache';



export interface EvaluatedMidiEnvelopeSignal {

  value: number | null;

}



export function evaluateMidiEnvelopeSignalForParam(

  node: NodeInstance,

  paramName: string,

  graph: NodeGraph,

  transportTime: number,

  snapshot: ArrangementSnapshot | undefined

): EvaluatedMidiEnvelopeSignal {

  const binding = findMidiEnvelopeBindingForParam(graph, node.id, paramName);

  if (!binding || binding.disabled || !snapshot) {

    return { value: null };

  }

  syncMidiEnvelopeFrame(graph, snapshot, transportTime);

  return { value: getMidiEnvelopeFrameValue(node.id, paramName) ?? null };

}

