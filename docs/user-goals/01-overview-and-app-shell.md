# Overview & App Shell — User Goals

## 1. Purpose

Establish how the user opens ShaderNoice, orients on the preset and layout chrome, monitors status, accesses help and errors, and (when enabled) interacts with Audiotool account linking—without prescribing internal implementation details.

## 2. User & Context

- **Who:** Anyone editing a shader composition in the browser.
- **When:** Every session—from first load until export and navigation within the shell (top bar, panels, overlays).

## 3. User Goals

- **Start from the Projects hub, then preset chrome** — Open the app onto a hub of **My projects** (browser-local), bundled presets (**Preview** vs **Use as new project**), **Start from scratch**, and **Import JSON**. WebGL/editor boot only after picking a hub action (lazy init). **`?project=<uuid>`** auto-opens when that UUID exists locally; GitHub Pages–safe SPA query parameter only (`/project/:id` deferred).
  - After entering the editor: preset picker; layout (split/full node view); bottom bar chrome. Preset dialog can include **Local projects…** to return to the hub (runtime teardown).
- **See and control viewport context** — Zoom and frame rate cues where shown; timeline/preview affordances tied to shell layout.
- **Get help and recover from errors** — Help entry when applicable; non-blocking errors and messages that do not trap core editing.
  - Errors toasts/display; shortcuts/help affordances where implemented.
- **Use the full editor without mandatory Audiotool sign-in** — When Audiotool OAuth is enabled in deployment, ShaderNoice must still allow entering the main editor via an explicit **continue without signing in** path on the splash. Audiotool is **additive**: identity and account-linked catalog features appear after sign-in, not instead of editing.
  - Splash: primary action to enter without OAuth; secondary action to **Sign in to Audiotool** (or retry when OAuth init fails).
  - Top bar: when not connected but OAuth is configured, offer **Sign in to Audiotool** after the splash is dismissed.
  - When connected: account menu (avatar/identity where available); sign-out returns to disconnected state without tearing down an already-running editor graph/runtime.
  - Copy avoids “guest” or tier framing; emphasize optional connection (see **`docs/implementation/`** when an Audiotool/OAuth spec exists).

## 4. Key Flows

- **Load app → hub → picker → edit:** Splash (branding/OAuth when configured) → optional Audiotool continue → **Projects hub** (IDB + bundled list) → user choice → preset dialog as needed → canvas and panels active.
- **Optional Audiotool:** Continue without OAuth → edit; later **Sign in to Audiotool** from splash or top bar → account chrome updates when session exists.
- **Sign out:** Disconnect Audiotool in chrome; editor stays usable.

## 5. Constraints

- Splash and OAuth redirects must remain usable without trapping the user (continue path when OAuth gate is enabled).
- WebGL and browser capabilities may limit preview/video export independently of Audiotool.
- Detailed catalog/browse behavior for Audiotool-hosted media waits on API validation (project spike notes)—not promised in shell goals beyond sign-in/offering UX.

## 6. Related

- [README index](./README.md)
- Implementation specs (optional OAuth, when tracked): [`../implementation/README.md`](../implementation/README.md)
