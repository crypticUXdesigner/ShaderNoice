/**
 * Coverage audit: nodeSystemSpecs ids vs node-documentation.json node:* keys.
 *
 * Run:
 *   tsx scripts/audit-node-docs.ts           # report only (exit 0)
 *   tsx scripts/audit-node-docs.ts --strict  # fail on missing or extra registry keys
 *
 * Exit codes:
 *   0 — success (or report-only mode with gaps logged)
 *   1 — --strict and registry/doc key mismatch
 */
import {
  getDocNodeIds,
  getRegistryIds,
  loadNodeDocumentation,
} from './nodeDocAuditLib';

const strict = process.argv.includes('--strict');
const registryIds = getRegistryIds();
const docIds = getDocNodeIds(loadNodeDocumentation());

const missing = registryIds.filter((id) => !docIds.includes(id));
const extra = docIds.filter((id) => !registryIds.includes(id));

console.log('Registry node count:', registryIds.length);
console.log('Doc node:<id> count:', docIds.length);
console.log(
  'Missing from docs:',
  missing.length,
  missing.length ? missing.join(', ') : '(none)',
);
console.log(
  'Extra in docs (not in registry):',
  extra.length,
  extra.length ? extra.join(', ') : '(none)',
);

if (strict && (missing.length > 0 || extra.length > 0)) {
  process.exit(1);
}
