import type { NodeSpec } from '../../types/nodeSpec';
import { MAX_PATTERN_ONSET_LOOP } from '../arrangement/pattern/constants';

/**
 * Abstract MIDI onset ripples from `audioSetup.arrangementSnapshot` (compile-time bake).
 * Placeholders `{{ARRANGEMENT_PATTERN_NOTE_BAKE}}`, `{{NODE_SUFFIX}}` replaced per instance.
 */
export const noteRippleFieldNodeSpec: NodeSpec = {
  id: 'note-ripple-field',
  category: 'MIDI',
  displayName: 'Note Ripple Field',
  description:
    'Recent note onsets launch expanding circular ripples from pitch-derived UV positions; velocity scales intensity. Requires an imported arrangement snapshot.',
  icon: 'wave-sine',
  inputs: [
    {
      name: 'in',
      type: 'vec2',
      label: 'UV',
    },
    {
      name: 'time',
      type: 'float',
      label: 'Time',
      fallbackExpression: 'uTimelineTime',
    },
  ],
  outputs: [
    {
      name: 'out',
      type: 'float',
      label: 'Value',
    },
    {
      name: 'energy',
      type: 'float',
      label: 'Energy',
    },
  ],
  parameters: {
    windowSeconds: {
      type: 'float',
      default: 2.0,
      min: 0.1,
      max: 8.0,
      step: 0.05,
      label: 'Window',
    },
    speed: {
      type: 'float',
      default: 0.35,
      min: 0.01,
      max: 2.0,
      step: 0.01,
      label: 'Speed',
    },
    width: {
      type: 'float',
      default: 0.025,
      min: 0.001,
      max: 0.2,
      step: 0.001,
      label: 'Width',
    },
    feather: {
      type: 'float',
      default: 0.015,
      min: 0.0,
      max: 0.1,
      step: 0.001,
      label: 'Feather',
    },
    pitchSpread: {
      type: 'float',
      default: 0.42,
      min: 0.0,
      max: 1.0,
      step: 0.01,
      label: 'Spread',
    },
    centerX: {
      type: 'float',
      default: 0.5,
      min: 0.0,
      max: 1.0,
      step: 0.01,
      label: 'Center X',
    },
    centerY: {
      type: 'float',
      default: 0.5,
      min: 0.0,
      max: 1.0,
      step: 0.01,
      label: 'Center Y',
    },
    trackFilterMode: {
      type: 'int',
      default: 1,
      min: 0,
      max: 1,
      step: 1,
      label: 'Tracks',
    },
    trackFilterList: {
      type: 'string',
      default: '',
      label: 'Track ids',
    },
    onsetLoopStart: {
      type: 'int',
      default: 0,
      min: 0,
      max: 2048,
      step: 1,
      label: 'Loop start',
    },
    onsetLoopEnd: {
      type: 'int',
      default: 0,
      min: 0,
      max: 2048,
      step: 1,
      label: 'Loop end',
    },
  },
  parameterGroups: [
    {
      id: 'note-ripple-tracks',
      label: 'Tracks',
      parameters: [],
      collapsible: true,
      defaultCollapsed: false,
    },
    {
      id: 'note-ripple-motion',
      label: 'Motion',
      parameters: ['windowSeconds', 'speed', 'width', 'feather', 'pitchSpread'],
      collapsible: true,
      defaultCollapsed: false,
    },
    {
      id: 'note-ripple-center',
      label: 'Center',
      parameters: ['centerX', 'centerY'],
      collapsible: true,
      defaultCollapsed: false,
    },
  ],
  parameterLayout: {
    elements: [
      {
        type: 'arrangement-track-filter',
        label: 'Tracks',
        trackKinds: ['note'],
        hideEmpty: true,
        showNoteCounts: true,
      },
      {
        type: 'grid',
        label: 'Motion',
        parameters: ['windowSeconds', 'speed', 'width', 'feather', 'pitchSpread'],
        layout: { columns: 'auto' },
      },
      {
        type: 'grid',
        label: 'Center',
        parameters: ['centerX', 'centerY'],
        parameterUI: { centerX: 'coords', centerY: 'coords' },
        layout: { columns: 2, coordsSpan: 2 },
      },
    ],
    parametersWithoutPorts: [
      'trackFilterMode',
      'trackFilterList',
      'onsetLoopStart',
      'onsetLoopEnd',
    ],
    minColumns: 3,
  },
  functions: `
struct NoteRippleFieldResult {
  float mask;
  float energy;
};

{{ARRANGEMENT_PATTERN_NOTE_BAKE}}

/** Map **UV Coords** p (center 0, aspect-correct X) to 0–1 UV for pattern sampling. */
vec2 noteRippleFieldUvFromP(vec2 p) {
  float aspect = uResolution.x / uResolution.y;
  return vec2(p.x / (2.0 * aspect) + 0.5, p.y * 0.5 + 0.5);
}

float noteRippleFieldPitchNorm(float pitch) {
  return arrPatternSaturate((pitch - 36.0) / 84.0);
}

float noteRippleFieldRing(vec2 uv, vec2 origin, float waveR, float width, float feather) {
  float dist = length(uv - origin);
  float dBand = abs(dist - waveR);
  float halfW = max(0.0001, width * 0.5);
  float feat = max(1e-5, feather);
  return 1.0 - smoothstep(halfW, halfW + feat, dBand);
}

NoteRippleFieldResult evalNoteRippleField(
  vec2 uv,
  float timelineTime,
  float windowSeconds,
  float speed,
  float width,
  float feather,
  float pitchSpread,
  vec2 center,
  int onsetLoopStart,
  int onsetLoopEnd
) {
  float mask = 0.0;
  float energy = 0.0;
  float windowStart = timelineTime - windowSeconds;
  int loopStart = max(onsetLoopStart, 0);
  int loopEnd = min(onsetLoopEnd, ARR_PATTERN_ONSET_COUNT_{{NODE_SUFFIX}});

  for (int i = loopStart; i < loopEnd; i++) {
    if (i - loopStart >= ${MAX_PATTERN_ONSET_LOOP}) break;
    vec4 onset = ARR_PATTERN_ONSETS_{{NODE_SUFFIX}}[i];
    float startT = onset.x;
    float pitch = onset.z;
    float velocity = onset.w;

    if (startT > timelineTime || startT < windowStart) continue;

    float age = timelineTime - startT;
    if (age < 0.0 || age > windowSeconds) continue;

    float angle = arrPatternPitchToAngle(pitch);
    float pitchNorm = noteRippleFieldPitchNorm(pitch);
    float radius = pitchNorm * pitchSpread * 0.48;
    vec2 origin = center + radius * vec2(cos(angle), sin(angle));

    float waveR = age * speed;
    float ring = noteRippleFieldRing(uv, origin, waveR, width, feather);
    float decay = exp(-age / max(windowSeconds, 0.001));
    float contrib = ring * decay * velocity;

    mask = max(mask, contrib);
    energy = min(1.0, energy + contrib);
  }

  return NoteRippleFieldResult(mask, energy);
}
`,
  mainCode: `
  vec2 rippleUv = noteRippleFieldUvFromP($input.in);
  vec2 rippleCenter = vec2($param.centerX, $param.centerY);
  NoteRippleFieldResult ripple = evalNoteRippleField(
    rippleUv,
    $input.time,
    $param.windowSeconds,
    $param.speed,
    $param.width,
    $param.feather,
    $param.pitchSpread,
    rippleCenter,
    int($param.onsetLoopStart),
    int($param.onsetLoopEnd)
  );
  $output.out = ripple.mask;
  $output.energy = ripple.energy;
`,
};
