import { describe, it, expect } from 'vitest';

import {

  applyConnectionRemapperOut,

  applyDriverGate,

  applyDriverRemap,

  applyDriverTargetRange,

  buildRemapperTargetOutExpression,

  connectionDriverOutPatchFromUi,

  defaultDriverRemapOutForParam,

  resolveDriverTargetOutUiBounds,

  resolveDriverTargetOutUiStepAndDecimals,

} from './driverRemap';

import { updateConnectionDriverOut } from '../data-model/immutableUpdates';

import type { NodeGraph } from '../data-model/types';

import type { ParameterSpec } from '../types/nodeSpec';



function graphWithDriverOut(
  out: { driverOutMin?: number; driverOutMax?: number } = {}
): NodeGraph {
  return {
    id: 'graph-test',
    name: 'Test',
    version: '2.0',
    nodes: [{ id: 'n1', type: 'test', parameters: {}, position: { x: 0, y: 0 } }],
    connections: [
      {
        id: 'conn-1',
        sourceNodeId: 'remap-r1',
        targetNodeId: 'n1',
        targetParameter: 'amount',
        ...out,
      },
    ],
    viewState: { zoom: 1, panX: 0, panY: 0, selectedNodeIds: [] },
  };
}



describe('connectionDriverOutPatchFromUi', () => {
  it('maps UI outMin/outMax to connection driverOutMin/driverOutMax', () => {
    expect(connectionDriverOutPatchFromUi({ outMin: -0.5, outMax: 4 })).toEqual({
      driverOutMin: -0.5,
      driverOutMax: 4,
    });
    expect(connectionDriverOutPatchFromUi({ outMin: 2 })).toEqual({ driverOutMin: 2 });
    expect(connectionDriverOutPatchFromUi({ outMax: 10 })).toEqual({ driverOutMax: 10 });
  });
});

describe('updateConnectionDriverOut with UI adapter', () => {
  it('persists Out edits when UI patch is mapped through the adapter', () => {
    const graph = graphWithDriverOut({ driverOutMin: 0, driverOutMax: 1 });
    const next = updateConnectionDriverOut(
      graph,
      'conn-1',
      connectionDriverOutPatchFromUi({ outMin: -0.5, outMax: 4 })
    );
    expect(next.connections[0]).toMatchObject({ driverOutMin: -0.5, driverOutMax: 4 });
    expect(next).not.toBe(graph);
  });

  it('ignores wrong-key UI patch passed directly (shipped noop regression)', () => {
    const graph = graphWithDriverOut({ driverOutMin: 0, driverOutMax: 1 });
    const next = updateConnectionDriverOut(graph, 'conn-1', {
      outMin: 5,
    } as Partial<{ driverOutMin: number; driverOutMax: number }>);
    expect(next).toBe(graph);
    expect(next.connections[0]).toMatchObject({ driverOutMin: 0, driverOutMax: 1 });
  });
});

describe('resolveDriverTargetOutUiStepAndDecimals', () => {
  it('matches node body int/float step and decimals rules', () => {
    expect(resolveDriverTargetOutUiStepAndDecimals('int', 2)).toEqual({ step: 2, decimals: 0 });
    expect(resolveDriverTargetOutUiStepAndDecimals('float', 0.01)).toEqual({
      step: 0.01,
      decimals: 3,
    });
    expect(resolveDriverTargetOutUiStepAndDecimals('float', 1)).toEqual({ step: 1, decimals: 0 });
    expect(resolveDriverTargetOutUiStepAndDecimals(undefined, undefined)).toEqual({
      step: 0.01,
      decimals: 3,
    });
  });
});

describe('resolveDriverTargetOutUiBounds', () => {
  it('uses parameter spec min and max when finite', () => {
    expect(resolveDriverTargetOutUiBounds(-0.5, 4)).toEqual({ min: -0.5, max: 4 });
  });

  it('normalizes inverted spec bounds', () => {
    expect(resolveDriverTargetOutUiBounds(4, -0.5)).toEqual({ min: -0.5, max: 4 });
  });

  it('falls back to wide bounds when spec range is open', () => {
    expect(resolveDriverTargetOutUiBounds(undefined, 4)).toEqual({ min: -9999, max: 9999 });
    expect(resolveDriverTargetOutUiBounds(0, undefined)).toEqual({ min: -9999, max: 9999 });
  });
});

describe('defaultDriverRemapOutForParam', () => {

  it('uses parameter spec min and max when finite', () => {

    const spec = { type: 'float', default: 0, min: -0.5, max: 4 } as ParameterSpec;

    expect(defaultDriverRemapOutForParam(spec)).toEqual({ outMin: -0.5, outMax: 4 });

  });



  it('falls back to 0–1 when spec range is open', () => {

    expect(defaultDriverRemapOutForParam(undefined)).toEqual({ outMin: 0, outMax: 1 });

  });

});



describe('applyDriverGate', () => {

  it('normalizes through in gate to 0–1', () => {

    expect(applyDriverGate(0.5, 0, 1)).toBe(0.5);

    expect(applyDriverGate(0.1, 0.3, 1)).toBe(0);

    expect(applyDriverGate(0.9, 0, 0.5)).toBe(1);

  });

});



describe('applyDriverTargetRange', () => {

  it('lerps gated value to parameter units', () => {

    expect(applyDriverTargetRange(0.5, -0.5, 4)).toBe(1.75);

    expect(applyDriverTargetRange(0, 0, 10)).toBe(0);

    expect(applyDriverTargetRange(1, 0, 10)).toBe(10);

  });

});



describe('applyDriverRemap', () => {

  it('gates then maps to asymmetric out range', () => {

    expect(applyDriverRemap(0.5, 0, 1, -0.5, 4)).toBe(1.75);

    expect(applyDriverRemap(0, 0, 1, -0.5, 4)).toBe(-0.5);

    expect(applyDriverRemap(1, 0, 1, -0.5, 4)).toBe(4);

  });



  it('clamps below in gate to outMin', () => {

    expect(applyDriverRemap(0.1, 0.3, 1, 0, 10)).toBe(0);

  });



  it('clamps above in gate to outMax', () => {

    expect(applyDriverRemap(0.9, 0, 0.5, 0, 10)).toBe(10);

  });



  it('treats zero in range as gate at 0 (outMin)', () => {

    expect(applyDriverRemap(0.5, 1, 1, -0.5, 4)).toBe(-0.5);

  });



  it('returns midpoint when level is nullish', () => {

    expect(applyDriverRemap(null, 0, 1, -0.5, 4)).toBe(1.75);

    expect(applyDriverRemap(undefined, 0, 1, 0, 10)).toBe(5);

  });



  it('supports inverted out range (outMin > outMax)', () => {

    expect(applyDriverRemap(0, 0, 1, 0, -1)).toBe(0);

    expect(applyDriverRemap(1, 0, 1, 0, -1)).toBe(-1);

    expect(applyDriverRemap(0.5, 0, 1, 0, -1)).toBe(-0.5);

  });

});

describe('applyConnectionRemapperOut', () => {
  it('applies connection Out for remap-* signals only', () => {
    expect(
      applyConnectionRemapperOut(
        { driverOutMin: 0, driverOutMax: 1.6 },
        0.5,
        'remap-r1'
      )
    ).toBeCloseTo(0.8);
    expect(
      applyConnectionRemapperOut(
        { driverOutMin: 0, driverOutMax: 100 },
        0.5,
        'remap-r1'
      )
    ).toBeCloseTo(50);
    expect(
      applyConnectionRemapperOut(
        { driverOutMin: 0, driverOutMax: 100 },
        0.5,
        'band-1-raw'
      )
    ).toBe(0.5);
  });
});

describe('buildRemapperTargetOutExpression', () => {
  const fmt = (v: number) => (Number.isInteger(v) ? `${v}.0` : String(v));

  it('bakes per-connection Out constants for remap signals', () => {
    expect(
      buildRemapperTargetOutExpression('uGate', { driverOutMin: 0, driverOutMax: 1.6 }, 'remap-r1', fmt)
    ).toBe('((uGate) * 1.6 + 0.0)');
    expect(
      buildRemapperTargetOutExpression('uGate', { driverOutMin: 0, driverOutMax: 100 }, 'remap-r1', fmt)
    ).toBe('((uGate) * 100.0 + 0.0)');
  });

  it('passes through gated expr for non-remap signals and default 0–1 Out', () => {
    expect(
      buildRemapperTargetOutExpression('uBand', { driverOutMin: 0, driverOutMax: 100 }, 'band-1-raw', fmt)
    ).toBe('uBand');
    expect(
      buildRemapperTargetOutExpression('uGate', { driverOutMin: 0, driverOutMax: 1 }, 'remap-r1', fmt)
    ).toBe('uGate');
  });

  it('supports inverted Out ranges', () => {
    expect(
      buildRemapperTargetOutExpression('uGate', { driverOutMin: -0.22, driverOutMax: -1 }, 'remap-r1', fmt)
    ).toBe('((uGate) * -0.78 + -0.22)');
  });
});
