import { describe, expect, it } from 'vitest';
import {
  formatDriverBandSourceText,
  resolveDriverTargetDisplay,
} from './driverTargetDisplay';
import type { NodeGraph } from '../../../data-model/types';
import type { NodeSpec } from '../../../types/nodeSpec';

const graph: NodeGraph = {
  id: 'g1',
  name: 'Test',
  version: '2.0',
  nodes: [
    {
      id: 'node-1',
      type: 'transform',
      parameters: {},
      position: { x: 0, y: 0 },
      label: 'Transform',
    },
  ],
  connections: [],
  viewState: { zoom: 1, panX: 0, panY: 0, selectedNodeIds: [] },
};

const nodeSpecs = new Map<string, NodeSpec>([
  [
    'transform',
    {
      id: 'transform',
      displayName: 'Transform',
      category: 'Utilities',
      parameters: {
        scaleX: { type: 'float', label: 'Scale X', default: 1 },
      },
    } as NodeSpec,
  ],
]);

describe('resolveDriverTargetDisplay', () => {
  it('returns icon-first param label and full tooltip title', () => {
    const display = resolveDriverTargetDisplay(graph, nodeSpecs, 'node-1', 'scaleX');
    expect(display).toMatchObject({
      paramLabel: 'Scale X',
      nodeLabel: 'Transform',
      categorySlug: 'utilities',
      subgroupSlug: '',
      fullTitle: 'Transform · Scale X',
    });
    expect(display?.nodeIconIdentifier).toBeTruthy();
  });
});

describe('formatDriverBandSourceText', () => {
  it('includes band name and frequency range', () => {
    expect(
      formatDriverBandSourceText({
        id: 'b1',
        name: '01',
        sourceFileId: 'f1',
        frequencyBands: [[120, 4000]],
      })
    ).toBe('01 · 120–4000 Hz');
  });
});
