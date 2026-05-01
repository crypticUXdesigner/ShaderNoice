import { describe, it } from 'vitest';
import { deserializeGraph } from './serialization';
import { ensureBandSmoothingHalfLife } from './audioSmoothingMigration';
import type { AudioSetup } from './audioSetupTypes';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(
      `Assertion failed: ${message || 'Values not equal'}\n  Expected: ${expected}\n  Actual: ${actual}`
    );
  }
}

describe('audio smoothing migration', () => {
  it('deserializeGraph ensures smoothingHalfLifeSeconds exists for bands', () => {
    const json = `{
      "format": "shadernoice-node-graph",
      "formatVersion": "2.0",
      "graph": { "id": "g1", "name": "Test", "version": "2.0", "nodes": [], "connections": [] },
      "audioSetup": {
        "files": [{ "id": "f1", "name": "File", "autoPlay": false }],
        "bands": [
          { "id": "b1", "name": "Band", "sourceFileId": "f1", "frequencyBands": [[20, 20000]], "fftSize": 2048 }
        ],
        "remappers": []
      }
    }`;

    const result = deserializeGraph(json, []);
    assert(result.errors.length === 0, 'deserializeGraph should not error');
    assert(result.audioSetup != null, 'audioSetup should exist');
    const band = result.audioSetup!.bands[0]!;
    assert(band.smoothingHalfLifeSeconds != null, 'smoothingHalfLifeSeconds should be added');
    assert(Number.isFinite(band.smoothingHalfLifeSeconds!), 'smoothingHalfLifeSeconds should be finite');
  });

  it('ensureBandSmoothingHalfLife sets a stable default', () => {
    const base: AudioSetup = {
      files: [{ id: 'f1', name: 'File', autoPlay: false }],
      bands: [
        { id: 'b0', name: 'B0', sourceFileId: 'f1', frequencyBands: [[20, 20000]], fftSize: 2048 },
        { id: 'b1', name: 'B1', sourceFileId: 'f1', frequencyBands: [[20, 20000]], fftSize: 2048 },
      ],
      remappers: [],
    };

    const migrated = ensureBandSmoothingHalfLife(base);
    assertEqual(migrated.bands.length, 2, 'band count should be unchanged');

    const half0 = migrated.bands[0]!.smoothingHalfLifeSeconds!;
    const half1 = migrated.bands[1]!.smoothingHalfLifeSeconds!;

    assertEqual(half0, 1 / 120, 'default half-life should be 1/120s');
    assertEqual(half1, 1 / 120, 'default half-life should be 1/120s');
  });

  it('ensureBandSmoothingHalfLife is idempotent', () => {
    const setup: AudioSetup = {
      files: [{ id: 'f1', name: 'File', autoPlay: false }],
      bands: [
        { id: 'b', name: 'B', sourceFileId: 'f1', frequencyBands: [[20, 20000]], smoothingHalfLifeSeconds: 0.123, fftSize: 2048 },
      ],
      remappers: [],
    };
    const migrated = ensureBandSmoothingHalfLife(setup);
    assertEqual(migrated, setup, 'should be noop when half-life already set');
  });
});

