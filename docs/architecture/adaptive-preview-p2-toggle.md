# Adaptive preview (P2) — how to enable the toggle

**Last updated:** 2026-05

**Code:** [`src/runtime/PreviewScheduler.ts`](../../src/runtime/PreviewScheduler.ts) (`ADAPTIVE_PREVIEW_STORAGE_KEY`, `setAdaptivePreviewEnabled`, `Renderer` DPR cap + settle).

**Default:** adaptive preview is **off**. Baseline preview behavior matches a build without this flag.

## Option A — DevTools (dev build only)

`window.__previewSchedulerDebug` is installed when `import.meta.env.DEV` is true (see `installPreviewSchedulerDebugGlobal()` in the same module).

```js
// Turn on (persists to localStorage — survives reload)
window.__previewSchedulerDebug.setAdaptivePreview(true);

// Turn off
window.__previewSchedulerDebug.setAdaptivePreview(false);

// Optional: overlay (~300ms) shows mode, compile phase, adaptive on/off, DPR
window.__previewSchedulerDebug.enableOverlay(true);
```

## Option B — localStorage (any build)

Same persistence the dev API uses:

```js
localStorage.setItem('shadernoice.previewAdaptive', '1');  // enable — then reload the app
localStorage.removeItem('shadernoice.previewAdaptive');    // disable — then reload
```

## What it does when enabled

- While the scheduler reports **`interactionReduced`** (e.g. canvas pan / node drag), the preview **caps effective `devicePixelRatio`** at **1.25×** when sizing the WebGL backing store (`Renderer.setupViewport`).
- On **interaction end**, one **full-DPR** viewport pass is scheduled so the next committed frame can settle at native backing scale (then a redraw is forced).

**Not changed:** live preview still uses **`preserveDrawingBuffer: true`** until a separate export/readback audit flips that (WebGL spec / readback constraints).

## Related reading

- Preview / recompile context: [`preview-and-recompilation.md`](./preview-and-recompilation.md)
