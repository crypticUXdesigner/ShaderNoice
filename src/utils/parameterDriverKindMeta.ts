/**
 * Shared labels, icons, and CSS class hooks for parameter driver kinds.
 * Used by ParameterDriverPanel header chrome and ParamPort styling.
 */

import type { IconName } from './iconsUiRegistry';

export type ParameterDriverKind = 'audio' | 'animation' | 'midi';

export type ParameterDriverKindMeta = {
  id: ParameterDriverKind;
  label: string;
  icon: IconName;
  iconVariant?: 'line' | 'filled';
};

export const PARAMETER_DRIVER_KIND_OPTIONS: readonly ParameterDriverKindMeta[] = [
  { id: 'audio', label: 'Audio', icon: 'waveform', iconVariant: 'line' },
  { id: 'midi', label: 'MIDI', icon: 'music-note-simple', iconVariant: 'filled' },
  { id: 'animation', label: 'Animation', icon: 'line-segments', iconVariant: 'line' },
] as const;

export function parameterDriverKindIconVariant(
  kind: ParameterDriverKind
): 'line' | 'filled' {
  return getParameterDriverKindMeta(kind).iconVariant ?? 'line';
}

export function getParameterDriverKindMeta(kind: ParameterDriverKind): ParameterDriverKindMeta {
  return (
    PARAMETER_DRIVER_KIND_OPTIONS.find((entry) => entry.id === kind) ??
    PARAMETER_DRIVER_KIND_OPTIONS[0]!
  );
}

/** `is-audio` | `is-animation` | `is-midi` for global driver-kind chrome classes. */
export function parameterDriverKindClass(kind: ParameterDriverKind): string {
  return `is-${kind}`;
}
