/**
 * Time ranges on the timeline where automation uses hold / lead-in (no authored region rectangle),
 * for visualization only. Uses the same evaluable-region ordering as `automationEvaluator`.
 */

import type { AutomationLane } from '../../../data-model/types';
import { sortEvaluableRegions } from '../../../utils/automationEvaluator';

/** Half-open [start, end) ranges in seconds, clamped to [0, timelineDuration]. */
export function getAutomationHoldSpanTimeRanges(
  lane: AutomationLane,
  timelineDuration: number
): Array<{ start: number; end: number }> {
  const ev = sortEvaluableRegions(lane);
  if (ev.length === 0) return [];

  const d = Math.max(0, timelineDuration);
  const out: Array<{ start: number; end: number }> = [];

  const leadEnd = Math.min(ev[0].startTime, d);
  if (leadEnd > 0) {
    out.push({ start: 0, end: leadEnd });
  }

  for (let i = 0; i < ev.length - 1; i++) {
    const end = ev[i].startTime + ev[i].duration;
    const nextStart = ev[i + 1].startTime;
    if (nextStart > end) {
      const s = Math.max(0, end);
      const e = Math.min(nextStart, d);
      if (e > s) out.push({ start: s, end: e });
    }
  }

  const last = ev[ev.length - 1];
  if (!last.loop) {
    const endLast = last.startTime + last.duration;
    if (d > endLast) {
      out.push({ start: endLast, end: d });
    }
  }

  return out.filter((r) => r.end > r.start && Number.isFinite(r.start) && Number.isFinite(r.end));
}
