---
name: preset-maintenance
description: Maintain JSON presets under src/presets/ in sync with the current data-model and serialization format. Use when adding, editing, or validating presets so they match SerializedGraphFile and load correctly.
---

# Preset maintenance

Keep **`src/presets/*.json`** honest vs latest **`SerializedGraphFile`** & migrations.

**Context:** **`domain/presets.mdc`**, **`serialization.mdc`**, **`project-conventions.mdc`**.

---

## Flow

1. Re-read presets rule for mandatory header fields/version keys.
2. Author kebab filenames; validate JSON ergonomically mirrors live editor expectations.
3. Load via production pipeline (**deserialize → migrate → `validateGraph`**)—never cheat with partial parsers in tests unless explicitly isolated.
4. After schema churn, update representative fixtures + preset-loading tests proving compile-ready graphs.
5. Document user-visible naming/discovery deltas in **`docs/user-goals`** / project notes when relevant.
6. **`npm run check`**.

## Checklist

On-disk naming • schema parity • exercised loader path • tests/docs when behavior shifts
