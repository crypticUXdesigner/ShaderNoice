import type { NodeSpec } from '../../types/nodeSpec';

/** Golden ratio for spherical Fibonacci lattice (Keinert et al.) */
const GOLDEN_RATIO = 1.618033988749895;
const PI = 3.141592653589793;

export const bloomSphereNodeSpec: NodeSpec = {
  id: 'bloom-sphere',
  category: 'Shapes',
  displayName: 'Bloom Sphere',
  description:
    'Sphere with spherical-Fibonacci lattice spots that pulse in a wave, blue outer glow and reddish inner glow. Wave phase, pattern scale, lattice spin, and optional detuned sine for richer motion. Single composite effect (no temporal buffer).',
  icon: 'glow',
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
      type: 'vec4',
      label: 'Color'
    }
  ],
  parameters: {
    bloomCenterX: {
      type: 'float',
      default: 0.0,
      min: -2.0,
      max: 2.0,
      step: 0.01,
      label: 'Bloom X'
    },
    bloomCenterY: {
      type: 'float',
      default: 0.0,
      min: -2.0,
      max: 2.0,
      step: 0.01,
      label: 'Bloom Y'
    },
    sphereRadius: {
      type: 'float',
      default: 1.0,
      min: 0.1,
      max: 3.0,
      step: 0.01,
      label: 'Radius',
      inputMode: 'override'
    },
    spotCount: {
      type: 'int',
      default: 128,
      min: 16,
      max: 256,
      step: 1,
      label: 'Spot count'
    },
    baseSpotAngle: {
      type: 'float',
      default: 0.25,
      min: 0.05,
      max: 0.8,
      step: 0.01,
      label: 'Spot size'
    },
    waveSpeed: {
      type: 'float',
      default: 2.0,
      min: 0.0,
      max: 8.0,
      step: 0.001,
      label: 'Wave speed',
      inputMode: 'override'
    },
    wavePhase: {
      type: 'float',
      default: 0.0,
      min: -12.57,
      max: 12.57,
      step: 0.01,
      label: 'Wave phase'
    },
    waveDetuneFreq: {
      type: 'float',
      default: 2.0,
      min: 0.25,
      max: 8.0,
      step: 0.05,
      label: 'Detune freq'
    },
    waveDetuneAmp: {
      type: 'float',
      default: 0.0,
      min: 0.0,
      max: 1.0,
      step: 0.01,
      label: 'Detune mix'
    },
    indexPhaseScale: {
      type: 'float',
      default: 0.1,
      min: 0.0,
      max: 1.0,
      step: 0.005,
      label: 'Pattern scale'
    },
    latticeSpinSpeed: {
      type: 'float',
      default: 0.0,
      min: -4.0,
      max: 4.0,
      step: 0.01,
      label: 'Spin speed'
    },
    waveAmplitude: {
      type: 'float',
      default: 0.12,
      min: 0.0,
      max: 1.0,
      step: 0.01,
      label: 'Wave depth'
    },
    spotSoftness: {
      type: 'float',
      default: 0.08,
      min: 0.01,
      max: 0.3,
      step: 0.01,
      label: 'Spot soft'
    },
    outerL: {
      type: 'float',
      default: 0.7391552434772553,
      min: 0.0,
      max: 1.0,
      step: 0.01,
      label: 'Outer L'
    },
    outerC: {
      type: 'float',
      default: 0.09253691178218687,
      min: 0.0,
      max: 0.4,
      step: 0.01,
      label: 'Outer C'
    },
    outerH: {
      type: 'float',
      default: 296.59265191815484,
      min: 0.0,
      max: 360.0,
      step: 1.0,
      label: 'Outer H'
    },
    innerL: {
      type: 'float',
      default: 0.7236677864677247,
      min: 0.0,
      max: 1.0,
      step: 0.01,
      label: 'Inner L'
    },
    innerC: {
      type: 'float',
      default: 0.20734208593918924,
      min: 0.0,
      max: 0.4,
      step: 0.01,
      label: 'Inner C'
    },
    innerH: {
      type: 'float',
      default: 27.587637681632806,
      min: 0.0,
      max: 360.0,
      step: 1.0,
      label: 'Inner H'
    },
    brightness: {
      type: 'float',
      default: 1.0,
      min: 0.0,
      max: 3.0,
      step: 0.1,
      label: 'Brightness'
    }
  },
  parameterGroups: [
    {
      id: 'sphere',
      label: 'Sphere',
      parameters: ['bloomCenterX', 'bloomCenterY', 'sphereRadius', 'brightness'],
      collapsible: true,
      defaultCollapsed: false
    },
    {
      id: 'spots',
      label: 'Spots',
      parameters: [
        'spotCount',
        'baseSpotAngle',
        'waveSpeed',
        'wavePhase',
        'waveDetuneFreq',
        'waveDetuneAmp',
        'indexPhaseScale',
        'latticeSpinSpeed',
        'waveAmplitude',
        'spotSoftness'
      ],
      collapsible: true,
      defaultCollapsed: false
    },
    {
      id: 'colors',
      label: 'Colors',
      parameters: ['outerL', 'outerC', 'outerH', 'innerL', 'innerC', 'innerH'],
      collapsible: true,
      defaultCollapsed: false
    }
  ],
  parameterLayout: {
    elements: [
      {
        type: 'grid',
        parameters: ['bloomCenterX', 'bloomCenterY', 'sphereRadius', 'brightness'],
        parameterUI: { bloomCenterX: 'coords', bloomCenterY: 'coords' },
        layout: { columns: 2, coordsSpan: 2 }
      },
      {
        type: 'grid',
        label: 'Spots',
        parameters: [
          'spotCount',
          'baseSpotAngle',
          'waveSpeed',
          'wavePhase',
          'waveDetuneFreq',
          'waveDetuneAmp',
          'indexPhaseScale',
          'latticeSpinSpeed',
          'waveAmplitude',
          'spotSoftness'
        ],
        layout: { columns: 3 }
      },
      {
        type: 'color-picker-row',
        label: 'Outer (blue) / Inner (red)',
        pickers: [
          ['outerL', 'outerC', 'outerH'],
          ['innerL', 'innerC', 'innerH']
        ]
      }
    ]
  },
  functions: `
vec3 bloomSphereOklchToRgb(vec3 oklch) {
  float l = oklch.x;
  float c = oklch.y;
  float h = oklch.z * 3.14159265359 / 180.0;

  float a = c * cos(h);
  float b = c * sin(h);

  // OKLab to linear RGB
  float l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  float m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  float s_ = l - 0.0894841775 * a - 1.2914855480 * b;

  float l3 = l_ * l_ * l_;
  float m3 = m_ * m_ * m_;
  float s3 = s_ * s_ * s_;

  float r = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  float g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  float bl = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

  return clamp(vec3(r, g, bl), 0.0, 1.0);
}

// Index to sphere direction (id2sf). i in [0, n-1], n >= 2. Constants in function scope so they are included when only function bodies are extracted.
vec3 bloomSphereId2Sf(float i, float n) {
  const float BS_PI = ${PI};
  const float BS_GOLDEN = ${GOLDEN_RATIO};
  float nf = max(n, 2.0);
  float z = 1.0 - (2.0 * i + 1.0) / nf;
  z = clamp(z, -1.0, 1.0);
  float phi = 2.0 * BS_PI * mod(i / BS_GOLDEN, 1.0);
  float r = sqrt(max(0.0, 1.0 - z * z));
  return vec3(r * cos(phi), r * sin(phi), z);
}
`,
  mainCode: `
  // in: p-space like UV Coords (aspect-corrected NDC), not raw 0–1 UV
  vec2 ndc = $input.in - vec2($param.bloomCenterX, $param.bloomCenterY);
  vec3 ro = vec3(0.0, 0.0, 3.0);
  vec3 rd = normalize(vec3(ndc, -1.0));

  float R = $param.sphereRadius;
  vec3 oc = ro;
  float a = dot(rd, rd);
  float b = 2.0 * dot(oc, rd);
  float c = dot(oc, oc) - R * R;
  float disc = b * b - 4.0 * a * c;

  if (disc < 0.0) {
    $output.out = vec4(0.0, 0.0, 0.0, 1.0);
  } else {
    float t = (-b - sqrt(disc)) / (2.0 * a);
    vec3 P = ro + t * rd;
    vec3 N = P / R;
    float nDotV = dot(N, -rd);

    float nSpots = clamp(float($param.spotCount), 16.0, 256.0);
    float baseAngle = $param.baseSpotAngle;
    float waveAmp = $param.waveAmplitude;
    float waveSpeed = $param.waveSpeed;
    float soft = $param.spotSoftness;
    float T = $time * waveSpeed;
    float wPhase = $param.wavePhase;
    float idxScale = $param.indexPhaseScale;
    float detuneF = $param.waveDetuneFreq;
    float detuneA = $param.waveDetuneAmp;
    float spinAngle = $time * $param.latticeSpinSpeed;
    float spinC = cos(spinAngle);
    float spinS = sin(spinAngle);

    vec3 outerColor = bloomSphereOklchToRgb(vec3($param.outerL, $param.outerC, $param.outerH));
    vec3 innerColor = bloomSphereOklchToRgb(vec3($param.innerL, $param.innerC, $param.innerH));

    vec3 acc = vec3(0.0);
    for (float i = 0.0; i < 256.0; i++) {
      if (i >= nSpots) break;
      vec3 spotDir = bloomSphereId2Sf(i, nSpots);
      spotDir = vec3(spinC * spotDir.x + spinS * spotDir.z, spotDir.y, -spinS * spotDir.x + spinC * spotDir.z);
      float iphase = i * idxScale;
      float wave = sin(T + iphase + wPhase) + detuneA * sin(T * detuneF + iphase + wPhase);
      float angle = baseAngle + waveAmp * wave;
      float cosAngle = cos(angle);
      float d = dot(N, spotDir);
      float spotMask = smoothstep(cosAngle - soft, cosAngle + soft * 0.5, d);
      float outerBlend = 1.0 - max(0.0, nDotV);
      float innerBlend = max(0.0, nDotV);
      vec3 spotColor = innerColor * innerBlend + outerColor * outerBlend;
      acc += spotMask * spotColor;
    }

    float norm = 8.0 / max(nSpots * 0.1, 1.0);
    acc = clamp(acc * norm * $param.brightness, 0.0, 1.0);
    $output.out = vec4(acc, 1.0);
  }
`
};
