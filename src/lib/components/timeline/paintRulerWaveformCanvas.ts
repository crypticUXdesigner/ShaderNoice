import type { WaveformService } from '../../../runtime/waveform';

export interface FullWaveformData {
  values: number[];
  valuesRight?: number[];
  durationSeconds: number;
}

/**
 * Paints a stereo waveform overview into the ruler canvas for the visible time window.
 */
export function paintRulerWaveformCanvas(
  canvas: HTMLCanvasElement,
  full: FullWaveformData | null,
  waveformService: WaveformService | null,
  panOffset: number,
  visibleDuration: number
): void {
  const start = panOffset;
  const end = start + visibleDuration;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio ?? 1;
  const w = Math.max(1, Math.round((rect.width || 0) * dpr));
  const h = Math.max(1, Math.round((rect.height || 20) * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  ctx.clearRect(0, 0, w, h);
  if (!full || !waveformService || end <= start || full.values.length === 0) return;
  const sliceL = waveformService.getWaveformSlice(full.values, full.durationSeconds, start, end);
  if (sliceL.length === 0) return;
  const rightValues =
    full.valuesRight != null && full.valuesRight.length === full.values.length
      ? full.valuesRight
      : full.values;
  const sliceR = waveformService.getWaveformSlice(rightValues, full.durationSeconds, start, end);
  const n = sliceL.length;
  const midY = h / 2;
  const halfH = (h / 2) * 0.85;
  const minBarPx = Math.max(0.5, 1 * (dpr || 1));
  const visibleSpan = end - start;
  const actualStart = Math.max(0, start);
  const actualEnd = Math.min(full.durationSeconds, end);
  const dataSpan = Math.max(0, actualEnd - actualStart);
  const drawWidth = visibleSpan > 0 ? Math.min(w, Math.round((dataSpan / visibleSpan) * w)) : 0;
  const root = canvas.closest('.ruler-track') ?? document.documentElement;
  const color =
    getComputedStyle(root as Element).getPropertyValue('--print-subtle').trim() || '#666666';
  ctx.fillStyle = color;
  for (let x = 0; x < drawWidth; x++) {
    const t = drawWidth > 0 ? x / drawWidth : 0;
    const idx = Math.min(Math.floor(t * n), n - 1);
    const vL = Math.min(1, Math.max(0, sliceL[idx] ?? 0));
    const vR = Math.min(1, Math.max(0, sliceR[idx] ?? 0));
    const rawAmpL = vL * halfH;
    const rawAmpR = vR * halfH;
    const ampL = rawAmpL > 0 ? rawAmpL : minBarPx;
    const ampR = rawAmpR > 0 ? rawAmpR : minBarPx;
    const yTop = midY - ampL;
    const yBottom = midY + ampR;
    ctx.fillRect(x, Math.min(yTop, midY), 1, Math.abs(midY - yTop));
    ctx.fillRect(x, midY, 1, Math.abs(yBottom - midY));
  }
}
