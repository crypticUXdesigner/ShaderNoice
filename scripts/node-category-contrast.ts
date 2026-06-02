/**
 * Node category contrast audit — foreground/background pairs for canvas node tokens.
 *
 * Minimum contrast tiers (WCAG relative luminance):
 *   - normal-text  ≥ 4.5:1  — param labels, enum text, icon colors on icon box
 *   - large-bold   ≥ 3:1    — node title, group header (text-3xl / weight 900)
 *   - non-text     ≥ 3:1    — knob ring track, toggle track, param-control borders
 *
 * Usage:
 *   npx tsx scripts/node-category-contrast.ts           — report all pairs; exit 1 on fail tier
 *   npx tsx scripts/node-category-contrast.ts --baseline — regression guard: fail only when a
 *     manifest pair marked baselineStatus "ok" drops below its tier minimum
 *
 * Pairs with gradient backgrounds: manifest bg uses documented worst-case stop.
 * Transparent param cells: manifest bg uses effective body/cell surface token.
 *
 * Manifest: scripts/node-category-contrast-manifest.json
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

type ContrastTier = 'normal-text' | 'large-bold' | 'non-text';
type BaselineStatus = 'ok' | 'warn' | 'fail';
type ComputedStatus = 'ok' | 'warn' | 'fail';

interface ManifestPair {
  id: string;
  category: string;
  categoryFile: string;
  tag: string;
  surface: string;
  fg: string;
  bg: string;
  bgNote?: string;
  tier: ContrastTier;
  minRatio: number;
  baselineStatus: BaselineStatus;
  snapshotRatio?: number;
}

interface Manifest {
  pairs: ManifestPair[];
}

interface Rgb {
  r: number;
  g: number;
  b: number;
  a: number;
}

const TIER_MIN: Record<ContrastTier, number> = {
  'normal-text': 4.5,
  'large-bold': 3,
  'non-text': 3,
};

function loadCssTokens(...relativePaths: string[]): Map<string, string> {
  const tokens = new Map<string, string>();
  for (const rel of relativePaths) {
    const content = readFileSync(path.join(ROOT, rel), 'utf8');
    for (const match of content.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      tokens.set(match[1], match[2].trim());
    }
  }
  return tokens;
}

function parseHexColor(raw: string): Rgb | null {
  const hex = raw.trim();
  if (!hex.startsWith('#')) return null;
  const body = hex.slice(1);
  if (body.length === 3) {
    return {
      r: parseInt(body[0] + body[0], 16),
      g: parseInt(body[1] + body[1], 16),
      b: parseInt(body[2] + body[2], 16),
      a: 1,
    };
  }
  if (body.length === 6) {
    return {
      r: parseInt(body.slice(0, 2), 16),
      g: parseInt(body.slice(2, 4), 16),
      b: parseInt(body.slice(4, 6), 16),
      a: 1,
    };
  }
  if (body.length === 8) {
    return {
      r: parseInt(body.slice(0, 2), 16),
      g: parseInt(body.slice(2, 4), 16),
      b: parseInt(body.slice(4, 6), 16),
      a: parseInt(body.slice(6, 8), 16) / 255,
    };
  }
  return null;
}

function parseRgbaColor(raw: string): Rgb | null {
  const m = raw.match(
    /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/i,
  );
  if (!m) return null;
  return {
    r: Number(m[1]),
    g: Number(m[2]),
    b: Number(m[3]),
    a: m[4] !== undefined ? Number(m[4]) : 1,
  };
}

function resolveColor(raw: string, tokens: Map<string, string>, depth = 0): Rgb | null {
  if (depth > 12) return null;
  const value = raw.trim();

  const hex = parseHexColor(value);
  if (hex) return hex;

  const rgba = parseRgbaColor(value);
  if (rgba) return rgba;

  const varMatch = value.match(/^var\((--[\w-]+)\)$/);
  if (varMatch) {
    const next = tokens.get(varMatch[1]);
    if (!next) {
      console.warn(`Unresolved token: ${varMatch[1]} (from ${value})`);
      return null;
    }
    return resolveColor(next, tokens, depth + 1);
  }

  console.warn(`Unrecognized color value: ${value}`);
  return null;
}

function composite(fg: Rgb, bg: Rgb): Rgb {
  const a = fg.a + bg.a * (1 - fg.a);
  if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
  return {
    r: (fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a,
    g: (fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a,
    b: (fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a,
    a,
  };
}

function relativeLuminance({ r, g, b }: Rgb): number {
  const channel = (c: number): number => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(fg: Rgb, bg: Rgb): number {
  const effectiveFg = fg.a < 1 ? composite(fg, bg) : fg;
  const l1 = relativeLuminance(effectiveFg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function computeStatus(ratio: number, minRatio: number): ComputedStatus {
  if (ratio >= minRatio) return 'ok';
  if (ratio >= minRatio * 0.85) return 'warn';
  return 'fail';
}

function formatRatio(ratio: number): string {
  return `${ratio.toFixed(2)}:1`;
}

function main(): void {
  const baselineMode = process.argv.includes('--baseline');
  const tokens = loadCssTokens('src/styles/scales.css', 'src/styles/tokens-node-editor.css');
  const manifest = JSON.parse(
    readFileSync(path.join(__dirname, 'node-category-contrast-manifest.json'), 'utf8'),
  ) as Manifest;

  const byFile = new Map<string, Array<{ pair: ManifestPair; ratio: number; status: ComputedStatus }>>();
  let failCount = 0;
  let regressionCount = 0;
  let unresolved = 0;

  for (const pair of manifest.pairs) {
    const fg = resolveColor(pair.fg, tokens);
    const bg = resolveColor(pair.bg, tokens);

    if (!fg || !bg) {
      unresolved++;
      console.error(`[unresolved] ${pair.id}: fg=${pair.fg} bg=${pair.bg}`);
      continue;
    }

    const ratio = contrastRatio(fg, bg);
    const minRatio = pair.minRatio ?? TIER_MIN[pair.tier];
    const status = computeStatus(ratio, minRatio);

    if (!byFile.has(pair.categoryFile)) byFile.set(pair.categoryFile, []);
    byFile.get(pair.categoryFile)!.push({ pair, ratio, status });

    if (status === 'fail') failCount++;

    if (baselineMode && pair.baselineStatus === 'ok' && status === 'fail') {
      regressionCount++;
    }
  }

  const sortedFiles = [...byFile.keys()].sort();
  for (const file of sortedFiles) {
    console.log(`\n## ${file}`);
    const rows = byFile.get(file)!;
    rows.sort((a, b) => a.pair.category.localeCompare(b.pair.category) || a.pair.id.localeCompare(b.pair.id));
    for (const { pair, ratio, status } of rows) {
      const minRatio = pair.minRatio ?? TIER_MIN[pair.tier];
      const baseline = pair.baselineStatus.padEnd(4);
      const icon = status === 'ok' ? '✓' : status === 'warn' ? '~' : '✗';
      console.log(
        `  ${icon} [${status.padEnd(4)}] ${pair.id.padEnd(42)} ${formatRatio(ratio).padStart(8)} (min ${minRatio}:1, baseline ${baseline}) [${pair.tag}]`,
      );
      if (pair.bgNote) console.log(`       bg note: ${pair.bgNote}`);
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Pairs: ${manifest.pairs.length} | fail: ${failCount} | unresolved: ${unresolved}`);
  if (baselineMode) {
    console.log(`Regressions (ok → fail): ${regressionCount}`);
    if (regressionCount > 0 || unresolved > 0) {
      process.exit(1);
    }
    console.log('Baseline regression check passed.');
    return;
  }

  if (failCount > 0 || unresolved > 0) {
    console.error(`\nContrast audit failed (${failCount} below tier, ${unresolved} unresolved).`);
    console.error('Known failures are tracked in manifest baselineStatus "fail" — use --baseline for CI regression gate.');
    process.exit(1);
  }
  console.log('All pairs meet tier minimums.');
}

main();
