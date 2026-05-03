---
name: data-model-migration
description: Safely add or change data-model migrations and serialization format. Use when modifying serialization, migration logic, or preset compatibility so saved graphs and presets remain loadable and validated.
---

# Data-model migration

Evolve **`SerializedGraphFile`** while preserving loadability for presets + user projects.

**Context:** **`serialization.mdc`**, **`presets.mdc`**, **`compilation.mdc`**, **`project-conventions.mdc`**, core-architecture **_OVERVIEW**.

---

## Flow

1. Trace current pipeline (`serialization.ts`, version gates, fixture layout).
2. Decide **pure migration** vs internal non-breaking shim; migrations must be deterministic + ideally idempotent/version-gated.
3. Implement transform module(s); wire stage ordering in serialization entrypoints.
4. **`validateGraph` always post-migrate** before runtime/compiler.
5. Refresh **`__fixtures__`**, presets (pair **`preset-maintenance`**), README notes.
6. Tests around round-trips (`*Migration.test.ts`) + **`npm run check`**.

## Checklist

Single load path • pure transforms • validated output • fixtures/presets • automated tests
