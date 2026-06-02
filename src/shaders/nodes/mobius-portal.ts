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

export const mobiusPortalNodeSpec: NodeSpec = {
  id: 'mobius-portal',
  category: 'Distort',
  displayName: 'Möbius Portal',
  icon: 'infinity',
  description:
    'Conformal disk automorphism portal: off-center pole bends UV through a Möbius map. Straight lines become circles—distinct from symmetric Radial Warp lens bulge.',
  inputs: [{ name: 'in', type: 'vec2', label: 'UV' }],
  outputs: [{ name: 'out', type: 'vec2', label: 'UV' }],
  parameters: {
    mobiusPortalCenterX: {
      type: 'float',
      default: 0.0,
      min: -2.0,
      max: 2.0,
      step: 0.01,
      label: 'Center X',
      knobPolarity: 'two-sided',
    },
    mobiusPortalCenterY: {
      type: 'float',
      default: 0.0,
      min: -2.0,
      max: 2.0,
      step: 0.01,
      label: 'Center Y',
      knobPolarity: 'two-sided',
    },
    mobiusPortalPoleX: {
      type: 'float',
      default: 0.3,
      min: -2.0,
      max: 2.0,
      step: 0.01,
      label: 'Pole X',
      knobPolarity: 'two-sided',
    },
    mobiusPortalPoleY: {
      type: 'float',
      default: 0.0,
      min: -2.0,
      max: 2.0,
      step: 0.01,
      label: 'Pole Y',
      knobPolarity: 'two-sided',
    },
    mobiusPortalPoleRadius: motionFloat('Pole limit', 0.85, 0.0, 1.0, 0.01),
    mobiusPortalRotation: motionFloat('Rotation', 0.0, 0.0, 360.0, 1.0),
    mobiusPortalZoom: {
      type: 'float',
      default: 1.0,
      min: 0.1,
      max: 4.0,
      step: 0.01,
      label: 'Zoom',
    },
    mobiusPortalBoundarySoft: {
      type: 'float',
      default: 0.1,
      min: 0.001,
      max: 0.5,
      step: 0.001,
      label: 'Edge soft',
    },
    mobiusPortalBlend: {
      type: 'float',
      default: 0.5,
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
        parameters: ['mobiusPortalCenterX', 'mobiusPortalCenterY'],
        parameterUI: {
          mobiusPortalCenterX: 'coords',
          mobiusPortalCenterY: 'coords',
        },
        layout: { columns: 2, coordsSpan: 2 },
      },
      {
        type: 'grid',
        parameters: ['mobiusPortalPoleX', 'mobiusPortalPoleY'],
        parameterUI: {
          mobiusPortalPoleX: 'coords',
          mobiusPortalPoleY: 'coords',
        },
        layout: { columns: 2, coordsSpan: 2 },
      },
      {
        type: 'grid',
        parameters: [
          'mobiusPortalPoleRadius',
          'mobiusPortalRotation',
          'mobiusPortalZoom',
          'mobiusPortalBoundarySoft',
          'mobiusPortalBlend',
        ],
        layout: {
          columns: 3,
          parameterSpan: {
            mobiusPortalBlend: 2,
          },
        },
      },
    ],
  },
  functions: `
vec2 mobiusPortalUv(
  vec2 p,
  vec2 center,
  vec2 pole,
  float poleRadius,
  float rotationDeg,
  float zoom,
  float boundarySoft
) {
  vec2 z = (p - center) * zoom;
  vec2 a = pole * poleRadius;
  float aLen = length(a);
  if (aLen > 0.95) {
    a *= 0.95 / aLen;
  }

  vec2 num = z - a;
  float denomRe = 1.0 - dot(a, z);
  float denom = max(abs(denomRe), 0.0001);
  vec2 w = num / denom;

  float rotRad = rotationDeg * 0.017453292519943295;
  float c = cos(rotRad);
  float s = sin(rotRad);
  w = vec2(c * w.x - s * w.y, s * w.x + c * w.y);

  float soft = max(boundarySoft, 0.0001);
  float edgeFade = 1.0 - smoothstep(1.0 - soft, 1.0, length(z));
  w = mix(z, w, edgeFade);

  float wLen = length(w);
  if (wLen > 8.0) {
    w *= 8.0 / wLen;
  }

  return center + w;
}
`,
  mainCode: `
  vec2 center = vec2($param.mobiusPortalCenterX, $param.mobiusPortalCenterY);
  vec2 pole = vec2($param.mobiusPortalPoleX, $param.mobiusPortalPoleY);
  vec2 pPortal = mobiusPortalUv(
    $input.in,
    center,
    pole,
    $param.mobiusPortalPoleRadius,
    $param.mobiusPortalRotation,
    $param.mobiusPortalZoom,
    $param.mobiusPortalBoundarySoft
  );
  $output.out = mix($input.in, pPortal, clamp($param.mobiusPortalBlend, 0.0, 1.0));
`,
};
