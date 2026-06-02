import type { NodeSpec } from '../../types/nodeSpec';
import { emitCircleInversionGlsl } from '../uvWarp';

/** Fixed circle loop bound (shader + param max). */
export const CIRCLE_INVERSION_MAX_CIRCLES = 4;

/** Fixed iteration loop bound (shader + param max). */
export const CIRCLE_INVERSION_MAX_ITERATIONS = 6;

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

export const circleInversionNodeSpec: NodeSpec = {
  id: 'circle-inversion',
  category: 'Distort',
  displayName: 'Circle Inversion',
  icon: 'circles-four',
  description:
    'Iterative multi-circle UV inversion with layout presets and soft boundaries. UV remap—not Spotlight color accumulation or KIFS 3D fold.',
  inputs: [{ name: 'in', type: 'vec2', label: 'UV' }],
  outputs: [{ name: 'out', type: 'vec2', label: 'UV' }],
  parameters: {
    circleInversionLayoutPreset: {
      type: 'int',
      default: 0,
      min: 0,
      max: 3,
      step: 1,
      label: 'Layout',
    },
    circleInversionCircleCount: {
      type: 'int',
      default: 3,
      min: 1,
      max: CIRCLE_INVERSION_MAX_CIRCLES,
      step: 1,
      label: 'Circles',
    },
    circleInversionRadius: {
      type: 'float',
      default: 0.35,
      min: 0.05,
      max: 1.5,
      step: 0.01,
      label: 'Radius',
    },
    circleInversionStrength: motionFloat('Strength', 1.0, 0.0, 1.0, 0.01),
    circleInversionIterations: {
      type: 'int',
      default: 2,
      min: 1,
      max: CIRCLE_INVERSION_MAX_ITERATIONS,
      step: 1,
      label: 'Iterations',
    },
    circleInversionSoftBoundary: {
      type: 'float',
      default: 0.1,
      min: 0.001,
      max: 0.5,
      step: 0.001,
      label: 'Soft',
    },
    circleInversionGlobalRotation: motionFloat('Rotation', 0.0, 0.0, 360.0, 1.0),
    circleInversionGlobalScale: {
      type: 'float',
      default: 1.0,
      min: 0.1,
      max: 4.0,
      step: 0.01,
      label: 'Scale',
    },
    circleInversionEscapeLimit: {
      type: 'float',
      default: 4.0,
      min: 0.5,
      max: 16.0,
      step: 0.1,
      label: 'Clamp',
    },
    circleInversionBlend: {
      type: 'float',
      default: 0.7,
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
          'circleInversionLayoutPreset',
          'circleInversionCircleCount',
          'circleInversionRadius',
          'circleInversionStrength',
          'circleInversionIterations',
          'circleInversionSoftBoundary',
          'circleInversionGlobalRotation',
          'circleInversionGlobalScale',
          'circleInversionEscapeLimit',
          'circleInversionBlend',
        ],
        parameterUI: {
          circleInversionLayoutPreset: 'enum',
        },
        layout: {
          columns: 3,
          parameterSpan: {
            circleInversionBlend: 3,
          },
        },
      },
    ],
  },
  functions: `
${emitCircleInversionGlsl()}

vec2 circleInversionLayoutCenter(int preset, int idx) {
  if (preset == 0) {
    if (idx == 0) return vec2(0.0, 0.35);
    if (idx == 1) return vec2(-0.303, -0.175);
    if (idx == 2) return vec2(0.303, -0.175);
    return vec2(0.0, 0.0);
  }
  if (preset == 1) {
    if (idx == 0) return vec2(-0.45, 0.0);
    if (idx == 1) return vec2(-0.15, 0.0);
    if (idx == 2) return vec2(0.15, 0.0);
    return vec2(0.45, 0.0);
  }
  if (preset == 2) {
    if (idx == 0) return vec2(0.38, 0.0);
    if (idx == 1) return vec2(0.0, 0.38);
    if (idx == 2) return vec2(-0.38, 0.0);
    return vec2(0.0, -0.38);
  }
  if (idx == 0) return vec2(0.31, 0.22);
  if (idx == 1) return vec2(-0.27, 0.35);
  if (idx == 2) return vec2(0.18, -0.41);
  return vec2(-0.36, -0.15);
}

vec2 circleInversionMultiUv(
  vec2 p,
  int layoutPreset,
  int circleCount,
  float radius,
  float strength,
  int iterations,
  float softBoundary,
  float globalRotationDeg,
  float globalScale,
  float escapeLimit
) {
  vec2 z = p;
  int activePreset = clamp(layoutPreset, 0, 3);
  int circles = clamp(circleCount, 1, ${CIRCLE_INVERSION_MAX_CIRCLES});
  int iters = clamp(iterations, 1, ${CIRCLE_INVERSION_MAX_ITERATIONS});
  float rotRad = globalRotationDeg * 0.017453292519943295;
  float c = cos(rotRad);
  float s = sin(rotRad);
  float soft = max(softBoundary, 0.0001);
  float r = max(radius, 0.001);
  float str = clamp(strength, 0.0, 1.0);
  float scale = max(globalScale, 0.001);

  for (int iter = 0; iter < ${CIRCLE_INVERSION_MAX_ITERATIONS}; iter++) {
    if (iter < iters) {
      for (int circleIdx = 0; circleIdx < ${CIRCLE_INVERSION_MAX_CIRCLES}; circleIdx++) {
        if (circleIdx < circles) {
          vec2 center = circleInversionLayoutCenter(activePreset, circleIdx) * scale;
          vec2 rel = z - center;
          float dist = length(rel);
          float w = smoothstep(0.0, soft * r, dist);
          z = uvWarp_circleInversionUv(z, center, r, str * w);
          z = vec2(c * z.x - s * z.y, s * z.x + c * z.y);
        }
      }
    }
  }

  float zLen = length(z);
  float limit = max(escapeLimit, 0.001);
  if (zLen > limit) {
    z *= limit / zLen;
  }
  return z;
}
`,
  mainCode: `
  vec2 pInv = circleInversionMultiUv(
    $input.in,
    $param.circleInversionLayoutPreset,
    $param.circleInversionCircleCount,
    $param.circleInversionRadius,
    $param.circleInversionStrength,
    $param.circleInversionIterations,
    $param.circleInversionSoftBoundary,
    $param.circleInversionGlobalRotation,
    $param.circleInversionGlobalScale,
    $param.circleInversionEscapeLimit
  );
  $output.out = mix($input.in, pInv, clamp($param.circleInversionBlend, 0.0, 1.0));
`,
};
