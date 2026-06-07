/**

 * Migrate MIDI envelope output range from presets to graph remappers + binding targets.

 * Bindings reference `remapperId` instead of `presetId`.

 *

 * Idempotent: default remapper id is `remapper-{presetId}` (mirror `band-{bandId}` audio migration).

 * Output range lives on bindings after driver-remap-per-target-out-v1.

 */



import type { NodeGraph } from './types';

import type {

  MidiEnvelopeBinding,

  MidiEnvelopePreset,

  MidiEnvelopeRemapper,

} from './midiEnvelopeTypes';

import {

  DEFAULT_MIDI_ENVELOPE_REMAPPER_INPUT,

  DEFAULT_MIDI_ENVELOPE_REMAPPER_OUTPUT,

  isLegacyPresetIdMidiEnvelopeBinding,

} from './midiEnvelopeTypes';



/** v1 driver-remap unify: missing `inMin`/`inMax` on load → 0, 1 (backward compatible). */



type PresetEnvelopeWithLegacyRange = MidiEnvelopePreset['envelope'] & {

  outMin?: number;

  outMax?: number;

};



type LegacyMidiRemapper = MidiEnvelopeRemapper & { outMin?: number; outMax?: number };



export function defaultRemapperIdForPreset(presetId: string): string {

  return `remapper-${presetId}`;

}



function extractPresetOutputRange(preset: MidiEnvelopePreset): { outMin: number; outMax: number } {

  const env = preset.envelope as PresetEnvelopeWithLegacyRange;

  const outMin =

    typeof env.outMin === 'number' && Number.isFinite(env.outMin)

      ? env.outMin

      : DEFAULT_MIDI_ENVELOPE_REMAPPER_OUTPUT.outMin;

  const outMax =

    typeof env.outMax === 'number' && Number.isFinite(env.outMax)

      ? env.outMax

      : DEFAULT_MIDI_ENVELOPE_REMAPPER_OUTPUT.outMax;

  return { outMin, outMax };

}



function stripPresetOutputRange(preset: MidiEnvelopePreset): MidiEnvelopePreset {

  const env = preset.envelope as PresetEnvelopeWithLegacyRange;

  const { adsr, velocityToPeak } = env;

  return {

    ...preset,

    envelope: {

      adsr: { ...adsr },

      ...(velocityToPeak === false ? { velocityToPeak: false } : {}),

    },

  };

}



function createDefaultRemapper(presetId: string): MidiEnvelopeRemapper {

  return {

    id: defaultRemapperIdForPreset(presetId),

    envelopePresetId: presetId,

    inMin: DEFAULT_MIDI_ENVELOPE_REMAPPER_INPUT.inMin,

    inMax: DEFAULT_MIDI_ENVELOPE_REMAPPER_INPUT.inMax,

  };

}



function ensureDefaultRemapperForPreset(

  remappers: LegacyMidiRemapper[],

  remapperIds: Set<string>,

  presetId: string

): void {

  const remapperId = defaultRemapperIdForPreset(presetId);

  if (remapperIds.has(remapperId)) return;

  remappers.push(createDefaultRemapper(presetId));

  remapperIds.add(remapperId);

}



function bindingOutFromPresetOrRemapper(

  preset: MidiEnvelopePreset | undefined,

  remapper: LegacyMidiRemapper | undefined

): { outMin: number; outMax: number } {

  if (preset) return extractPresetOutputRange(preset);

  if (remapper && (typeof remapper.outMin === 'number' || typeof remapper.outMax === 'number')) {

    return {

      outMin:

        typeof remapper.outMin === 'number' && Number.isFinite(remapper.outMin)

          ? remapper.outMin

          : DEFAULT_MIDI_ENVELOPE_REMAPPER_OUTPUT.outMin,

      outMax:

        typeof remapper.outMax === 'number' && Number.isFinite(remapper.outMax)

          ? remapper.outMax

          : DEFAULT_MIDI_ENVELOPE_REMAPPER_OUTPUT.outMax,

    };

  }

  return { ...DEFAULT_MIDI_ENVELOPE_REMAPPER_OUTPUT };

}



/**

 * Migrate preset-level `outMin`/`outMax` to bindings and rewrite legacy presetId bindings.

 * Safe to run on every load after {@link migrateLegacyMidiEnvelopeBindings}.

 */

export function migrateMidiEnvelopePresetToRemappers(graph: NodeGraph): NodeGraph {

  const presets = graph.midiEnvelopePresets ?? [];

  const bindings = graph.midiEnvelopeBindings ?? [];



  if (!presets.length && !bindings.length) {

    return graph;

  }



  const hasLegacyPresetBindings = bindings.some(isLegacyPresetIdMidiEnvelopeBinding);

  const existingRemappers = (graph.midiEnvelopeRemappers ?? []) as LegacyMidiRemapper[];



  if (

    !hasLegacyPresetBindings &&

    bindings.every(

      (b): b is MidiEnvelopeBinding =>

        typeof (b as MidiEnvelopeBinding).remapperId === 'string' &&

        typeof (b as MidiEnvelopeBinding).outMin === 'number' &&

        typeof (b as MidiEnvelopeBinding).outMax === 'number'

    )

  ) {

    const strippedPresets = presets.map(stripPresetOutputRange);

    const hasLegacyRangeOnPreset = presets.some((p) => {

      const env = p.envelope as PresetEnvelopeWithLegacyRange;

      return typeof env.outMin === 'number' || typeof env.outMax === 'number';

    });

    const hasLegacyOutOnRemapper = existingRemappers.some(

      (r) => typeof r.outMin === 'number' || typeof r.outMax === 'number'

    );

    if (!hasLegacyRangeOnPreset && !hasLegacyOutOnRemapper && existingRemappers.length >= presets.length) {

      return {

        ...graph,

        midiEnvelopePresets: strippedPresets.length > 0 ? strippedPresets : undefined,

      };

    }

  }



  const nextRemappers: LegacyMidiRemapper[] = [...existingRemappers];

  const remapperIds = new Set(nextRemappers.map((r) => r.id));



  for (const preset of presets) {

    ensureDefaultRemapperForPreset(nextRemappers, remapperIds, preset.id);

  }



  const remapperById = new Map(nextRemappers.map((r) => [r.id, r]));

  const presetById = new Map(presets.map((p) => [p.id, p]));



  const nextBindings: MidiEnvelopeBinding[] = [];

  for (const raw of bindings) {

    if (isLegacyPresetIdMidiEnvelopeBinding(raw)) {

      const remapperId = defaultRemapperIdForPreset(raw.presetId);

      const preset = presetById.get(raw.presetId);

      if (preset) {

        ensureDefaultRemapperForPreset(nextRemappers, remapperIds, preset.id);

      } else if (!remapperIds.has(remapperId)) {

        nextRemappers.push(createDefaultRemapper(raw.presetId));

        remapperIds.add(remapperId);

      }

      const out = bindingOutFromPresetOrRemapper(preset, remapperById.get(remapperId));

      nextBindings.push({

        id: raw.id,

        remapperId,

        nodeId: raw.nodeId,

        paramName: raw.paramName,

        outMin: out.outMin,

        outMax: out.outMax,

        ...(raw.disabled === true ? { disabled: true } : {}),

      });

    } else {

      const binding = raw as MidiEnvelopeBinding;

      const remapper = remapperById.get(binding.remapperId);

      const preset = remapper ? presetById.get(remapper.envelopePresetId) : undefined;

      const out =

        typeof binding.outMin === 'number' &&

        Number.isFinite(binding.outMin) &&

        typeof binding.outMax === 'number' &&

        Number.isFinite(binding.outMax)

          ? { outMin: binding.outMin, outMax: binding.outMax }

          : bindingOutFromPresetOrRemapper(preset, remapper);

      nextBindings.push({

        ...binding,

        outMin: out.outMin,

        outMax: out.outMax,

      });

    }

  }



  const strippedPresets = presets.map(stripPresetOutputRange);

  const strippedRemappers = nextRemappers.map(({ outMin: _oMin, outMax: _oMax, ...rest }) => rest);



  return {

    ...graph,

    midiEnvelopePresets: strippedPresets.length > 0 ? strippedPresets : undefined,

    midiEnvelopeRemappers: strippedRemappers.length > 0 ? strippedRemappers : undefined,

    midiEnvelopeBindings: nextBindings.length > 0 ? nextBindings : undefined,

  };

}

