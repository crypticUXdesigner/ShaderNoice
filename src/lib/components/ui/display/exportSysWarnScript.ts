import type { SysWarnDisplayLine } from './appSplashSysWarnScript';
import { buildSysWarnTypingSequence } from './appSplashSysWarnScript';

/** Fake boot trace shown above the export focus advisory. */
export const EXPORT_BOOT_LINES = [
  { prefix: '>', text: 'scheduler: foreground_required = true' },
  { prefix: '>', text: 'throttle: background_tabs = aggressive' },
] as const;

export const EXPORT_FOCUS_MESSAGES = [
  'Do not alt-tab. Audio will judder.',
  'Minimize window → encode goes cold.',
  'Background tab = thermal event.',
] as const;

/** Plain-language advisory for assistive tech (decorative terminal copy is aria-hidden). */
export const EXPORT_FOCUS_ARIA_LABEL =
  'Keep this browser tab in focus. Switching tabs or minimizing the window can slow export and desync audio.';

const EXPORT_MSG_STORAGE_KEY = 'shadernoice-export-focus-msg-idx';

export function pickExportFocusMessage(): string {
  if (typeof window === 'undefined') return EXPORT_FOCUS_MESSAGES[0];

  try {
    const raw = sessionStorage.getItem(EXPORT_MSG_STORAGE_KEY);
    const last = raw != null ? Number.parseInt(raw, 10) : Number.NaN;
    const next = Number.isFinite(last)
      ? (last + 1) % EXPORT_FOCUS_MESSAGES.length
      : Math.floor(Math.random() * EXPORT_FOCUS_MESSAGES.length);
    sessionStorage.setItem(EXPORT_MSG_STORAGE_KEY, String(next));
    return EXPORT_FOCUS_MESSAGES[next] ?? EXPORT_FOCUS_MESSAGES[0];
  } catch {
    return (
      EXPORT_FOCUS_MESSAGES[Math.floor(Math.random() * EXPORT_FOCUS_MESSAGES.length)] ??
      EXPORT_FOCUS_MESSAGES[0]
    );
  }
}

export function buildExportFocusLines(message: string): SysWarnDisplayLine[] {
  return [
    ...EXPORT_BOOT_LINES.map((boot) => ({
      prefix: boot.prefix,
      text: boot.text,
      variant: 'boot' as const,
    })),
    { prefix: 'msg>', text: message, variant: 'msg' as const },
  ];
}

export function buildExportSysWarnTypingSequence(tagline: string) {
  return buildSysWarnTypingSequence(tagline, EXPORT_BOOT_LINES);
}

export function exportFocusStatusLabel(progressPercent: number | undefined): string {
  if (progressPercent == null || !Number.isFinite(progressPercent) || progressPercent < 0.05) {
    return '::hold';
  }
  if (progressPercent >= 0.92) return '::mux';
  return '::encode';
}
