import type { NodeSpec } from '../../types/nodeSpec';

/** Snap mode: 0 = floor, 1 = center (floor(q+0.5)), 2 = round. */
export type PixelizeSnapMode = 0 | 1 | 2;

export function pixelizeSnapAxis(value: number, snap: PixelizeSnapMode): number {
  if (snap === 2) {
    return Math.round(value);
  }
  if (snap === 1) {
    return Math.floor(value + 0.5);
  }
  return Math.floor(value);
}

export function pixelizeSnapCoord(
  q: [number, number],
  snap: PixelizeSnapMode,
): [number, number] {
  return [pixelizeSnapAxis(q[0], snap), pixelizeSnapAxis(q[1], snap)];
}

/** Quantize normalized coords to a cell grid; cells clamp to at least 1 per axis. */
export function pixelizeQuantize(
  p: [number, number],
  cells: [number, number],
  offset: [number, number],
  snap: PixelizeSnapMode,
): [number, number] {
  const cx = Math.max(cells[0], 1);
  const cy = Math.max(cells[1], 1);
  const q: [number, number] = [p[0] * cx + offset[0], p[1] * cy + offset[1]];
  const snapped = pixelizeSnapCoord(q, snap);
  return [snapped[0] / cx, snapped[1] / cy];
}

export function pixelizeMix(
  inUv: [number, number],
  snapped: [number, number],
  amount: number,
): [number, number] {
  const t = Math.min(1, Math.max(0, amount));
  return [
    inUv[0] + (snapped[0] - inUv[0]) * t,
    inUv[1] + (snapped[1] - inUv[1]) * t,
  ];
}

export const pixelizeNodeSpec: NodeSpec = {
  id: 'pixelize',
  category: 'Distort',
  displayName: 'Pixelize',
  icon: 'grid-four',
  description: 'Snaps UV coordinates to a regular grid before downstream sampling',
  inputs: [
    {
      name: 'in',
      type: 'vec2',
      label: 'UV',
    },
  ],
  outputs: [
    {
      name: 'out',
      type: 'vec2',
      label: 'UV',
    },
  ],
  parameters: {
    pixelizeAmount: {
      type: 'float',
      default: 1.0,
      min: 0.0,
      max: 1.0,
      step: 0.01,
      label: 'Amount',
    },
    pixelizeCellsX: {
      type: 'float',
      default: 40.0,
      min: 1.0,
      max: 256.0,
      step: 1.0,
      label: 'Cells X',
    },
    pixelizeCellsY: {
      type: 'float',
      default: 40.0,
      min: 1.0,
      max: 256.0,
      step: 1.0,
      label: 'Cells Y',
    },
    pixelizeSpace: {
      type: 'int',
      default: 0,
      min: 0,
      max: 1,
      step: 1,
      label: 'Space',
    },
    pixelizeSnap: {
      type: 'int',
      default: 0,
      min: 0,
      max: 2,
      step: 1,
      label: 'Snap',
    },
    pixelizeOffsetX: {
      type: 'float',
      default: 0.0,
      min: -10.0,
      max: 10.0,
      step: 0.01,
      label: 'Offset X',
      knobPolarity: 'two-sided',
    },
    pixelizeOffsetY: {
      type: 'float',
      default: 0.0,
      min: -10.0,
      max: 10.0,
      step: 0.01,
      label: 'Offset Y',
      knobPolarity: 'two-sided',
    },
    pixelizeAspect: {
      type: 'float',
      default: 1.0,
      min: 0.25,
      max: 4.0,
      step: 0.01,
      label: 'Aspect',
    },
    pixelizeCenterX: {
      type: 'float',
      default: 0.0,
      min: -2.0,
      max: 2.0,
      step: 0.01,
      label: 'Center X',
      knobPolarity: 'two-sided',
    },
    pixelizeCenterY: {
      type: 'float',
      default: 0.0,
      min: -2.0,
      max: 2.0,
      step: 0.01,
      label: 'Center Y',
      knobPolarity: 'two-sided',
    },
    pixelizeScale: {
      type: 'float',
      default: 1.0,
      min: 0.1,
      max: 5.0,
      step: 0.01,
      label: 'Scale',
    },
    pixelizeDriftX: {
      type: 'float',
      default: 0.0,
      min: -10.0,
      max: 10.0,
      step: 0.01,
      label: 'Drift X',
      knobPolarity: 'two-sided',
    },
    pixelizeDriftY: {
      type: 'float',
      default: 0.0,
      min: -10.0,
      max: 10.0,
      step: 0.01,
      label: 'Drift Y',
      knobPolarity: 'two-sided',
    },
  },
  parameterGroups: [
    {
      id: 'pixelize-core',
      label: 'Core',
      parameters: [
        'pixelizeAmount',
        'pixelizeCellsX',
        'pixelizeCellsY',
        'pixelizeSpace',
        'pixelizeSnap',
      ],
      collapsible: false,
      defaultCollapsed: false,
    },
    {
      id: 'pixelize-grid',
      label: 'Grid',
      parameters: ['pixelizeOffsetX', 'pixelizeOffsetY', 'pixelizeAspect'],
      collapsible: true,
      defaultCollapsed: false,
    },
    {
      id: 'pixelize-pivot',
      label: 'Pivot',
      parameters: ['pixelizeCenterX', 'pixelizeCenterY', 'pixelizeScale'],
      collapsible: true,
      defaultCollapsed: true,
    },
    {
      id: 'pixelize-motion',
      label: 'Motion',
      parameters: ['pixelizeDriftX', 'pixelizeDriftY'],
      collapsible: true,
      defaultCollapsed: true,
    },
  ],
  parameterLayout: {
    elements: [
      {
        type: 'grid',
        parameters: [
          'pixelizeAmount',
          'pixelizeCellsX',
          'pixelizeCellsY',
          'pixelizeSpace',
          'pixelizeSnap',
        ],
        parameterUI: {
          pixelizeCellsX: 'coords',
          pixelizeCellsY: 'coords',
          pixelizeSpace: 'enum',
          pixelizeSnap: 'enum',
        },
        layout: {
          columns: 2,
          coordsSpan: 2,
          coordsOrigin: { pixelizeCellsX: 'bottom-left' },
          parameterSpan: { pixelizeAmount: 2 },
        },
      },
      {
        type: 'grid',
        label: 'Grid',
        parameters: ['pixelizeOffsetX', 'pixelizeOffsetY', 'pixelizeAspect'],
        parameterUI: { pixelizeOffsetX: 'coords', pixelizeOffsetY: 'coords' },
        parameterVisibleWhen: {
          pixelizeAspect: { parameter: 'pixelizeSpace', equals: 1 },
        },
        layout: {
          columns: 2,
          coordsSpan: 2,
          parameterSpan: { pixelizeAspect: 2 },
        },
      },
      {
        type: 'grid',
        label: 'Pivot',
        parameters: ['pixelizeCenterX', 'pixelizeCenterY', 'pixelizeScale'],
        parameterUI: { pixelizeCenterX: 'coords', pixelizeCenterY: 'coords' },
        layout: {
          columns: 2,
          coordsSpan: 2,
          parameterSpan: { pixelizeScale: 2 },
        },
      },
      {
        type: 'grid',
        label: 'Motion',
        parameters: ['pixelizeDriftX', 'pixelizeDriftY'],
        parameterUI: { pixelizeDriftX: 'coords', pixelizeDriftY: 'coords' },
        layout: { columns: 2, coordsSpan: 2 },
      },
    ],
  },
  functions: `
// Snap grid coordinate q per pixelizeSnap: 0=floor, 1=center (floor(q+0.5)), 2=round.
vec2 pixelizeSnapCoord(vec2 q, int snapMode) {
  if (snapMode == 2) {
    return round(q);
  }
  if (snapMode == 1) {
    return floor(q + 0.5);
  }
  return floor(q);
}

// Screen-space normalized coords with square-pixel lock (Space = Screen).
// Y is scaled by resolution.x / (resolution.y * aspect) so cell grids stay square on screen when aspect = 1.
vec2 pixelizeScreenNorm(float aspect) {
  vec2 sc = gl_FragCoord.xy / $resolution.xy;
  float aspectK = $resolution.x / ($resolution.y * max(aspect, 1.0e-4));
  sc.y *= aspectK;
  return sc;
}

// Inverse of pixelizeScreenNorm — maps snapped screen norm back to UV space for mix with inUv.
vec2 pixelizeScreenToUv(vec2 sc, float aspect) {
  float aspectK = $resolution.x / ($resolution.y * max(aspect, 1.0e-4));
  sc.y /= aspectK;
  return sc;
}
`,
  mainCode: `
  vec2 inUv = $input.in;
  vec2 center = vec2($param.pixelizeCenterX, $param.pixelizeCenterY);
  float scale = max($param.pixelizeScale, 1.0e-4);
  vec2 p = (inUv - center) / scale + center;

  int spaceMode = $param.pixelizeSpace;
  vec2 workP = p;
  float aspectVal = $param.pixelizeAspect;
  if (spaceMode == 1) {
    workP = pixelizeScreenNorm(aspectVal);
  }

  vec2 cells = vec2(max($param.pixelizeCellsX, 1.0), max($param.pixelizeCellsY, 1.0));
  vec2 offset = vec2($param.pixelizeOffsetX, $param.pixelizeOffsetY)
    + vec2($param.pixelizeDriftX, $param.pixelizeDriftY) * $time;

  vec2 q = workP * cells + offset;
  vec2 snappedQ = pixelizeSnapCoord(q, $param.pixelizeSnap);
  vec2 snapped = snappedQ / cells;

  if (spaceMode == 1) {
    snapped = pixelizeScreenToUv(snapped, aspectVal);
  }

  float amt = clamp($param.pixelizeAmount, 0.0, 1.0);
  $output.out = mix(inUv, snapped, amt);
`,
};
