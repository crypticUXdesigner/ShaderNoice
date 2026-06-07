import type { NodeSpec } from '../../types/nodeSpec';

/** Compile-time iteration cap (GLSL/WGSL loop bound). */
export const FRACTAL_MAX_ITERATIONS = 32;

export const fractalNodeSpec: NodeSpec = {
  id: 'fractal',
  category: 'Patterns',
  displayName: 'Fractal',
  description:
    'Iterated 2D fractal patterns: KIFS folds, kaleidoscope symmetry, Julia escape, orbit traps, and min-distance fields',
  icon: 'sparkles-2',
  inputs: [
    {
      name: 'in',
      type: 'vec2',
      label: 'UV'
    }
  ],
  outputs: [
    {
      name: 'out',
      type: 'float',
      label: 'Value'
    }
  ],
  parameters: {
    fractalMode: {
      type: 'int',
      default: 0,
      min: 0,
      max: 5,
      step: 1,
      label: 'Mode'
    },
    fractalIntensity: {
      type: 'float',
      default: 0.7,
      min: 0.0,
      max: 3.0,
      step: 0.01,
      label: 'Intensity'
    },
    fractalScale: {
      type: 'float',
      default: 2.0,
      min: 0.1,
      max: 20.0,
      step: 0.01,
      label: 'Scale'
    },
    fractalLayers: {
      type: 'float',
      default: 2.0,
      min: 1.0,
      max: 4.0,
      step: 0.01,
      label: 'Detail Scale'
    },
    fractalIterations: {
      type: 'int',
      default: 8.0,
      min: 1.0,
      max: FRACTAL_MAX_ITERATIONS,
      step: 1.0,
      label: 'Iterations'
    },
    fractalContrast: {
      type: 'float',
      default: 1.0,
      min: 0.1,
      max: 4.0,
      step: 0.01,
      label: 'Contrast'
    },
    fractalCenterX: {
      type: 'float',
      default: 0.0,
      min: -2.0,
      max: 2.0,
      step: 0.01,
      label: 'Center X',
      knobPolarity: 'two-sided'
    },
    fractalCenterY: {
      type: 'float',
      default: 0.0,
      min: -2.0,
      max: 2.0,
      step: 0.01,
      label: 'Center Y',
      knobPolarity: 'two-sided'
    },
    fractalOffsetX: {
      type: 'float',
      default: 1.0,
      min: -5.0,
      max: 5.0,
      step: 0.01,
      label: 'Offset X',
      knobPolarity: 'two-sided'
    },
    fractalOffsetY: {
      type: 'float',
      default: 1.0,
      min: -5.0,
      max: 5.0,
      step: 0.01,
      label: 'Offset Y',
      knobPolarity: 'two-sided'
    },
    fractalFoldCount: {
      type: 'int',
      default: 4,
      min: 2,
      max: 8,
      step: 1,
      label: 'Folds'
    },
    fractalJuliaReal: {
      type: 'float',
      default: -0.7,
      min: -2.0,
      max: 2.0,
      step: 0.001,
      label: 'Julia X',
      knobPolarity: 'two-sided'
    },
    fractalJuliaImag: {
      type: 'float',
      default: 0.27,
      min: -2.0,
      max: 2.0,
      step: 0.001,
      label: 'Julia Y',
      knobPolarity: 'two-sided'
    },
    fractalTimeOffset: {
      type: 'float',
      default: 0.0,
      min: -100.0,
      max: 100.0,
      step: 0.001,
      label: 'Time Offset',
      knobPolarity: 'two-sided'
    },
    fractalAnimationSpeed: {
      type: 'float',
      default: 1.0,
      min: 0.0,
      max: 5.0,
      step: 0.01,
      label: 'Speed'
    },
    fractalRotationSpeed: {
      type: 'float',
      default: 0.5,
      min: -2.0,
      max: 2.0,
      step: 0.01,
      label: 'Rotation Speed',
      knobPolarity: 'two-sided'
    },
    fractalLayerPhase: {
      type: 'float',
      default: 0.1,
      min: -1.0,
      max: 1.0,
      step: 0.01,
      label: 'Layer Phase',
      knobPolarity: 'two-sided'
    }
  },
  parameterGroups: [
    {
      id: 'fractal-main',
      label: 'Fractal',
      parameters: [
        'fractalMode',
        'fractalIntensity',
        'fractalScale',
        'fractalIterations',
        'fractalContrast',
        'fractalCenterX',
        'fractalCenterY'
      ],
      collapsible: true,
      defaultCollapsed: false
    },
    {
      id: 'fractal-shape',
      label: 'Shape',
      parameters: [
        'fractalLayers',
        'fractalOffsetX',
        'fractalOffsetY',
        'fractalFoldCount',
        'fractalJuliaReal',
        'fractalJuliaImag'
      ],
      collapsible: true,
      defaultCollapsed: false
    },
    {
      id: 'fractal-animation',
      label: 'Animation',
      parameters: [
        'fractalAnimationSpeed',
        'fractalTimeOffset',
        'fractalRotationSpeed',
        'fractalLayerPhase'
      ],
      collapsible: true,
      defaultCollapsed: false
    }
  ],
  parameterLayout: {
    minColumns: 3,
    elements: [
      {
        type: 'grid',
        parameters: ['fractalMode'],
        layout: { columns: 3, parameterSpan: { fractalMode: 3 } }
      },
      {
        type: 'grid',
        parameters: ['fractalIntensity', 'fractalScale', 'fractalIterations'],
        layout: { columns: 3 }
      },
      {
        type: 'grid',
        parameters: ['fractalContrast', 'fractalCenterX', 'fractalCenterY'],
        layout: { columns: 3 }
      },
      {
        type: 'grid',
        parameters: ['fractalLayers', 'fractalOffsetX', 'fractalOffsetY'],
        layout: { columns: 3 },
        parameterVisibleWhen: {
          fractalLayers: { parameter: 'fractalMode', equals: [0, 2, 4, 5] },
          fractalOffsetX: { parameter: 'fractalMode', equals: [0, 2, 4, 5] },
          fractalOffsetY: { parameter: 'fractalMode', equals: [0, 2, 4, 5] }
        }
      },
      {
        type: 'grid',
        label: 'Shape',
        visibleWhen: { parameter: 'fractalMode', equals: 1 },
        parameters: ['fractalLayers', 'fractalFoldCount', 'fractalOffsetX', 'fractalOffsetY'],
        layout: { columns: 3, parameterSpan: { fractalOffsetY: 3 } }
      },
      {
        type: 'grid',
        label: 'Shape',
        visibleWhen: { parameter: 'fractalMode', equals: 3 },
        parameters: ['fractalJuliaReal', 'fractalJuliaImag'],
        layout: { columns: 3, parameterSpan: { fractalJuliaImag: 2 } }
      },
      {
        type: 'grid',
        label: 'Animation',
        parameters: [
          'fractalAnimationSpeed',
          'fractalTimeOffset',
          'fractalRotationSpeed',
          'fractalLayerPhase'
        ],
        layout: { columns: 3, parameterSpan: { fractalLayerPhase: 3 } },
        parameterVisibleWhen: {
          fractalLayerPhase: { parameter: 'fractalMode', equals: [0, 1, 2, 4, 5] }
        }
      }
    ]
  },
  functions: `
vec2 fractalCmul(vec2 a, vec2 b) {
  return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

vec2 fractalRotate2(vec2 z, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return vec2(z.x * c - z.y * s, z.x * s + z.y * c);
}

vec2 fractalKaleidoFold(vec2 z, int folds) {
  z = abs(z);
  float a = atan(z.y, z.x);
  float r = length(z);
  float sector = 6.28318530718 / float(max(folds, 2));
  a = mod(a + sector * 0.5, sector) - sector * 0.5;
  return vec2(cos(a), sin(a)) * r;
}

float fractalDeform(vec2 p) {
  int mode = int($param.fractalMode);
  int iterations = int($param.fractalIterations);
  float t = ($time + $param.fractalTimeOffset) * $param.fractalAnimationSpeed;
  vec2 offset = vec2($param.fractalOffsetX, $param.fractalOffsetY);
  float layerScale = max($param.fractalLayers, 0.0001);
  float contrast = max($param.fractalContrast, 0.0001);

  if (mode == 3) {
    vec2 z = p;
    vec2 c = vec2($param.fractalJuliaReal, $param.fractalJuliaImag);
    c += vec2(sin(t * $param.fractalRotationSpeed), cos(t * $param.fractalRotationSpeed)) * 0.15;
    float escaped = 0.0;
    for (int i = 0; i < ${FRACTAL_MAX_ITERATIONS}; i++) {
      if (i >= iterations) break;
      z = fractalCmul(z, z) + c;
      if (dot(z, z) > 4.0) {
        escaped = float(i + 1) / float(max(iterations, 1));
        break;
      }
    }
    if (escaped <= 0.0) escaped = 1.0;
    return pow(escaped, contrast) * $param.fractalIntensity;
  }

  vec2 z = p;
  float scaleAcc = 1.0;
  float value = 0.0;
  float minDist = 1e6;

  for (int i = 0; i < ${FRACTAL_MAX_ITERATIONS}; i++) {
    if (i >= iterations) break;

    float angle = t * $param.fractalRotationSpeed + float(i) * $param.fractalLayerPhase;
    z = fractalRotate2(z, angle);

    if (mode == 1) {
      z = fractalKaleidoFold(z, int($param.fractalFoldCount));
      z = z * layerScale - offset;
      scaleAcc *= layerScale;
      value += exp(-length(z) * scaleAcc);
    } else if (mode == 2) {
      z = abs(z);
      z -= offset * 0.5;
      z = abs(z) - offset * 0.25;
      z *= layerScale;
      scaleAcc *= layerScale;
      value += exp(-max(abs(z.x), abs(z.y)) * scaleAcc);
    } else if (mode == 4) {
      z = abs(z);
      if (z.x < z.y) z.xy = z.yx;
      z = z * layerScale - offset;
      scaleAcc *= layerScale;
      float trap = abs(length(z) - 0.5);
      value += exp(-trap * scaleAcc * 2.0);
    } else if (mode == 5) {
      z = abs(z);
      if (z.x < z.y) z.xy = z.yx;
      z = z * layerScale - offset;
      scaleAcc *= layerScale;
      minDist = min(minDist, length(z) / scaleAcc);
    } else {
      z = abs(z);
      if (z.x < z.y) z.xy = z.yx;
      z = z * layerScale - offset;
      scaleAcc *= layerScale;
      value += exp(-length(z) * scaleAcc);
    }
  }

  if (mode == 5) {
    value = exp(-minDist * 3.0);
  }

  return pow(max(value, 0.0), contrast) * $param.fractalIntensity;
}
`,
  mainCode: `
  vec2 fractalUv = ($input.in - vec2($param.fractalCenterX, $param.fractalCenterY)) * $param.fractalScale;
  $output.out += fractalDeform(fractalUv) * 0.3;
`
};
