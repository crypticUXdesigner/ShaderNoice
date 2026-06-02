import type { NodeSpec } from '../../types/nodeSpec';
import { MAX_PATTERN_COMET_ONSET_LOOP } from '../arrangement/pattern/constants';

/**
 * Duration-scaled curved comet strokes from MIDI onsets (`audioSetup.arrangementSnapshot`).
 * Placeholders `{{ARRANGEMENT_PATTERN_NOTE_BAKE}}`, `{{NODE_SUFFIX}}` replaced per instance.
 */
export const durationCometTrailsNodeSpec: NodeSpec = {
  id: 'duration-comet-trails',
  category: 'MIDI',
  displayName: 'Duration Comet Trails',
  description:
    'Recent notes draw curved comet strokes from pitch-derived positions; note duration sets trail length and velocity scales brightness. Requires an imported arrangement snapshot.',
  icon: 'shooting-star',
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
      name: 'head',
      type: 'float',
      label: 'Head',
    },
  ],
  parameters: {
    trailTime: {
      type: 'float',
      default: 1.4,
      min: 0.1,
      max: 8.0,
      step: 0.05,
      label: 'Trail',
    },
    length: {
      type: 'float',
      default: 0.28,
      min: 0.02,
      max: 1.0,
      step: 0.01,
      label: 'Length',
    },
    width: {
      type: 'float',
      default: 0.025,
      min: 0.002,
      max: 0.15,
      step: 0.001,
      label: 'Width',
    },
    bend: {
      type: 'float',
      default: 0.35,
      min: 0.0,
      max: 1.5,
      step: 0.01,
      label: 'Bend',
    },
    durationGain: {
      type: 'float',
      default: 0.7,
      min: 0.0,
      max: 4.0,
      step: 0.05,
      label: 'Dur gain',
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
      id: 'duration-comet-tracks',
      label: 'Tracks',
      parameters: [],
      collapsible: true,
      defaultCollapsed: false,
    },
    {
      id: 'duration-comet-shape',
      label: 'Shape',
      parameters: ['trailTime', 'length', 'width', 'bend', 'durationGain'],
      collapsible: true,
      defaultCollapsed: false,
    },
    {
      id: 'duration-comet-center',
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
        label: 'Shape',
        parameters: ['trailTime', 'length', 'width', 'bend', 'durationGain'],
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
struct DurationCometTrailsResult {
  float trail;
  float head;
};

{{ARRANGEMENT_PATTERN_NOTE_BAKE}}

vec2 durationCometTrailsUvFromP(vec2 p) {
  float aspect = uResolution.x / uResolution.y;
  return vec2(p.x / (2.0 * aspect) + 0.5, p.y * 0.5 + 0.5);
}

float durationCometPitchNorm(float pitch) {
  return arrPatternSaturate((pitch - 36.0) / 84.0);
}

float durationCometDurationScale(float durationSec, float durationGain) {
  return arrPatternSaturate(durationSec * durationGain * 6.0);
}

float durationCometTrailLen(float baseLen, float durationSec, float durationGain) {
  return baseLen * (0.2 + durationCometDurationScale(durationSec, durationGain));
}

float durationCometDistToSeg(vec2 p, vec2 a, vec2 b) {
  vec2 ab = b - a;
  float denom = max(dot(ab, ab), 1e-8);
  float t = clamp(dot(p - a, ab) / denom, 0.0, 1.0);
  return length(p - (a + ab * t));
}

float durationCometSampleTrail(
  vec2 uv,
  vec2 head,
  vec2 dir,
  vec2 perp,
  float trailLen,
  float bend,
  float width
) {
  float best = 1e5;
  vec2 prev = head;
  for (int k = 1; k <= 10; k++) {
    float t = float(k) / 10.0 * trailLen;
    vec2 pt = head - dir * t + perp * bend * sin(t * 18.0) * trailLen;
    best = min(best, durationCometDistToSeg(uv, prev, pt));
    prev = pt;
  }
  float halfW = max(0.0001, width * 0.5);
  return 1.0 - smoothstep(halfW, halfW + width, best);
}

float durationCometHeadGlint(vec2 uv, vec2 head, float width) {
  float d = length(uv - head);
  float r = max(0.0001, width * 1.6);
  return 1.0 - smoothstep(r * 0.35, r, d);
}

DurationCometTrailsResult evalDurationCometTrails(
  vec2 uv,
  float timelineTime,
  float trailTime,
  float baseLength,
  float width,
  float bend,
  float durationGain,
  vec2 center,
  int onsetLoopStart,
  int onsetLoopEnd
) {
  float trailMask = 0.0;
  float headMask = 0.0;
  float windowStart = timelineTime - trailTime;
  int loopStart = max(onsetLoopStart, 0);
  int loopEnd = min(onsetLoopEnd, ARR_PATTERN_ONSET_COUNT_{{NODE_SUFFIX}});

  for (int i = loopStart; i < loopEnd; i++) {
    if (i - loopStart >= ${MAX_PATTERN_COMET_ONSET_LOOP}) break;

    vec4 onset = ARR_PATTERN_ONSETS_{{NODE_SUFFIX}}[i];
    float startT = onset.x;
    float endT = onset.y;
    float pitch = onset.z;
    float velocity = onset.w;

    if (startT > timelineTime || startT < windowStart) continue;

    float age = timelineTime - startT;
    if (age < 0.0 || age > trailTime) continue;

    float noteDuration = max(0.001, endT - startT);
    float trailLen = durationCometTrailLen(baseLength, noteDuration, durationGain);
    float angle = arrPatternPitchToAngle(pitch);
    vec2 dir = vec2(cos(angle), sin(angle));
    vec2 perp = vec2(-dir.y, dir.x);
    float pitchNorm = durationCometPitchNorm(pitch);
    float radius = pitchNorm * 0.42;
    float progress = arrPatternSaturate(age / noteDuration);
    vec2 head = center + radius * dir + dir * progress * trailLen * 0.85;

    float stroke = durationCometSampleTrail(uv, head, dir, perp, trailLen, bend, width);
    float fade = exp(-age / max(trailTime, 0.001));
    float contrib = stroke * fade * velocity;
    trailMask = max(trailMask, contrib);

    float headFade = timelineTime <= endT + 0.05
      ? 1.0
      : exp(-(timelineTime - endT) / max(trailTime * 0.35, 0.001));
    float glint = durationCometHeadGlint(uv, head, width) * headFade * velocity;
    headMask = max(headMask, glint);
  }

  return DurationCometTrailsResult(trailMask, headMask);
}
`,
  mainCode: `
  vec2 cometUv = durationCometTrailsUvFromP($input.in);
  vec2 cometCenter = vec2($param.centerX, $param.centerY);
  DurationCometTrailsResult comet = evalDurationCometTrails(
    cometUv,
    $input.time,
    $param.trailTime,
    $param.length,
    $param.width,
    $param.bend,
    $param.durationGain,
    cometCenter,
    int($param.onsetLoopStart),
    int($param.onsetLoopEnd)
  );
  $output.out = comet.trail;
  $output.head = comet.head;
`,
};
