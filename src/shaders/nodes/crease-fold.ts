import type { NodeSpec } from '../../types/nodeSpec';

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

export const creaseFoldNodeSpec: NodeSpec = {
  id: 'crease-fold',
  category: 'Distort',
  displayName: 'Crease Fold',
  icon: 'map-trifold',
  description:
    'Hinged mirror fold across a soft moving crease line; optional repeat grid with alternating direction. Linear UV hinge—not radial kaleidoscope symmetry.',
  inputs: [{ name: 'in', type: 'vec2', label: 'UV' }],
  outputs: [{ name: 'out', type: 'vec2', label: 'UV' }],
  parameters: {
    creaseFoldAngle: motionFloat('Angle', 0.0, 0.0, 360.0, 1.0),
    creaseFoldOffset: motionFloat('Offset', 0.0, -2.0, 2.0, 0.01, { knobPolarity: 'two-sided' }),
    creaseFoldAmount: motionFloat('Fold', 1.0, 0.0, 1.0, 0.01),
    creaseFoldSoftness: {
      type: 'float',
      default: 0.02,
      min: 0.0,
      max: 0.5,
      step: 0.001,
      label: 'Soft',
    },
    creaseFoldRepeatSpacing: {
      type: 'float',
      default: 0.0,
      min: 0.0,
      max: 2.0,
      step: 0.01,
      label: 'Repeat',
    },
    creaseFoldRepeatCount: {
      type: 'int',
      default: 1,
      min: 1,
      max: 8,
      step: 1,
      label: 'Count',
    },
    creaseFoldPhase: motionFloat('Phase', 0.0, 0.0, 6.28, 0.01),
    creaseFoldBlend: {
      type: 'float',
      default: 1.0,
      min: 0.0,
      max: 1.0,
      step: 0.01,
      label: 'Blend',
    },
  },
  parameterLayout: {
    minColumns: 3,
    elements: [
      {
        type: 'grid',
        parameters: [
          'creaseFoldAngle',
          'creaseFoldOffset',
          'creaseFoldAmount',
          'creaseFoldSoftness',
          'creaseFoldRepeatSpacing',
          'creaseFoldRepeatCount',
          'creaseFoldPhase',
          'creaseFoldBlend',
        ],
        layout: {
          columns: 3,
          parameterSpan: {
            creaseFoldAngle: 2,
            creaseFoldRepeatCount: 2,
            creaseFoldBlend: 3,
          },
        },
      },
    ],
  },
  functions: `
vec2 creaseFoldUv(
  vec2 p,
  vec2 n,
  float effOffset,
  float foldAmount,
  float soft,
  float repeatSpacing,
  int repeatCount
) {
  vec2 acc = p;
  for (int i = 0; i < 8; i++) {
    if (i >= repeatCount) break;
    float d = dot(acc, n) - effOffset;
    if (repeatSpacing > 0.0001) {
      float band = floor(d / repeatSpacing);
      d = d - band * repeatSpacing;
      if (mod(band, 2.0) >= 1.0) {
        d = repeatSpacing - d;
      }
    }
    vec2 pRef = acc - 2.0 * n * max(d, 0.0);
    float w = smoothstep(-soft, soft, d);
    acc = mix(acc, pRef, foldAmount * w);
  }
  return acc;
}
`,
  mainCode: `
  float angleRad = $param.creaseFoldAngle * 0.017453292519943295;
  vec2 n = vec2(cos(angleRad), sin(angleRad));
  float effOffset = $param.creaseFoldOffset + $param.creaseFoldPhase;
  float soft = max($param.creaseFoldSoftness, 0.0001);
  float foldAmt = clamp($param.creaseFoldAmount, 0.0, 1.0);
  float spacing = max($param.creaseFoldRepeatSpacing, 0.0);
  int repeatCount = clamp($param.creaseFoldRepeatCount, 1, 8);
  vec2 pFold = creaseFoldUv($input.in, n, effOffset, foldAmt, soft, spacing, repeatCount);
  $output.out = mix($input.in, pFold, clamp($param.creaseFoldBlend, 0.0, 1.0));
`,
};
