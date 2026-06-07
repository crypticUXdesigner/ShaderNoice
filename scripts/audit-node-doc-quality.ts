/**
 * Content-quality audit: layout-exposed Controls parity, concision, examples, jargon.
 *
 * Run:
 *   tsx scripts/audit-node-doc-quality.ts           # report only (exit 0)
 *   tsx scripts/audit-node-doc-quality.ts --strict  # fail on coverage/controls/examples gaps
 *   tsx scripts/audit-node-doc-quality.ts --json    # also write scripts/audit-node-doc-quality-report.json
 *
 * Exit codes:
 *   0 — success (or report-only mode with issues logged)
 *   1 — --strict and missing doc, Controls mismatch, or needs ≥2 examples
 *
 * --strict warnings (logged, do not fail in v1): descriptions >400 chars, jargon without gloss.
 */
import fs from 'fs';
import path from 'path';

import {
  buildQualityReport,
  getExposedParamLabels,
  loadNodeDocumentation,
  REPO_ROOT,
} from './nodeDocAuditLib';
import { nodeSystemSpecs } from '../src/shaders/nodes/index';

const strict = process.argv.includes('--strict');
const writeJson = process.argv.includes('--json');
const doc = loadNodeDocumentation();
const report = buildQualityReport(doc);

console.log('=== Coverage ===');
console.log(
  'Registry:',
  report.registryCount,
  '| Missing doc:',
  report.missingDoc.length,
  report.missingDoc.length ? report.missingDoc.join(', ') : '(none)',
);

console.log('\n=== Controls (layout-exposed vs doc) ===');
console.log('Missing Controls section (UI has controls):', report.missingControlsDoc.length);
console.log('Partial / extra Controls mismatch:', report.controlsMismatch.length);

console.log('\n=== Conciseness ===');
console.log(
  'Descriptions >400 chars:',
  report.longDesc.length,
  `(${((100 * report.longDesc.length) / report.registryCount).toFixed(0)}%)`,
);
console.log(
  'Missing examples:',
  report.noExamples.length,
  `(${((100 * report.noExamples.length) / report.registryCount).toFixed(0)}%)`,
);
console.log(
  'Needs ≥2 examples (≥2 controls or inputs):',
  report.needsExamples.length,
);

console.log('\n=== Jargon without gloss (report-only) ===');
console.log('Entries flagged:', report.jargonWithoutGloss.length);

console.log('\n=== By category (long desc / no examples / controls mismatch) ===');
for (const [cat, s] of Object.entries(report.byCategory).sort(
  (a, b) => b[1].total - a[1].total,
)) {
  console.log(
    `${cat}: ${s.total} nodes | longDesc ${s.longDesc} | noExamples ${s.noExamples} | controlsMismatch ${s.controlsMismatch}`,
  );
}

console.log('\n=== Verification: Sine (0 controls) / Noise (>0 controls) ===');
const sine = nodeSystemSpecs.find((s) => s.id === 'sine');
const noise = nodeSystemSpecs.find((s) => s.id === 'noise');
if (sine) {
  const sineExposed = getExposedParamLabels(sine);
  console.log(`sine exposed controls: ${sineExposed.length}`, sineExposed.length === 0 ? 'OK' : 'UNEXPECTED');
}
if (noise) {
  const noiseExposed = getExposedParamLabels(noise);
  console.log(`noise exposed controls: ${noiseExposed.length}`, noiseExposed.length > 0 ? 'OK' : 'UNEXPECTED');
}

console.log('\n=== Samples: missing Controls doc (first 10) ===');
console.log(
  report.missingControlsDoc
    .slice(0, 10)
    .map((x) => `${x.id} (${x.exposedCount})`)
    .join(', ') || '(none)',
);

console.log('\n=== Samples: longest descriptions ===');
console.log(
  report.longDesc
    .sort((a, b) => b.len - a.len)
    .slice(0, 8)
    .map((x) => `${x.id}:${x.len}`)
    .join(', ') || '(none)',
);

console.log('\n=== Samples: jargon without gloss (first 10) ===');
console.log(
  report.jargonWithoutGloss
    .slice(0, 10)
    .map((x) => `${x.id} (${x.term})`)
    .join(', ') || '(none)',
);

if (writeJson) {
  const outPath = path.join(REPO_ROOT, 'scripts/audit-node-doc-quality-report.json');
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`\nWrote ${outPath}`);
}

if (strict) {
  const failures: string[] = [];

  if (report.missingDoc.length) {
    failures.push(`Missing doc entries: ${report.missingDoc.join(', ')}`);
  }
  if (report.missingControlsDoc.length) {
    failures.push(
      `Missing Controls section: ${report.missingControlsDoc.map((x) => x.id).join(', ')}`,
    );
  }
  if (report.controlsMismatch.length) {
    failures.push(
      `Controls mismatch: ${report.controlsMismatch.map((x) => x.id).join(', ')}`,
    );
  }
  if (report.needsExamples.length) {
    failures.push(`Needs ≥2 examples: ${report.needsExamples.join(', ')}`);
  }

  if (report.longDesc.length) {
    console.warn(
      '\nWARN: Descriptions >400 chars (not blocking in v1):',
      report.longDesc.map((x) => x.id).join(', '),
    );
  }
  if (report.jargonWithoutGloss.length) {
    console.warn(
      '\nWARN: Jargon without gloss (report-only):',
      report.jargonWithoutGloss
        .slice(0, 10)
        .map((x) => `${x.id} (${x.term})`)
        .join(', '),
    );
  }

  if (failures.length) {
    console.error('\n=== STRICT QUALITY FAILURES ===');
    for (const line of failures) {
      console.error(line);
    }
    process.exit(1);
  }

  console.log('\nStrict quality gates passed.');
}
