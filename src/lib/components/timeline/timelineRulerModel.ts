export interface TimelineRulerData {
  barSeconds: number;
  ticks: number[];
  hasAudio: boolean;
}

const MAX_LABELS_IN_VIEW = 16;

/**
 * Fewer ruler labels when many bars fit in the viewport (zoomed out); more when zoomed in.
 * Step doubles until roughly MAX_LABELS_IN_VIEW or fewer numbered bars appear in view.
 */
export function pickRulerBarStep(barsInView: number): number {
  if (!Number.isFinite(barsInView) || barsInView <= 0) return 1;
  if (barsInView <= MAX_LABELS_IN_VIEW) return 1;
  let step = 1;
  while (step < 65536 && barsInView / step > MAX_LABELS_IN_VIEW) {
    step = step === 1 ? 2 : step * 2;
  }
  return step;
}

export function buildTimelineRulerData(input: {
  duration: number;
  bpm: number;
  hasAudio: boolean;
  visibleDuration: number;
  panOffset: number;
}): TimelineRulerData | null {
  const { duration, bpm, hasAudio, visibleDuration: vis, panOffset } = input;
  if (duration <= 0 || vis <= 0) return null;

  const barSeconds = 60 / bpm;
  if (!(barSeconds > 0)) return null;

  const maxBarNumber = Math.ceil(duration / barSeconds) || 1;
  const barsInView = vis / barSeconds;
  const barStep = pickRulerBarStep(barsInView);
  const jumpSec = barStep * barSeconds;

  const pad = Math.min(duration * 0.02, vis * 0.1 + barSeconds * barStep);
  const viewEnd = Math.min(duration, panOffset + vis);
  const tLow = Math.max(0, panOffset - pad);
  const upper = Math.min(duration, viewEnd + pad);

  const ticks: number[] = [];
  const kFirst = Math.max(0, Math.ceil(tLow / jumpSec - 1e-9));
  for (let k = kFirst; ; k++) {
    const tickTime = k * jumpSec;
    if (tickTime > upper + 1e-9) break;
    const barNumber = 1 + k * barStep;
    if (barNumber > maxBarNumber) break;
    ticks.push(barNumber);
  }

  return { barSeconds, ticks, hasAudio };
}
