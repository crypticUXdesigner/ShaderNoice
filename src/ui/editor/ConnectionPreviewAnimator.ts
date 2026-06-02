/**
 * Drives marching-ants dash offset while a connection preview is active.
 */

export const CONNECTION_PREVIEW_DASH_PATTERN: readonly [number, number] = [8, 10];
export const CONNECTION_PREVIEW_DASH_PERIOD =
  CONNECTION_PREVIEW_DASH_PATTERN[0] + CONNECTION_PREVIEW_DASH_PATTERN[1];
export const CONNECTION_PREVIEW_MARCH_SPEED_PX_PER_SEC = 72;

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export class ConnectionPreviewAnimator {
  private rafId: number | null = null;
  private lastTime = 0;
  private dashOffset = 0;
  private marchForward = true;

  constructor(private readonly requestRender: () => void) {}

  start(marchForward: boolean): void {
    this.marchForward = marchForward;
    if (this.rafId !== null) return;
    this.lastTime = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(64, now - this.lastTime);
      this.lastTime = now;
      if (!prefersReducedMotion()) {
        const direction = this.marchForward ? 1 : -1;
        this.dashOffset =
          (this.dashOffset + direction * CONNECTION_PREVIEW_MARCH_SPEED_PX_PER_SEC * (dt / 1000)) %
          CONNECTION_PREVIEW_DASH_PERIOD;
        if (this.dashOffset < 0) {
          this.dashOffset += CONNECTION_PREVIEW_DASH_PERIOD;
        }
      }
      this.requestRender();
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.dashOffset = 0;
  }

  getDashOffset(): number {
    return this.dashOffset;
  }

  setMarchForward(marchForward: boolean): void {
    this.marchForward = marchForward;
  }
}
