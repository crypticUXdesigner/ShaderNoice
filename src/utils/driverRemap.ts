import { remapValue } from '../runtime/audio/remapValue';
import type { Connection } from '../data-model/types';
import type {
  MidiEnvelopeBinding,
} from '../data-model/midiEnvelopeTypes';
import { DEFAULT_MIDI_ENVELOPE_REMAPPER_OUTPUT } from '../data-model/midiEnvelopeTypes';
import type { ParameterSpec } from '../types/nodeSpec';

/**
 * Parameter-driver remap eval order:
 * 1. **Gate** — normalize `level` through `inMin` / `inMax`, clamp to [0, 1]
 * 2. **Target range** — lerp clamped value to `outMin` / `outMax` (parameter units)
 */
export function applyDriverGate(
  level: number | undefined | null,
  inMin: number,
  inMax: number
): number {
  return remapValue(level, inMin, inMax, 0, 1);
}

export function applyDriverTargetRange(
  gated: number,
  outMin: number,
  outMax: number
): number {
  return remapValue(gated, 0, 1, outMin, outMax);
}

export function applyDriverRemap(
  level: number | undefined | null,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return applyDriverTargetRange(applyDriverGate(level, inMin, inMax), outMin, outMax);
}

/** Normalized gate UI bounds (~0–1 with small headroom). */
export const DRIVER_REMAP_IN_UI_MIN = 0;
export const DRIVER_REMAP_IN_UI_MAX = 1;
export const DRIVER_REMAP_IN_UI_STEP = 0.01;

/** Target range edits in real parameter units (wide finite bounds). */
export const DRIVER_REMAP_OUT_VALUE_MIN = -9999;
export const DRIVER_REMAP_OUT_VALUE_MAX = 9999;
export const DRIVER_REMAP_OUT_VALUE_STEP = 0.01;

/** Remapper-card UI patch shape for per-target Out edits. */
export type DriverTargetOutUiPatch = { outMin?: number; outMax?: number };

/**
 * Maps remapper-card UI vocabulary to connection storage fields (audio only).
 * `RemapperCard` / `DriverRemapSection` emit `{ outMin, outMax }`; connections store
 * `driverOutMin` / `driverOutMax`.
 */
export function connectionDriverOutPatchFromUi(
  patch: DriverTargetOutUiPatch
): Partial<Pick<Connection, 'driverOutMin' | 'driverOutMax'>> {
  return {
    ...(patch.outMin !== undefined ? { driverOutMin: patch.outMin } : {}),
    ...(patch.outMax !== undefined ? { driverOutMax: patch.outMax } : {}),
  };
}

/** ValueInput step/decimals for Out fields — matches node body parameter controls. */
export function resolveDriverTargetOutUiStepAndDecimals(
  paramType?: 'float' | 'int',
  paramStep?: number
): { step: number; decimals: number } {
  const type = paramType ?? 'float';
  const step = type === 'int' ? (paramStep ?? 1) : (paramStep ?? DRIVER_REMAP_OUT_VALUE_STEP);
  const decimals = type === 'int' ? 0 : paramStep != null && paramStep >= 1 ? 0 : 3;
  return { step, decimals };
}

/** ValueInput bounds for per-target Out — clamp to parameter spec when finite. */
export function resolveDriverTargetOutUiBounds(
  paramMin?: number,
  paramMax?: number
): { min: number; max: number } {
  const hasMin = typeof paramMin === 'number' && Number.isFinite(paramMin);
  const hasMax = typeof paramMax === 'number' && Number.isFinite(paramMax);
  if (hasMin && hasMax) {
    return {
      min: Math.min(paramMin, paramMax),
      max: Math.max(paramMin, paramMax),
    };
  }
  return {
    min: DRIVER_REMAP_OUT_VALUE_MIN,
    max: DRIVER_REMAP_OUT_VALUE_MAX,
  };
}

/** Default normalized input gate for new driver remaps. */
export const DRIVER_REMAP_DEFAULT_IN = {
  inMin: DRIVER_REMAP_IN_UI_MIN,
  inMax: DRIVER_REMAP_IN_UI_MAX,
} as const;

export const DEFAULT_DRIVER_CONNECTION_OUT = { outMin: 0, outMax: 1 } as const;

const FALLBACK_DRIVER_REMAP_OUT = { ...DEFAULT_DRIVER_CONNECTION_OUT } as const;

/**
 * Target range for a new driver remap attach from a parameter spec.
 * Uses finite `min`/`max` when present; otherwise 0–1.
 */
export function defaultDriverRemapOutForParam(
  spec: ParameterSpec | undefined
): { outMin: number; outMax: number } {
  const min = spec?.min;
  const max = spec?.max;
  if (typeof min === 'number' && Number.isFinite(min) && typeof max === 'number' && Number.isFinite(max)) {
    return { outMin: min, outMax: max };
  }
  return { ...FALLBACK_DRIVER_REMAP_OUT };
}

/** Apply per-target Out when the wire is a shared remapper virtual node (`remap-*`). */
export function applyConnectionRemapperOut(
  connection: Pick<Connection, 'driverOutMin' | 'driverOutMax'>,
  gatedValue: number,
  signalId: string
): number {
  if (!signalId.startsWith('remap-')) return gatedValue;
  const { outMin, outMax } = resolveConnectionDriverOut(connection);
  return applyDriverTargetRange(gatedValue, outMin, outMax);
}

export function resolveConnectionDriverOut(
  connection: Pick<Connection, 'driverOutMin' | 'driverOutMax'>
): { outMin: number; outMax: number } {
  return {
    outMin:
      typeof connection.driverOutMin === 'number' && Number.isFinite(connection.driverOutMin)
        ? connection.driverOutMin
        : DEFAULT_DRIVER_CONNECTION_OUT.outMin,
    outMax:
      typeof connection.driverOutMax === 'number' && Number.isFinite(connection.driverOutMax)
        ? connection.driverOutMax
        : DEFAULT_DRIVER_CONNECTION_OUT.outMax,
  };
}

/**
 * Bake per-target Out into a shader expression for remapper virtual wires.
 * Remapper uniforms carry gated 0–1; Out is connection-scoped (task 03).
 */
export function buildRemapperTargetOutExpression(
  gatedExpr: string,
  connection: Pick<Connection, 'driverOutMin' | 'driverOutMax'>,
  signalId: string,
  formatLiteral: (value: number) => string
): string {
  if (!signalId.startsWith('remap-')) return gatedExpr;
  const { outMin, outMax } = resolveConnectionDriverOut(connection);
  const span = outMax - outMin;
  if (span === 1 && outMin === 0) return gatedExpr;
  return `((${gatedExpr}) * ${formatLiteral(span)} + ${formatLiteral(outMin)})`;
}

export function resolveMidiBindingOut(
  binding: Pick<MidiEnvelopeBinding, 'outMin' | 'outMax'>
): { outMin: number; outMax: number } {
  return {
    outMin:
      typeof binding.outMin === 'number' && Number.isFinite(binding.outMin)
        ? binding.outMin
        : DEFAULT_MIDI_ENVELOPE_REMAPPER_OUTPUT.outMin,
    outMax:
      typeof binding.outMax === 'number' && Number.isFinite(binding.outMax)
        ? binding.outMax
        : DEFAULT_MIDI_ENVELOPE_REMAPPER_OUTPUT.outMax,
  };
}
