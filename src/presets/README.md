# Presets

This directory contains preset files for the node-based shader system.

## Creating a Preset

1. Use the download button (top bar, title "Download graph as JSON") to save your current graph as a `.json` file
2. Move or copy that file into this directory (or create a new `.json` file here with the same content)
3. The preset will automatically appear in the preset dropdown after rebuild

## Preset Format

Presets must follow the `SerializedGraphFile` format:

```json
{
  "format": "shadernoice-node-graph",
  "formatVersion": "2.0",
  "graph": {
    "id": "graph-...",
    "name": "Preset Name",
    "version": "2.0",
    "nodes": [...],
    "connections": [...],
    "viewState": {
      "zoom": 1.0,
      "panX": 0,
      "panY": 0,
      "selectedNodeIds": []
    }
  },
  "audioSetup": {
    "files": [...],
    "bands": [...],
    "remappers": [...]
  }
}
```

The `audioSetup` field is optional. When present, it stores the audio configuration (files, bands, remappers). Downloading the graph as JSON includes it automatically. Add an audio file via the bottom bar Upload button.

## Naming

Preset filenames should be descriptive and use kebab-case (e.g., `sphere-shader.json`, `colorful-noise.json`).

The display name in the UI will automatically convert kebab-case to Title Case (e.g., `sphere-shader` → "Sphere Shader").
