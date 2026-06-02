import type { NodeSpec } from '../../types/nodeSpec';

/** Fixed emitter loop bound (shader + param max). */
export const WAKE_SMEAR_MAX_EMITTERS = 6;

const motionFloat = (
  label: string,
  defaultValue: number,
  min: number,
  max: number,
  step: number,
  extras?: { knobPolarity?: 'two-sided' },
) => ({
  type: 'float' as const,
  default: defaultValue,
  min,
  max,
  step,
  label,
  supportsAnimation: true,
  supportsAudio: true,
  ...extras,
});

export const wakeSmearNodeSpec: NodeSpec = {
  id: 'wake-smear',
  category: 'Distort',
  displayName: 'Wake Smear',
  icon: 'ghost',
  description:
    'Procedural capsule-trail UV drag along animated emitter paths—datamosh-like smear without frame history. Distinct from rectangular Block Glitch jumps or continuous noise warps.',
  inputs: [{ name: 'in', type: 'vec2', label: 'UV' }],
  outputs: [{ name: 'out', type: 'vec2', label: 'UV' }],
  parameters: {
    wakeSmearEmitterCount: {
      type: 'int',
      default: 3,
      min: 1,
      max: WAKE_SMEAR_MAX_EMITTERS,
      step: 1,
      label: 'Emitters',
    },
    wakeSmearPathPreset: {
      type: 'int',
      default: 0,
      min: 0,
      max: 3,
      step: 1,
      label: 'Path',
    },
    wakeSmearSpeed: motionFloat('Speed', 0.5, 0.0, 5.0, 0.01),
    wakeSmearTrailLength: motionFloat('Length', 0.4, 0.05, 2.0, 0.01),
    wakeSmearTrailWidth: {
      type: 'float',
      default: 0.08,
      min: 0.01,
      max: 0.5,
      step: 0.01,
      label: 'Width',
    },
    wakeSmearDragStrength: motionFloat('Drag', 0.3, 0.0, 2.0, 0.01),
    wakeSmearCurl: motionFloat('Curl', 0.0, -2.0, 2.0, 0.01, { knobPolarity: 'two-sided' }),
    wakeSmearDecay: {
      type: 'float',
      default: 2.0,
      min: 0.1,
      max: 8.0,
      step: 0.1,
      label: 'Decay',
    },
    wakeSmearQuantizeHz: {
      type: 'float',
      default: 0.0,
      min: 0.0,
      max: 60.0,
      step: 0.5,
      label: 'Quantize',
    },
    wakeSmearBlend: {
      type: 'float',
      default: 1.0,
      min: 0.0,
      max: 1.0,
      step: 0.01,
      label: 'Blend',
      supportsAnimation: true,
      supportsAudio: true,
    },
  },
  parameterLayout: {
    minColumns: 3,
    elements: [
      {
        type: 'grid',
        parameters: [
          'wakeSmearEmitterCount',
          'wakeSmearPathPreset',
          'wakeSmearSpeed',
          'wakeSmearTrailLength',
          'wakeSmearTrailWidth',
          'wakeSmearDragStrength',
          'wakeSmearCurl',
          'wakeSmearDecay',
          'wakeSmearQuantizeHz',
          'wakeSmearBlend',
        ],
        parameterUI: {
          wakeSmearPathPreset: 'enum',
        },
        layout: {
          columns: 3,
          parameterSpan: {
            wakeSmearBlend: 3,
          },
        },
      },
    ],
  },
  functions: `
void ws_pathCore(
  int preset,
  float t,
  float size,
  out float px,
  out float py
) {
  px = 0.0;
  py = 0.0;
  if (preset == 0) {
    px = size * cos(t);
    py = 0.0;
  } else if (preset == 1) {
    px = size * cos(t);
    py = size * sin(t);
  } else if (preset == 2) {
    px = size * cos(t);
    py = size * sin(2.0 * t) * 0.5;
  } else {
    px = size * (0.62 * sin(t * 0.71) + 0.34 * sin(t * 1.11 + 1.17) + 0.19 * sin(t * 1.89 + 2.61));
    py = size * (0.58 * sin(t * 0.79 + 0.83) + 0.36 * sin(t * 1.03 + 2.07) + 0.21 * sin(t * 1.67 + 0.49));
  }
}

vec2 ws_emitterPos(int preset, float t, float size) {
  float px = 0.0;
  float py = 0.0;
  ws_pathCore(preset, t, size, px, py);
  return vec2(px, py);
}

float ws_capsuleDrag(
  vec2 p,
  vec2 tail,
  vec2 head,
  float width,
  float decay,
  float drag,
  float curl,
  out vec2 deltaOut
) {
  vec2 ab = head - tail;
  float len2 = dot(ab, ab);
  vec2 tangent = vec2(1.0, 0.0);
  float along = 0.0;
  vec2 closest = tail;
  if (len2 > 1e-8) {
    along = clamp(dot(p - tail, ab) / len2, 0.0, 1.0);
    closest = tail + along * ab;
    tangent = ab / sqrt(len2);
  }
  vec2 diff = p - closest;
  float dPerp = length(diff);
  float w = exp(-dPerp * dPerp / max(width * width, 1e-6));
  float age = 1.0 - along;
  w *= exp(-decay * age);
  vec2 perp = vec2(-tangent.y, tangent.x);
  deltaOut = drag * w * (tangent + curl * perp);
  return w;
}
`,
  mainCode: `
  float wsTau = 6.283185307179586;
  float wsTime = $time;
  float wsQHz = max($param.wakeSmearQuantizeHz, 0.0);
  if (wsQHz > 0.0) {
    wsTime = floor($time * wsQHz) / wsQHz;
  }
  int wsEmitters = clamp(
    $param.wakeSmearEmitterCount,
    1,
    ${WAKE_SMEAR_MAX_EMITTERS}
  );
  float wsSize = max($param.wakeSmearTrailLength * 0.75, 0.12);
  float wsTrailDt = $param.wakeSmearTrailLength * 1.5;
  vec2 wsDelta = vec2(0.0);
  vec2 wsP = $input.in;
  for (int i = 0; i < ${WAKE_SMEAR_MAX_EMITTERS}; i++) {
    if (i >= wsEmitters) break;
    float fi = float(i);
    float wsPhase = fi * wsTau / float(wsEmitters);
    float wsT = wsTime * $param.wakeSmearSpeed * wsTau + wsPhase;
    vec2 wsHead = ws_emitterPos($param.wakeSmearPathPreset, wsT, wsSize);
    vec2 wsTail = ws_emitterPos($param.wakeSmearPathPreset, wsT - wsTrailDt, wsSize);
    vec2 wsSegDelta = vec2(0.0);
    ws_capsuleDrag(
      wsP,
      wsTail,
      wsHead,
      $param.wakeSmearTrailWidth,
      $param.wakeSmearDecay,
      $param.wakeSmearDragStrength,
      $param.wakeSmearCurl,
      wsSegDelta
    );
    wsDelta += wsSegDelta;
  }
  vec2 wsWarped = wsP + wsDelta;
  float wsLen = length(wsWarped);
  if (wsLen > 8.0) {
    wsWarped *= 8.0 / wsLen;
  }
  $output.out = mix(wsP, wsWarped, clamp($param.wakeSmearBlend, 0.0, 1.0));
`,
};
