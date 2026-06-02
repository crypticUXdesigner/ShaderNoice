import type { NodeSpec } from '../../types/nodeSpec';
import { emitVoronoiCellGlsl } from '../uvWarp';

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

export const cellularSlipNodeSpec: NodeSpec = {
  id: 'cellular-slip',
  category: 'Distort',
  displayName: 'Cellular Slip',
  icon: 'puzzle-piece',
  description:
    'Voronoi glass-plate UV warp: each cell slides and rotates independently with optional locked edges. Per-cell motion—not rectangular Block Glitch or Cells float pattern.',
  inputs: [{ name: 'in', type: 'vec2', label: 'UV' }],
  outputs: [{ name: 'out', type: 'vec2', label: 'UV' }],
  parameters: {
    cellularSlipScale: {
      type: 'float',
      default: 4.0,
      min: 0.5,
      max: 32.0,
      step: 0.1,
      label: 'Scale',
    },
    cellularSlipJitter: {
      type: 'float',
      default: 1.0,
      min: 0.0,
      max: 1.0,
      step: 0.01,
      label: 'Jitter',
    },
    cellularSlipAmount: motionFloat('Slip', 0.15, 0.0, 1.0, 0.01),
    cellularSlipRotation: motionFloat('Rotate', 0.0, 0.0, 360.0, 1.0),
    cellularSlipEdge: {
      type: 'float',
      default: 0.05,
      min: 0.001,
      max: 0.5,
      step: 0.001,
      label: 'Edge',
    },
    cellularSlipEdgeLock: {
      type: 'int',
      default: 0,
      min: 0,
      max: 1,
      step: 1,
      label: 'Lock',
    },
    cellularSlipSeed: {
      type: 'float',
      default: 0.0,
      min: -1000.0,
      max: 1000.0,
      step: 0.01,
      label: 'Seed',
      knobPolarity: 'two-sided',
    },
    cellularSlipStepHz: {
      type: 'float',
      default: 0.0,
      min: 0.0,
      max: 60.0,
      step: 0.001,
      label: 'Step Hz',
    },
    cellularSlipBlend: {
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
          'cellularSlipScale',
          'cellularSlipJitter',
          'cellularSlipAmount',
          'cellularSlipRotation',
          'cellularSlipEdge',
          'cellularSlipEdgeLock',
          'cellularSlipSeed',
          'cellularSlipStepHz',
          'cellularSlipBlend',
        ],
        layout: {
          columns: 3,
        },
      },
    ],
  },
  functions: `
${emitVoronoiCellGlsl()}

vec2 cellularSlipUv(
  vec2 p,
  float scale,
  float jitter,
  float slipAmount,
  float rotationDeg,
  float edgeSoftness,
  int edgeLock,
  vec2 seedOffset
) {
  UvWarpVoronoiCell vor = uvWarp_voronoiCellLookup(p, scale, jitter);
  vec2 cellId = vor.cellId + seedOffset;
  vec2 slipHash = uvWarp_hashCell(cellId);
  vec2 slipVec = (slipHash * 2.0 - 1.0) * slipAmount;
  float angleRad = (slipHash.y * 2.0 - 1.0) * rotationDeg * 0.017453292519943295;
  float c = cos(angleRad);
  float sn = sin(angleRad);
  vec2 q = p - vor.seed;
  q = vec2(c * q.x - sn * q.y, sn * q.x + c * q.y);
  vec2 pCell = vor.seed + q + slipVec;
  if (edgeLock >= 1) {
    float edgeGap = vor.f2 - vor.f1;
    float soft = max(edgeSoftness, 0.0001);
    float w = smoothstep(0.0, soft, edgeGap);
    pCell = mix(p, pCell, w);
  }
  return pCell;
}
`,
  mainCode: `
  float stepHz = max($param.cellularSlipStepHz, 0.0);
  float seedTick = floor($time * stepHz);
  float seedBase = $param.cellularSlipSeed + seedTick;
  vec2 seedOffset = vec2(seedBase, seedBase);
  vec2 pSlip = cellularSlipUv(
    $input.in,
    $param.cellularSlipScale,
    $param.cellularSlipJitter,
    $param.cellularSlipAmount,
    $param.cellularSlipRotation,
    $param.cellularSlipEdge,
    $param.cellularSlipEdgeLock,
    seedOffset
  );
  $output.out = mix($input.in, pSlip, clamp($param.cellularSlipBlend, 0.0, 1.0));
`,
};
