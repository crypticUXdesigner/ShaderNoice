/**
 * Canonical form for comparing playlist / fetch URLs when coalescing duplicate audio loads.
 * Not for security decisions — only dedupe keys and similar identity checks.
 */

function sortSearchParams(sp: URLSearchParams): string {
  const entries = [...sp.entries()].sort((a, b) => {
    const k = a[0].localeCompare(b[0]);
    if (k !== 0) return k;
    return String(a[1]).localeCompare(String(b[1]));
  });
  const next = new URLSearchParams(entries);
  const s = next.toString();
  return s ? `?${s}` : '';
}

function collapsePathSlashes(pathname: string): string {
  let p = pathname.replace(/\\/g, '/').replace(/\/{2,}/g, '/');
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p;
}

/**
 * Normalize a URL or same-origin path (+ optional query) for stable dedupe keys.
 */
export function normalizeUrlForAudioDedupe(raw: string): string {
  const t = raw.trim();
  if (t === '') return '';

  let s = t;
  if (s.startsWith('//')) {
    s = `https:${s}`;
  }

  if (/^https?:\/\//i.test(s)) {
    try {
      const u = new URL(s);
      u.hash = '';
      const protocol = u.protocol.toLowerCase();
      const host = u.hostname.toLowerCase();
      const pathname = collapsePathSlashes(u.pathname);
      let portSegment = '';
      if (u.port) {
        const def = protocol === 'https:' ? '443' : protocol === 'http:' ? '80' : '';
        if (u.port !== def) portSegment = `:${u.port}`;
      }
      const qs = sortSearchParams(u.searchParams);
      return `${protocol}//${host}${portSegment}${pathname}${qs}`;
    } catch {
      return t.replace(/\/{2,}/g, '/');
    }
  }

  const q = s.indexOf('?');
  const pathOnly = q === -1 ? s : s.slice(0, q);
  const queryOnly = q === -1 ? '' : s.slice(q);
  const pathname = collapsePathSlashes(pathOnly);
  try {
    const sp = queryOnly.startsWith('?') ? new URLSearchParams(queryOnly.slice(1)) : new URLSearchParams();
    return `${pathname}${sortSearchParams(sp)}`;
  } catch {
    return `${pathname}${queryOnly}`;
  }
}
