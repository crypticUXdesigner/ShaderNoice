import type { NodeSpec } from '../../types/nodeSpec';
import { MAX_PATTERN_GRAVITY_ONSET_LOOP } from '../arrangement/pattern/constants';

/**
 * Arrangement-driven UV gravity wells from recent MIDI onsets (`audioSetup.arrangementSnapshot`).
 * Placeholders `{{ARRANGEMENT_PATTERN_NOTE_BAKE}}`, `{{NODE_SUFFIX}}` replaced per instance.
 */
export const noteGravityWarpNodeSpec: NodeSpec = {
  id: 'note-gravity-warp',
  category: 'MIDI',
  displayName: 'Note Gravity Warp',
  description:
    'Recent note onsets act as temporary gravity wells that pull and swirl UV coordinates; warp output chains into downstream patterns. Requires an imported arrangement snapshot.',
  icon: 'planet',
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
      name: 'warp',
      type: 'vec2',
      label: 'Warp',
    },
    {
      name: 'uv',
      type: 'vec2',
      label: 'UV',
    },
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
    decay: {
      type: 'float',
      default: 0.0,
      min: 0.0,
      max: 8.0,
      step: 0.05,
      label: 'Decay',
    },
    decayCurve: {
      type: 'int',
      default: 0,
      min: 0,
      max: 1,
      step: 1,
      label: 'Curve',
    },
    attack: {
      type: 'float',
      default: 0.0,
      min: 0.0,
      max: 1.0,
      step: 0.01,
      label: 'Attack',
    },
    strength: {
      type: 'float',
      default: 0.1,
      min: -0.5,
      max: 1.0,
      step: 0.001,
      label: 'Strength',
      knobPolarity: 'two-sided',
    },
    reach: {
      type: 'float',
      default: 0.22,
      min: 0.02,
      max: 1.0,
      step: 0.01,
      label: 'Reach',
    },
    swirl: {
      type: 'float',
      default: 0.5,
      min: -2.0,
      max: 2.0,
      step: 0.01,
      label: 'Swirl',
      knobPolarity: 'two-sided',
    },
    maxWarp: {
      type: 'float',
      default: 0.08,
      min: 0.001,
      max: 0.5,
      step: 0.001,
      label: 'Max warp',
    },
    falloff: {
      type: 'float',
      default: 1.0,
      min: 0.1,
      max: 5.0,
      step: 0.05,
      label: 'Falloff',
    },
    pitchSpread: {
      type: 'float',
      default: 0.42,
      min: 0.0,
      max: 1.0,
      step: 0.01,
      label: 'Spread',
    },
    velGain: {
      type: 'float',
      default: 1.0,
      min: 0.0,
      max: 4.0,
      step: 0.05,
      label: 'Vel gain',
    },
    blendMode: {
      type: 'int',
      default: 0,
      min: 0,
      max: 2,
      step: 1,
      label: 'Blend',
    },
    fieldGamma: {
      type: 'float',
      default: 1.0,
      min: 0.2,
      max: 4.0,
      step: 0.05,
      label: 'Field γ',
    },
    pitchLow: {
      type: 'float',
      default: 36.0,
      min: 0.0,
      max: 127.0,
      step: 1.0,
      label: 'Low',
    },
    pitchHigh: {
      type: 'float',
      default: 120.0,
      min: 1.0,
      max: 127.0,
      step: 1.0,
      label: 'High',
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
      id: 'note-gravity-tracks',
      label: 'Tracks',
      parameters: [],
      collapsible: true,
      defaultCollapsed: false,
    },
    {
      id: 'note-gravity-field',
      label: 'Field',
      parameters: [
        'windowSeconds',
        'decay',
        'decayCurve',
        'attack',
        'strength',
        'reach',
        'swirl',
        'maxWarp',
        'falloff',
        'pitchSpread',
        'velGain',
        'blendMode',
        'fieldGamma',
      ],
      collapsible: true,
      defaultCollapsed: false,
    },
    {
      id: 'note-gravity-center',
      label: 'Center',
      parameters: ['centerX', 'centerY'],
      collapsible: true,
      defaultCollapsed: false,
    },
    {
      id: 'note-gravity-advanced',
      label: 'Advanced',
      parameters: ['pitchLow', 'pitchHigh', 'onsetLoopStart', 'onsetLoopEnd'],
      collapsible: true,
      defaultCollapsed: true,
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
        label: 'Field',
        parameters: [
          'windowSeconds',
          'decay',
          'decayCurve',
          'attack',
          'strength',
          'reach',
          'swirl',
          'maxWarp',
          'falloff',
          'pitchSpread',
          'velGain',
          'blendMode',
          'fieldGamma',
        ],
        parameterUI: { decayCurve: 'enum', blendMode: 'enum' },
        layout: { columns: 'auto' },
      },
      {
        type: 'grid',
        label: 'Center',
        parameters: ['centerX', 'centerY'],
        parameterUI: { centerX: 'coords', centerY: 'coords' },
        layout: { columns: 2, coordsSpan: 2 },
      },
      {
        type: 'grid',
        label: 'Advanced',
        parameters: ['pitchLow', 'pitchHigh', 'onsetLoopStart', 'onsetLoopEnd'],
        layout: { columns: 'auto' },
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
struct NoteGravityWarpResult {
  vec2 warp;
  float field;
  float energy;
};

{{ARRANGEMENT_PATTERN_NOTE_BAKE}}

vec2 noteGravityWarpUvFromP(vec2 p) {
  float aspect = uResolution.x / uResolution.y;
  return vec2(p.x / (2.0 * aspect) + 0.5, p.y * 0.5 + 0.5);
}

float noteGravityWarpPitchNorm(float pitch, float pitchLow, float pitchHigh) {
  return arrPatternSaturate((pitch - pitchLow) / max(pitchHigh - pitchLow, 1.0));
}

float noteGravityWarpFade(float age, float windowSec, float decaySec, int decayCurve, float attack) {
  float decayDuration = decaySec > 0.0 ? decaySec : windowSec;
  float safeDecay = max(decayDuration, 0.001);
  float t = arrPatternSaturate(age / safeDecay);
  float fade = decayCurve == 1 ? (1.0 - t) : exp(-age / safeDecay);
  float attackBoost = 1.0 + attack * exp(-age / max(safeDecay * 0.08, 0.001));
  return fade * attackBoost;
}

float noteGravityWarpSpatialFalloff(float dist, float reach, float falloffPower) {
  float n = dist / max(reach, 0.001);
  return pow(1.0 - smoothstep(0.0, 1.0, n), max(falloffPower, 0.01));
}

NoteGravityWarpResult evalNoteGravityWarp(
  vec2 uv,
  float timelineTime,
  float windowSec,
  float decaySec,
  int decayCurve,
  float attack,
  float strength,
  float reach,
  float swirl,
  float maxWarp,
  float falloffPower,
  float pitchSpread,
  float velGain,
  int blendMode,
  float fieldGamma,
  float pitchLow,
  float pitchHigh,
  vec2 center,
  int onsetLoopStart,
  int onsetLoopEnd
) {
  vec2 displacement = vec2(0.0);
  float field = 0.0;
  float energy = 0.0;
  float bestWeight = 0.0;
  int activeCount = 0;
  float windowStart = timelineTime - windowSec;
  int loopStart = max(onsetLoopStart, 0);
  int loopEnd = min(onsetLoopEnd, ARR_PATTERN_ONSET_COUNT_{{NODE_SUFFIX}});

  for (int i = loopStart; i < loopEnd; i++) {
    if (i - loopStart >= ${MAX_PATTERN_GRAVITY_ONSET_LOOP}) break;

    vec4 onset = ARR_PATTERN_ONSETS_{{NODE_SUFFIX}}[i];
    float startT = onset.x;
    float pitch = onset.z;
    float velocity = onset.w;

    if (startT > timelineTime || startT < windowStart) continue;

    float age = timelineTime - startT;
    if (age < 0.0 || age > windowSec) continue;

    float angle = arrPatternPitchToAngle(pitch);
    float pitchNorm = noteGravityWarpPitchNorm(pitch, pitchLow, pitchHigh);
    float orbitRadius = pitchNorm * pitchSpread * 0.48;
    vec2 attractor = center + orbitRadius * vec2(cos(angle), sin(angle));

    vec2 delta = attractor - uv;
    float dist = length(delta);
    if (dist < 1e-5) continue;

    vec2 radialDir = delta / dist;
    vec2 tangentDir = vec2(-radialDir.y, radialDir.x);

    float spatial = noteGravityWarpSpatialFalloff(dist, reach, falloffPower);
    float fade = noteGravityWarpFade(age, windowSec, decaySec, decayCurve, attack);
    float vel = clamp(velocity * velGain, 0.0, 1.0);
    float weight = vel * spatial * fade;

    vec2 contrib = radialDir * strength * weight + tangentDir * strength * swirl * weight;

    if (blendMode == 1) {
      if (weight > bestWeight) {
        bestWeight = weight;
        displacement = contrib;
      }
    } else {
      displacement += contrib;
      activeCount += 1;
    }

    field = max(field, weight);
    energy = min(1.0, energy + weight);
  }

  if (blendMode == 2 && activeCount > 0) {
    displacement /= float(activeCount);
  }

  displacement = arrPatternClampLength(displacement, maxWarp);
  field = pow(arrPatternSaturate(field), max(fieldGamma, 0.01));
  energy = arrPatternSaturate(energy);

  return NoteGravityWarpResult(displacement, field, energy);
}
`,
  mainCode: `
  vec2 gravityUv = noteGravityWarpUvFromP($input.in);
  vec2 gravityCenter = vec2($param.centerX, $param.centerY);
  NoteGravityWarpResult gravity = evalNoteGravityWarp(
    gravityUv,
    $input.time,
    $param.windowSeconds,
    $param.decay,
    int($param.decayCurve),
    $param.attack,
    $param.strength,
    $param.reach,
    $param.swirl,
    $param.maxWarp,
    $param.falloff,
    $param.pitchSpread,
    $param.velGain,
    int($param.blendMode),
    $param.fieldGamma,
    $param.pitchLow,
    $param.pitchHigh,
    gravityCenter,
    int($param.onsetLoopStart),
    int($param.onsetLoopEnd)
  );
  $output.warp = gravity.warp;
  $output.uv = gravityUv + gravity.warp;
  $output.out = gravity.field;
  $output.energy = gravity.energy;
`,
};
