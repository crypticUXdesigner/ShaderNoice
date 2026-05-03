/**
 * Adds knobPolarity: 'two-sided' to float ParameterSpecs where min < 0 && max > 0.
 * Exclusions:
 * - mixed-wave-signal: outMin, outMax
 * - glass-shell: cameraRoX, cameraRoY, cameraRoZ
 * - math-primitives: clampNodeSpec min/max; stepNodeSpec edge
 * - input-nodes.ts: skipped (knobs not used)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const nodesDir = path.join(__dirname, '..', 'src', 'shaders', 'nodes');

function extractBalancedBrace(content, openBraceIndex) {
  let depth = 0;
  for (let i = openBraceIndex; i < content.length; i++) {
    const c = content[i];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return { end: i + 1, slice: content.slice(openBraceIndex, i + 1) };
    }
  }
  return null;
}

function parseMinMax(block) {
  const minM = block.match(/\bmin:\s*(-?[\d.]+(?:e[+-]?\d+)?)/i);
  const maxM = block.match(/\bmax:\s*(-?[\d.]+(?:e[+-]?\d+)?)/i);
  if (!minM || !maxM) return null;
  const min = parseFloat(minM[1]);
  const max = parseFloat(maxM[1]);
  if (Number.isNaN(min) || Number.isNaN(max)) return null;
  return { min, max };
}

function shouldExclude(fileBase, nodeSpecVar, paramKey) {
  if (fileBase === 'mixed-wave-signal.ts' && (paramKey === 'outMin' || paramKey === 'outMax')) return true;
  if (fileBase === 'glass-shell.ts' && /^cameraRo[XYZ]$/.test(paramKey)) return true;
  if (fileBase === 'math-primitives.ts') {
    if (nodeSpecVar === 'clampNodeSpec' && (paramKey === 'min' || paramKey === 'max')) return true;
    if (nodeSpecVar === 'stepNodeSpec' && paramKey === 'edge') return true;
  }
  return false;
}

function processNodeChunk(chunk, fileBase, nodeSpecVar) {
  const replacements = [];
  const pIdx = chunk.indexOf('parameters:');
  if (pIdx < 0) return replacements;
  const openBrace = chunk.indexOf('{', pIdx + 'parameters:'.length);
  const paramsWrapped = extractBalancedBrace(chunk, openBrace);
  if (!paramsWrapped) return replacements;

  const paramsInnerBody = paramsWrapped.slice.slice(1, -1);

  const paramRe = /(\w+):\s*\{/g;
  let pm;
  while ((pm = paramRe.exec(paramsInnerBody)) !== null) {
    const paramKey = pm[1];
    const relOpen = pm.index + pm[0].length - 1;
    const blk = extractBalancedBrace(paramsInnerBody, relOpen);
    if (!blk) continue;
    const blockText = blk.slice;
    if (!/type:\s*['"]float['"]/.test(blockText)) continue;
    if (/\bknobPolarity\s*:/.test(blockText)) continue;

    const bounds = parseMinMax(blockText);
    if (!bounds || bounds.min >= 0 || bounds.max <= 0) continue;
    if (shouldExclude(fileBase, nodeSpecVar, paramKey)) continue;

    const insertPos = blockText.lastIndexOf('}');
    let innerPart = blockText.slice(0, insertPos).trimEnd().replace(/,\s*$/, '');
    const neu = innerPart + ",\n      knobPolarity: 'two-sided' " + blockText.slice(insertPos);

    replacements.push({ old: blockText, neu });
  }

  return replacements;
}

function processFile(filePath) {
  const fileBase = path.basename(filePath);
  if (fileBase === 'index.ts' || fileBase.endsWith('.test.ts')) return 0;
  if (fileBase === 'input-nodes.ts') return 0;

  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  const exportRe = /\nexport const (\w+)\s*(?::\s*NodeSpec)?\s*=\s*\{/g;
  const specs = [];
  let em;
  while ((em = exportRe.exec(content)) !== null) {
    specs.push({ name: em[1], idx: em.index });
  }

  const allReplacements = [];
  for (let i = 0; i < specs.length; i++) {
    const start = specs[i].idx;
    const end = i + 1 < specs.length ? specs[i + 1].idx : content.length;
    const chunk = content.slice(start, end);
    allReplacements.push(...processNodeChunk(chunk, fileBase, specs[i].name));
  }

  /** Unique (old → neu); global replace so duplicate identical blocks in one file all update */
  const byOld = new Map();
  for (const r of allReplacements) {
    if (!byOld.has(r.old)) byOld.set(r.old, r.neu);
  }

  let count = 0;
  for (const [oldStr, neuStr] of byOld) {
    if (!content.includes(oldStr)) continue;
    const before = content;
    content = content.split(oldStr).join(neuStr);
    if (content !== before) count++;
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    return count;
  }
  return 0;
}

let total = 0;
for (const f of fs.readdirSync(nodesDir).sort()) {
  if (!f.endsWith('.ts')) continue;
  const n = processFile(path.join(nodesDir, f));
  if (n) {
    console.log(`${f}: ${n}`);
    total += n;
  }
}
console.log(`Total parameter blocks updated: ${total}`);
