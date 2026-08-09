import type { NodeSpec } from '../../types/nodeSpec';

/**
 * Patterns Fractal: single-pass UV → float fields only.
 * No fractal flames / reaction–diffusion here — see
 * docs/architecture/fractal-flames-and-reaction-diffusion.md.
 */

/** Compile-time iteration cap (GLSL/WGSL loop bound). */
export const FRACTAL_MAX_ITERATIONS = 32;

export const fractalNodeSpec: NodeSpec = {
  id: 'fractal',
  category: 'Patterns',
  displayName: 'Fractal',
  description:
    'Iterated 2D fractal patterns: KIFS folds, kaleidoscope, escape-time maps, orbit traps, Newton basins, Lyapunov stripes, shape-modulus Julia, and min-distance fields',
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
      max: 8,
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
    fractalEscapeFamily: {
      type: 'int',
      default: 0,
      min: 0,
      max: 2,
      step: 1,
      label: 'Family'
    },
    fractalColoring: {
      type: 'int',
      default: 0,
      min: 0,
      max: 2,
      step: 1,
      label: 'Coloring'
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
    fractalTrapShape: {
      type: 'int',
      default: 0,
      min: 0,
      max: 4,
      step: 1,
      label: 'Trap'
    },
    fractalTrapRadius: {
      type: 'float',
      default: 0.5,
      min: 0.01,
      max: 2.0,
      step: 0.01,
      label: 'Radius'
    },
    fractalNewtonPower: {
      type: 'int',
      default: 3,
      min: 2,
      max: 5,
      step: 1,
      label: 'Power'
    },
    fractalLyapunovA: {
      type: 'float',
      default: 3.2,
      min: 0.0,
      max: 4.0,
      step: 0.01,
      label: 'Rate A'
    },
    fractalLyapunovB: {
      type: 'float',
      default: 3.5,
      min: 0.0,
      max: 4.0,
      step: 0.01,
      label: 'Rate B'
    },
    fractalShapeRadius: {
      type: 'float',
      default: 1.0,
      min: 0.1,
      max: 3.0,
      step: 0.01,
      label: 'Radius'
    },
    fractalShapeAspect: {
      type: 'float',
      default: 1.0,
      min: 0.2,
      max: 3.0,
      step: 0.01,
      label: 'Aspect'
    },
    fractalShapeThin: {
      type: 'float',
      default: 0.18,
      min: 0.02,
      max: 1.0,
      step: 0.01,
      label: 'Thin'
    },
    fractalShapeShell: {
      type: 'float',
      default: 0.0,
      min: -0.5,
      max: 1.0,
      step: 0.01,
      label: 'Shell',
      knobPolarity: 'two-sided'
    },
    fractalPortalEnable: {
      type: 'int',
      default: 0,
      min: 0,
      max: 1,
      step: 1,
      label: 'Portal'
    },
    fractalPortalX: {
      type: 'float',
      default: 0.0,
      min: -2.0,
      max: 2.0,
      step: 0.01,
      label: 'Portal X',
      knobPolarity: 'two-sided'
    },
    fractalPortalY: {
      type: 'float',
      default: 0.0,
      min: -2.0,
      max: 2.0,
      step: 0.01,
      label: 'Portal Y',
      knobPolarity: 'two-sided'
    },
    fractalPortalRadius: {
      type: 'float',
      default: 0.4,
      min: 0.05,
      max: 2.0,
      step: 0.01,
      label: 'Portal R'
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
        'fractalEscapeFamily',
        'fractalColoring',
        'fractalJuliaReal',
        'fractalJuliaImag',
        'fractalTrapShape',
        'fractalTrapRadius',
        'fractalNewtonPower',
        'fractalLyapunovA',
        'fractalLyapunovB',
        'fractalShapeRadius',
        'fractalShapeAspect',
        'fractalShapeThin',
        'fractalShapeShell',
        'fractalPortalEnable',
        'fractalPortalX',
        'fractalPortalY',
        'fractalPortalRadius'
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
        label: 'Escape',
        visibleWhen: { parameter: 'fractalMode', equals: 3 },
        parameters: [
          'fractalEscapeFamily',
          'fractalColoring',
          'fractalJuliaReal',
          'fractalJuliaImag'
        ],
        layout: {
          columns: 3,
          parameterSpan: { fractalEscapeFamily: 2, fractalJuliaImag: 2 }
        },
        parameterVisibleWhen: {
          fractalJuliaReal: { parameter: 'fractalEscapeFamily', equals: 0 },
          fractalJuliaImag: { parameter: 'fractalEscapeFamily', equals: 0 }
        }
      },
      {
        type: 'grid',
        label: 'Trap',
        visibleWhen: { parameter: 'fractalMode', equals: 4 },
        parameters: ['fractalTrapShape', 'fractalTrapRadius'],
        layout: {
          columns: 3,
          parameterSpan: { fractalTrapShape: 2 }
        },
        parameterVisibleWhen: {
          fractalTrapRadius: { parameter: 'fractalTrapShape', equals: [0, 3, 4] }
        }
      },
      {
        type: 'grid',
        label: 'Newton',
        visibleWhen: { parameter: 'fractalMode', equals: 6 },
        parameters: ['fractalNewtonPower'],
        layout: { columns: 3, parameterSpan: { fractalNewtonPower: 2 } }
      },
      {
        type: 'grid',
        label: 'Lyapunov',
        visibleWhen: { parameter: 'fractalMode', equals: 7 },
        parameters: ['fractalLyapunovA', 'fractalLyapunovB'],
        layout: { columns: 3, parameterSpan: { fractalLyapunovA: 2, fractalLyapunovB: 2 } }
      },
      {
        type: 'grid',
        label: 'Shape Julia',
        visibleWhen: { parameter: 'fractalMode', equals: 8 },
        parameters: [
          'fractalColoring',
          'fractalJuliaReal',
          'fractalJuliaImag',
          'fractalShapeRadius',
          'fractalShapeAspect',
          'fractalShapeThin',
          'fractalShapeShell',
          'fractalPortalEnable',
          'fractalPortalX',
          'fractalPortalY',
          'fractalPortalRadius'
        ],
        layout: {
          columns: 3,
          parameterSpan: {
            fractalColoring: 2,
            fractalJuliaImag: 2,
            fractalShapeShell: 2,
            fractalPortalEnable: 2,
            fractalPortalRadius: 2
          }
        },
        parameterVisibleWhen: {
          fractalPortalX: { parameter: 'fractalPortalEnable', equals: 1 },
          fractalPortalY: { parameter: 'fractalPortalEnable', equals: 1 },
          fractalPortalRadius: { parameter: 'fractalPortalEnable', equals: 1 }
        }
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

vec2 fractalCdiv(vec2 a, vec2 b) {
  float d = max(dot(b, b), 1e-12);
  return vec2(dot(a, b), a.y * b.x - a.x * b.y) / d;
}

// Integer power z^n for n in 0..5 (compile-time capped).
vec2 fractalCpowInt(vec2 z, int n) {
  vec2 r = vec2(1.0, 0.0);
  for (int k = 0; k < 5; k++) {
    if (k >= n) break;
    r = fractalCmul(r, z);
  }
  return r;
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

// Escape-time field: family 0=Julia, 1=Mandelbrot, 2=Burning Ship; coloring 0=iter, 1=smooth, 2=DE.
float fractalEscapeField(vec2 p, float t) {
  int family = int($param.fractalEscapeFamily);
  int coloring = int($param.fractalColoring);
  int iterations = int($param.fractalIterations);
  float contrast = max($param.fractalContrast, 0.0001);
  float escapeR2 = 4.0;

  vec2 z;
  vec2 c;
  if (family == 0) {
    z = p;
    c = vec2($param.fractalJuliaReal, $param.fractalJuliaImag);
    c += vec2(sin(t * $param.fractalRotationSpeed), cos(t * $param.fractalRotationSpeed)) * 0.15;
  } else if (family == 2) {
    // Burning Ship set: Mandelbrot-style with abs fold; Y flipped so the "ship" sits upright.
    z = vec2(0.0);
    c = vec2(p.x, -p.y);
  } else {
    z = vec2(0.0);
    c = p;
  }

  vec2 dz = vec2(1.0, 0.0);
  float field = 0.0;
  bool didEscape = false;
  for (int i = 0; i < ${FRACTAL_MAX_ITERATIONS}; i++) {
    if (i >= iterations) break;

    if (family == 2) {
      // Abs fold before square; flip dz with pre-fold component signs (diffabs).
      dz = vec2(z.x >= 0.0 ? dz.x : -dz.x, z.y >= 0.0 ? dz.y : -dz.y);
      z = abs(z);
    }

    dz = 2.0 * fractalCmul(z, dz);
    z = fractalCmul(z, z) + c;

    float r2 = dot(z, z);
    if (r2 > escapeR2) {
      didEscape = true;
      float iterNorm = float(max(iterations, 1));
      if (coloring == 1) {
        float r = sqrt(r2);
        float mu = float(i) + 1.0 - log2(max(log2(max(r, 1.0001)), 1e-6));
        field = clamp(mu / iterNorm, 0.0, 1.0);
      } else if (coloring == 2) {
        float r = sqrt(r2);
        float lz = log(max(r, 1e-6));
        float ddz = max(length(dz), 1e-8);
        float de = 0.5 * lz * r / ddz;
        field = exp(-de * 10.0);
      } else {
        field = float(i + 1) / iterNorm;
      }
      break;
    }
  }
  if (!didEscape) {
    field = 1.0;
  }
  return pow(field, contrast) * $param.fractalIntensity;
}

// Orbit-trap distance: 0=Ring, 1=Line, 2=Cross, 3=Spiral, 4=Multi (min of ring+cross).
// Ring with radius 0.5 matches the legacy abs(length(z) - 0.5) trap.
float fractalOrbitTrapDist(vec2 z, int shape, float radius) {
  float dRing = abs(length(z) - radius);
  if (shape == 1) {
    return abs(z.y);
  }
  if (shape == 2) {
    return min(abs(z.x), abs(z.y));
  }
  if (shape == 3) {
    float theta = atan(z.y, z.x);
    float spiralR = radius * (1.0 + (theta + 3.141592653589793) / 6.283185307179586);
    return abs(length(z) - spiralR);
  }
  if (shape == 4) {
    return min(dRing, min(abs(z.x), abs(z.y)));
  }
  return dRing;
}

// Newton for p(z)=z^n−1 (n=2..5). Float = (rootId + convergence) / n —
// rootId from atan sector of the n-th roots of unity; convergence = 1−i/iters.
float fractalNewtonField(vec2 p, float t) {
  int power = clamp(int($param.fractalNewtonPower), 2, 5);
  int iterations = int($param.fractalIterations);
  float contrast = max($param.fractalContrast, 0.0001);
  float pf = float(power);

  vec2 z = fractalRotate2(p, t * $param.fractalRotationSpeed);
  // Avoid singular start at the origin (p'(0)=0 for n>1).
  if (dot(z, z) < 1e-10) {
    z = vec2(1e-4, 0.0);
  }

  float field = 0.0;
  bool converged = false;
  for (int i = 0; i < ${FRACTAL_MAX_ITERATIONS}; i++) {
    if (i >= iterations) break;

    vec2 zn = fractalCpowInt(z, power);
    vec2 zn1 = fractalCpowInt(z, power - 1);
    vec2 pz = zn - vec2(1.0, 0.0);
    vec2 dp = pf * zn1;
    vec2 delta = fractalCdiv(pz, dp);
    z = z - delta;

    float r2 = dot(z, z);
    if (r2 > 1e6) {
      field = 0.0;
      converged = true;
      break;
    }
    if (dot(delta, delta) < 1e-10) {
      float ang = atan(z.y, z.x);
      float sector = 6.28318530718 / pf;
      int rootId = int(floor(mod(ang + 3.141592653589793, 6.28318530718) / sector));
      rootId = clamp(rootId, 0, power - 1);
      float conv = 1.0 - float(i) / float(max(iterations, 1));
      field = (float(rootId) + clamp(conv, 0.0, 1.0)) / pf;
      converged = true;
      break;
    }
  }
  if (!converged) {
    float ang = atan(z.y, z.x);
    float sector = 6.28318530718 / pf;
    int rootId = int(floor(mod(ang + 3.141592653589793, 6.28318530718) / sector));
    rootId = clamp(rootId, 0, power - 1);
    field = float(rootId) / pf;
  }
  return pow(clamp(field, 0.0, 1.0), contrast) * $param.fractalIntensity;
}

// Logistic Lyapunov with fixed ABAB sequence; UV offsets Rate A/B in the (rA,rB) plane.
// λ mapped to ~0–1 via clamp(0.5 − λ·0.5) then Contrast/Intensity.
float fractalLyapunovField(vec2 p, float t) {
  int iterations = int($param.fractalIterations);
  float contrast = max($param.fractalContrast, 0.0001);
  vec2 q = fractalRotate2(p, t * $param.fractalRotationSpeed * 0.25);
  float a = clamp($param.fractalLyapunovA + q.x, 0.0, 4.0);
  float b = clamp($param.fractalLyapunovB + q.y, 0.0, 4.0);

  float x = 0.5;
  float sum = 0.0;
  int n = 0;
  for (int i = 0; i < ${FRACTAL_MAX_ITERATIONS}; i++) {
    if (i >= iterations) break;
    float r = ((i & 1) == 0) ? a : b;
    x = clamp(r * x * (1.0 - x), 1e-6, 1.0 - 1e-6);
    float deriv = abs(r * (1.0 - 2.0 * x));
    sum += log(max(deriv, 1e-8));
    n++;
  }
  float lambda = sum / float(max(n, 1));
  float field = clamp(0.5 - lambda * 0.5, 0.0, 1.0);
  return pow(field, contrast) * $param.fractalIntensity;
}

// Shape modulus μ(z) = |z| / R_shape(θ); R_shape is the radial extent of an
// axis-aligned ellipse (radius × aspect). Soft blob = slight squircle mix.
float fractalShapeModulus(vec2 z, float radius, float aspect) {
  float r = length(z);
  vec2 u = z / max(r, 1e-8);
  float ax = max(aspect, 0.05);
  float ell = radius / max(length(vec2(u.x / ax, u.y * ax)), 1e-6);
  float squ = radius / max(pow(pow(abs(u.x), 4.0) + pow(abs(u.y), 4.0), 0.25), 1e-6);
  float R = mix(ell, squ, 0.22);
  return r / max(R, 1e-6);
}

// Into-the-Portal–inspired 2D remap: invert through a disk in iteration space.
vec2 fractalPortalRemap(vec2 z, vec2 center, float portalR) {
  vec2 d = z - center;
  float r2 = dot(d, d);
  float R2 = portalR * portalR;
  if (r2 < R2 && r2 > 1e-10) {
    return center + d * (R2 / r2);
  }
  return z;
}

// Shape-modulus Julia: bail on μ(z)>2; Thin/Shell bias a circular shell of detail.
float fractalShapeJuliaField(vec2 p, float t) {
  int coloring = int($param.fractalColoring);
  int iterations = int($param.fractalIterations);
  float contrast = max($param.fractalContrast, 0.0001);
  float thin = max($param.fractalShapeThin, 0.02);
  float radius = max($param.fractalShapeRadius + $param.fractalShapeShell, 0.05);
  float aspect = max($param.fractalShapeAspect, 0.05);
  bool portalOn = int($param.fractalPortalEnable) != 0;
  vec2 portalC = vec2($param.fractalPortalX, $param.fractalPortalY);
  float portalR = max($param.fractalPortalRadius, 0.05);

  vec2 z = p;
  vec2 c = vec2($param.fractalJuliaReal, $param.fractalJuliaImag);
  c += vec2(sin(t * $param.fractalRotationSpeed), cos(t * $param.fractalRotationSpeed)) * 0.15;
  if (portalOn) {
    z = fractalPortalRemap(z, portalC, portalR);
  }

  float field = 0.0;
  bool didEscape = false;
  float shellAcc = 1e6;
  float escapeMu = 0.0;
  int escapeI = 0;
  for (int i = 0; i < ${FRACTAL_MAX_ITERATIONS}; i++) {
    if (i >= iterations) break;

    z = fractalCmul(z, z) + c;
    if (portalOn) {
      z = fractalPortalRemap(z, portalC, portalR);
    }

    float mu = fractalShapeModulus(z, radius, aspect);
    shellAcc = min(shellAcc, abs(mu - 1.0));
    if (mu > 2.0) {
      didEscape = true;
      escapeMu = mu;
      escapeI = i;
      break;
    }
  }

  float iterNorm = float(max(iterations, 1));
  float band = exp(-shellAcc / thin);
  if (didEscape) {
    if (coloring == 1) {
      float muSafe = max(escapeMu, 1.0001);
      float sm = float(escapeI) + 1.0 - log2(max(log2(muSafe), 1e-6));
      field = mix(clamp(sm / iterNorm, 0.0, 1.0), band, 0.55);
    } else if (coloring == 2) {
      field = band;
    } else {
      field = mix(float(escapeI + 1) / iterNorm, band, 0.55);
    }
  } else {
    field = band;
  }
  return pow(clamp(field, 0.0, 1.0), contrast) * $param.fractalIntensity;
}

float fractalDeform(vec2 p) {
  int mode = int($param.fractalMode);
  int iterations = int($param.fractalIterations);
  float t = ($time + $param.fractalTimeOffset) * $param.fractalAnimationSpeed;
  vec2 offset = vec2($param.fractalOffsetX, $param.fractalOffsetY);
  float layerScale = max($param.fractalLayers, 0.0001);
  float contrast = max($param.fractalContrast, 0.0001);

  if (mode == 3) {
    return fractalEscapeField(p, t);
  }
  if (mode == 6) {
    return fractalNewtonField(p, t);
  }
  if (mode == 7) {
    return fractalLyapunovField(p, t);
  }
  if (mode == 8) {
    return fractalShapeJuliaField(p, t);
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
      float trap = fractalOrbitTrapDist(
        z,
        int($param.fractalTrapShape),
        max($param.fractalTrapRadius, 0.01)
      );
      value = min(value + exp(-trap * scaleAcc * 2.0), 64.0);
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
