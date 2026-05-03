# A11y baseline (axe serious / critical)

`scripts/a11y.ts` only fails on **serious** or **critical** axe violations whose rule id is **not** listed here.

**Format:** one axe rule id per line at column 0, markdown list style: hyphen, space, optional backticks around the id (see `loadBaselineRuleIds` in `scripts/a11y.ts`).

**Current baseline:** none (strict mode). A recent `npm run a11y` run after `npm run build` reported no serious/critical issues on the main route without any baselined rules.

Add entries **only** for deliberately accepted debt. Prefer fixing the UI over growing this list.

**Note:** Any line in this file that matches the script’s pattern is treated as a real baseline — do not paste “examples” as top-level list items unless you intend to baseline them.
