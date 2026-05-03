function toDate(value: Date | number | string): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  return new Date(value);
}

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function diffCalendarDaysLocal(earlier: Date, later: Date): number {
  const a = startOfLocalDay(earlier).getTime();
  const b = startOfLocalDay(later).getTime();
  // Using local midnights keeps “yesterday/today” intuitive for the user, even across DST.
  return Math.round((b - a) / 86_400_000);
}

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
});

const dateFormatterThisYear = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
});

const dateFormatterOtherYear = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

/**
 * Human-readable "last modified" label for project/preset rows.
 *
 * Buckets:
 * - Just now (< 1 min)
 * - Moments ago (1–10 min)
 * - N minutes ago (10–60 min)
 * - Today, {time} (same calendar day)
 * - Yesterday, {time}
 * - N days ago (2–7 days)
 * - {date} (> 7 days; year only when not current year)
 */
export function formatLastModifiedHuman(value: Date | number | string, now: Date = new Date()): string {
  const at = toDate(value);

  const diffMsRaw = now.getTime() - at.getTime();
  const diffMs = Number.isFinite(diffMsRaw) ? Math.max(0, diffMsRaw) : 0;
  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes <= 10) return 'Moments ago';
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`;

  const dayDiff = diffCalendarDaysLocal(at, now);
  const time = timeFormatter.format(at);

  if (dayDiff === 0) return `Today, ${time}`;
  if (dayDiff === 1) return `Yesterday, ${time}`;
  if (dayDiff >= 2 && dayDiff <= 7) return `${dayDiff} days ago`;

  const sameYear = at.getFullYear() === now.getFullYear();
  return (sameYear ? dateFormatterThisYear : dateFormatterOtherYear).format(at);
}

