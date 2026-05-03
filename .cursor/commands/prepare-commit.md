# Prepare commit / PR (GitHub Pages parity)

Run before merging to **`main`** — matches **`.github/workflows/deploy.yml`** blockers.

## Required locally

```bash
npm run verify:pages
```

Covers **`npm audit --audit-level=high`** → **`npm run check`** (type-check, vitest, lint) → **`npm run build`** → **`npm run build-storybook`**.

If **`package.json` / `package-lock.json`** touched:

```bash
npm ci
npm run verify:pages
```

Fix lockfile conflicts before pushing (`npm install`, recommit lock).

## Docs hygiene (when docs changed)

If your commit touches **`docs/**`** (new files, moved files, or big edits), run:

- `/cleanup-docs`

Goal: keep `docs/` **small and truthful**, avoid drifting architecture prose, and remove resolved bug reports/specs.

## FYI parity

Clean deploy job also expects committed **`package-lock.json`**. Playwright + **`npm run a11y`** is optional locally — CI **`continue-on-error`** for a11y.

## Git sanity

Never commit **`dist/`**, artifacts, secrets, stray env files — confirm **`git status`**.

If **`verify:pages`** fails: fix upstream; audits → prefer **`npm audit fix`** / deliberate upgrades versus muting checks.

## Report back (copy/paste changelog)

After the checks pass, write a short “most relevant changes” list (3–7 bullets) suitable for a commit/PR description.

Suggested format:

- **UX**: …
- **Runtime/compilation**: …
- **Data-model**: …
- **Docs**: …
