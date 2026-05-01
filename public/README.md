# Public Assets Folder

This folder contains static assets that are served at the root path.

## App splash logo (optional)

To show a small logo on the production intro screen, add:

- **`ShaderNoice-logo.png`** — recommended square PNG or SVG (the UI uses ~32×32 CSS pixels; a 64×64 or 128×128 source is fine).

The file is loaded from `${base}ShaderNoice-logo.png` (with Vite `base`, e.g. `/ShaderNoice/ShaderNoice-logo.png` on GitHub Pages). If the file is missing, the title and subtitle still show.

## Audio Files

Place your audio files (MP3) here to make them available to the app’s audio system.

- Audio playback, bands, and remapping are configured via the audio panel (audioSetup), not visual nodes.
- Files in this folder are served as static assets and can be referenced by `filePath` in audioSetup or playlist entries.

### Path Notes

- Files in this folder are served at the root path `/`
- If your Vite config has a `base` path (like `/ShaderNoice/`), you may need to include it in the path
- For development: use `/filename.mp3`
- For production with base path: use `/ShaderNoice/filename.mp3` or use a relative path

### Automatic Loading

Files referenced by the audio setup (e.g. playlist entries or primary source) will be loaded by the audio runtime when needed, subject to browser autoplay policies.
