import type { NodeSpec } from '../../types/nodeSpec';
import { MAX_PATTERN_WINDOW_BIN_LOOP } from '../arrangement/pattern/constants';

/**
 * Density-modulated stripe mask from `audioSetup.arrangementSnapshot` (compile-time bake).
 * Placeholders `{{ARRANGEMENT_PATTERN_NOTE_BAKE}}`, `{{NODE_SUFFIX}}` replaced per instance.
 */
export const rhythmStripeFieldNodeSpec: NodeSpec = {
  id: 'rhythm-stripe-field',
  category: 'MIDI',
  displayName: 'Rhythm Wavefield',
  description:
    'Mix-layer sine waves whose frequency and bend follow release-weighted note density from the arrangement snapshot; optional warp and energy outputs. Requires an imported arrangement snapshot.',
  icon: 'waves',
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
    {
      name: 'angle',
      type: 'float',
      label: 'Angle',
      fallbackExpression: '0.0',
    },
  ],
  outputs: [
    {
      name: 'out',
      type: 'float',
      label: 'Value',
    },
    {
      name: 'warp',
      type: 'vec2',
      label: 'Warp',
    },
    {
      name: 'energy',
      type: 'float',
      label: 'Energy',
    },
  ],
  parameters: {
    baseScale: {
      type: 'float',
      default: 8.0,
      min: 1.0,
      max: 64.0,
      step: 0.5,
      label: 'Scale',
    },
    densityGain: {
      type: 'float',
      default: 5.0,
      min: 0.0,
      max: 32.0,
      step: 0.5,
      label: 'Density',
    },
    bendGain: {
      type: 'float',
      default: 0.6,
      min: 0.0,
      max: 4.0,
      step: 0.05,
      label: 'Bend',
    },
    window: {
      type: 'float',
      default: 1.0,
      min: 0.05,
      max: 4.0,
      step: 0.05,
      label: 'Window',
    },
    release: {
      type: 'float',
      default: 0.35,
      min: 0.05,
      max: 4.0,
      step: 0.05,
      label: 'Release',
    },
    sharpness: {
      type: 'float',
      default: 0.15,
      min: 0.0,
      max: 1.0,
      step: 0.01,
      label: 'Sharp',
    },
    warpAmount: {
      type: 'float',
      default: 0.03,
      min: 0.0,
      max: 0.5,
      step: 0.001,
      label: 'Warp',
    },
    intensity: {
      type: 'float',
      default: 1.0,
      min: 0.0,
      max: 2.0,
      step: 0.01,
      label: 'Level',
    },
    idleMode: {
      type: 'int',
      default: 0,
      min: 0,
      max: 1,
      step: 1,
      label: 'Idle',
    },
    phaseSpeed: {
      type: 'float',
      default: 0.0,
      min: 0.0,
      max: 10.0,
      step: 0.01,
      label: 'Phase',
    },
    phaseOffset: {
      type: 'float',
      default: 0.0,
      min: 0.0,
      max: 6.28,
      step: 0.05,
      label: 'Offset',
    },
    velocityMix: {
      type: 'float',
      default: 0.5,
      min: 0.0,
      max: 1.0,
      step: 0.01,
      label: 'Vel mix',
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
  },
  parameterGroups: [
    {
      id: 'rhythm-stripe-tracks',
      label: 'Tracks',
      parameters: [],
      collapsible: true,
      defaultCollapsed: false,
    },
    {
      id: 'rhythm-stripe-shape',
      label: 'Shape',
      parameters: [
        'baseScale',
        'densityGain',
        'bendGain',
        'window',
        'release',
        'sharpness',
        'warpAmount',
        'intensity',
        'idleMode',
      ],
      collapsible: true,
      defaultCollapsed: false,
    },
    {
      id: 'rhythm-stripe-motion',
      label: 'Motion',
      parameters: ['phaseSpeed', 'phaseOffset', 'velocityMix'],
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
        label: 'Shape',
        parameters: [
          'baseScale',
          'densityGain',
          'bendGain',
          'window',
          'release',
          'sharpness',
          'warpAmount',
          'intensity',
          'idleMode',
        ],
        layout: { columns: 'auto' },
      },
      {
        type: 'grid',
        label: 'Motion',
        parameters: ['phaseSpeed', 'phaseOffset', 'velocityMix'],
        layout: { columns: 'auto' },
      },
    ],
    parametersWithoutPorts: ['trackFilterMode', 'trackFilterList'],
    minColumns: 3,
  },
  functions: `
struct RhythmStripeWindowSample {
  float density;
  float meanPitch;
  float meanVelocity;
};

struct RhythmStripeFieldResult {
  float mask;
  vec2 warp;
  float energy;
};

{{ARRANGEMENT_PATTERN_NOTE_BAKE}}

vec2 rhythmStripeFieldUvFromP(vec2 p) {
  float aspect = uResolution.x / uResolution.y;
  return vec2(p.x / (2.0 * aspect) + 0.5, p.y * 0.5 + 0.5);
}

vec2 rhythmStripeFieldRotate(vec2 v, float angleRad) {
  float c = cos(angleRad);
  float s = sin(angleRad);
  return vec2(v.x * c - v.y * s, v.x * s + v.y * c);
}

RhythmStripeWindowSample rhythmStripeFieldSampleWindow(float time, float windowSec, float releaseSec) {
  RhythmStripeWindowSample s;
  s.density = 0.0;
  s.meanPitch = 60.0;
  s.meanVelocity = 0.0;
  if (ARR_PATTERN_BIN_COUNT_{{NODE_SUFFIX}} == 0) return s;

  float win = max(windowSec, 0.001);
  float rel = max(releaseSec, 0.001);
  float t0 = max(0.0, time - win);
  int i0 = clamp(int(floor(t0 / ARR_PATTERN_BIN_WIDTH_{{NODE_SUFFIX}})), 0, ARR_PATTERN_BIN_COUNT_{{NODE_SUFFIX}} - 1);
  int i1 = clamp(int(floor(time / ARR_PATTERN_BIN_WIDTH_{{NODE_SUFFIX}})), 0, ARR_PATTERN_BIN_COUNT_{{NODE_SUFFIX}} - 1);

  float weightedOnsets = 0.0;
  float velSum = 0.0;
  float pitchSum = 0.0;

  for (int i = i0; i <= i1; i++) {
    if (i - i0 >= ${MAX_PATTERN_WINDOW_BIN_LOOP}) break;
    float binCenter = (float(i) + 0.5) * ARR_PATTERN_BIN_WIDTH_{{NODE_SUFFIX}};
    float age = time - binCenter;
    if (age < 0.0 || age > win) continue;
    float decay = max(0.0, 1.0 - age / rel);
    vec4 bin = ARR_PATTERN_TIME_BIN_{{NODE_SUFFIX}}[i];
    float w = bin.x * decay;
    weightedOnsets += w;
    if (bin.x > 0.0) {
      velSum += bin.z * w;
      pitchSum += bin.w * w;
    }
  }

  s.density = arrPatternSaturate(weightedOnsets / 4.0);
  s.meanVelocity = weightedOnsets > 0.0 ? velSum / weightedOnsets : 0.0;
  s.meanPitch = weightedOnsets > 0.0 ? pitchSum / weightedOnsets : 60.0;
  return s;
}

RhythmStripeFieldResult evalRhythmStripeField(
  vec2 uv,
  float timelineTime,
  float angleRad,
  float baseScale,
  float densityGain,
  float bendGain,
  float windowSec,
  float releaseSec,
  float sharpness,
  float warpAmount,
  float phaseSpeed,
  float phaseOffset,
  float velocityMix,
  float intensity,
  int idleMode
) {
  if (ARR_PATTERN_BIN_COUNT_{{NODE_SUFFIX}} == 0 && idleMode == 0) {
    return RhythmStripeFieldResult(0.0, vec2(0.0), 0.0);
  }

  RhythmStripeWindowSample win;
  if (ARR_PATTERN_BIN_COUNT_{{NODE_SUFFIX}} == 0) {
    win.density = 0.0;
    win.meanPitch = 60.0;
    win.meanVelocity = 0.0;
  } else {
    win = rhythmStripeFieldSampleWindow(timelineTime, windowSec, releaseSec);
    if (idleMode == 0 && win.density < 0.0001) {
      return RhythmStripeFieldResult(0.0, vec2(0.0), 0.0);
    }
  }

  float energy = win.density;
  float scale = baseScale + win.density * densityGain;

  vec2 centered = uv - vec2(0.5);
  vec2 rotUv = rhythmStripeFieldRotate(centered, angleRad);

  float pitchPhase = arrPatternPitchToAngle(win.meanPitch) * 0.25;
  float motion = phaseSpeed + velocityMix * win.meanVelocity * 2.0;
  float phase = pitchPhase + phaseOffset + timelineTime * motion;
  float bendAmp = win.density * bendGain;
  float bend = sin(rotUv.y * scale * 0.4 + phase) * bendAmp;

  float along = rotUv.x + bend;
  float stripeRaw = sin(along * scale * ARR_PATTERN_TAU + phase);
  float stripe01 = 0.5 + 0.5 * stripeRaw;

  float edge = mix(0.5, 0.015, arrPatternSaturate(sharpness));
  float mask = smoothstep(0.5 - edge, 0.5 + edge, stripe01) * intensity;

  vec2 stripeNormal = vec2(-sin(angleRad), cos(angleRad));
  vec2 warp = stripeNormal * bend * warpAmount;

  return RhythmStripeFieldResult(mask, warp, energy);
}
`,
  mainCode: `
  vec2 stripeUv = rhythmStripeFieldUvFromP($input.in);
  RhythmStripeFieldResult stripe = evalRhythmStripeField(
    stripeUv,
    $input.time,
    $input.angle,
    $param.baseScale,
    $param.densityGain,
    $param.bendGain,
    $param.window,
    $param.release,
    $param.sharpness,
    $param.warpAmount,
    $param.phaseSpeed,
    $param.phaseOffset,
    $param.velocityMix,
    $param.intensity,
    $param.idleMode
  );
  $output.out = stripe.mask;
  $output.warp = stripe.warp;
  $output.energy = stripe.energy;
`,
};
