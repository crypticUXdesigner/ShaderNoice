import { describe, expect, it } from 'vitest';
import { getParameterEnumMappings } from './parameterEnumMappings';

describe('getParameterEnumMappings', () => {
  it('maps path-drive pathPreset to path labels', () => {
    const m = getParameterEnumMappings('path-drive', 'pathPreset');
    expect(m?.[0]).toBe('Orbit');
    expect(m?.[4]).toBe('Line');
    expect(m?.[5]).toBeUndefined();
  });

  it('maps oscillator-2d layerCombine to merge mode labels', () => {
    const m = getParameterEnumMappings('oscillator-2d', 'layerCombine');
    expect(m).not.toBeNull();
    expect(m![0]).toBe('Sum');
    expect(m![1]).toBe('Normalized');
    expect(m![2]).toBe('Product');
    expect(m![3]).toBe('Max |·|');
  });

  it('maps triangle-grid triProjection to UV / infinite plane labels', () => {
    const m = getParameterEnumMappings('triangle-grid', 'triProjection');
    expect(m).not.toBeNull();
    expect(m![0]).toBe('Infinite plane');
    expect(m![1]).toBe('UV');
  });

  it('maps radial-uv-warp warpMode to mode labels', () => {
    const m = getParameterEnumMappings('radial-uv-warp', 'warpMode');
    expect(m).not.toBeNull();
    expect(m![0]).toBe('Bulge / pinch');
    expect(m![1]).toBe('Fisheye');
    expect(m![2]).toBe('Spherize');
  });

  it('maps displace displaceMode to vector vs directional labels', () => {
    const m = getParameterEnumMappings('displace', 'displaceMode');
    expect(m).not.toBeNull();
    expect(m![0]).toBe('Vector offset');
    expect(m![1]).toBe('Directional');
  });

  it('maps velocity-spark-grid shape, blend, and decay curve labels', () => {
    expect(getParameterEnumMappings('velocity-spark-grid', 'shape')?.[0]).toBe('Dot');
    expect(getParameterEnumMappings('velocity-spark-grid', 'shape')?.[1]).toBe('Cell');
    expect(getParameterEnumMappings('velocity-spark-grid', 'blendMode')?.[1]).toBe('Add');
    expect(getParameterEnumMappings('velocity-spark-grid', 'decayCurve')?.[0]).toBe('Exp');
  });

  it('maps note-gravity-warp blend and decay curve labels', () => {
    expect(getParameterEnumMappings('note-gravity-warp', 'decayCurve')?.[0]).toBe('Exp');
    expect(getParameterEnumMappings('note-gravity-warp', 'decayCurve')?.[1]).toBe('Linear');
    expect(getParameterEnumMappings('note-gravity-warp', 'blendMode')?.[0]).toBe('Sum');
    expect(getParameterEnumMappings('note-gravity-warp', 'blendMode')?.[1]).toBe('Max');
    expect(getParameterEnumMappings('note-gravity-warp', 'blendMode')?.[2]).toBe('Avg');
  });

  it('maps infinite-zoom infiniteZoomMotion to ping-pong vs snap labels', () => {
    const m = getParameterEnumMappings('infinite-zoom', 'infiniteZoomMotion');
    expect(m).not.toBeNull();
    expect(m![0]).toBe('Ping-pong loop');
    expect(m![1]).toBe('Snap zoom in');
    expect(m![2]).toBe('Snap zoom out');
  });

  it('maps uv-band-shift orientation to horizontal vs vertical labels', () => {
    const m = getParameterEnumMappings('uv-band-shift', 'uvBandShiftOrientation');
    expect(m).not.toBeNull();
    expect(m![0]).toBe('Horizontal');
    expect(m![1]).toBe('Vertical');
  });

  it('maps fractal fractalMode to pattern labels', () => {
    const m = getParameterEnumMappings('fractal', 'fractalMode');
    expect(m).not.toBeNull();
    expect(m![0]).toBe('KIFS');
    expect(m![3]).toBe('Escape');
    expect(m![5]).toBe('Min distance');
    expect(m![6]).toBe('Newton');
    expect(m![7]).toBe('Lyapunov');
    expect(m![8]).toBe('Shape Julia');
    expect(m![9]).toBeUndefined();
  });

  it('maps fractal portal enable enum', () => {
    const m = getParameterEnumMappings('fractal', 'fractalPortalEnable');
    expect(m).not.toBeNull();
    expect(m![0]).toBe('Off');
    expect(m![1]).toBe('On');
  });

  it('maps fractal escape family and coloring enums', () => {
    const family = getParameterEnumMappings('fractal', 'fractalEscapeFamily');
    expect(family).not.toBeNull();
    expect(family![0]).toBe('Julia');
    expect(family![1]).toBe('Mandelbrot');
    expect(family![2]).toBe('Burning Ship');
    const coloring = getParameterEnumMappings('fractal', 'fractalColoring');
    expect(coloring).not.toBeNull();
    expect(coloring![0]).toBe('Iteration');
    expect(coloring![1]).toBe('Smooth');
    expect(coloring![2]).toBe('Distance');
  });

  it('maps fractal trap shape enums', () => {
    const m = getParameterEnumMappings('fractal', 'fractalTrapShape');
    expect(m).not.toBeNull();
    expect(m![0]).toBe('Ring');
    expect(m![1]).toBe('Line');
    expect(m![2]).toBe('Cross');
    expect(m![3]).toBe('Spiral');
    expect(m![4]).toBe('Multi');
    expect(m![5]).toBeUndefined();
  });

  it('maps color-lut preset to curated LUT labels', () => {
    const m = getParameterEnumMappings('color-lut', 'preset');
    expect(m).not.toBeNull();
    expect(m![0]).toBe('Viridis');
    expect(m![5]).toBe('Turbo');
    expect(m![11]).toBe('Night');
  });

  it('maps color-gradient gradientMode to Radial / Linear', () => {
    const m = getParameterEnumMappings('color-gradient', 'gradientMode');
    expect(m).not.toBeNull();
    expect(m![0]).toBe('Radial');
    expect(m![1]).toBe('Linear');
  });

  it('maps bloom-sphere mode to lattice vs legacy bloom labels', () => {
    const m = getParameterEnumMappings('bloom-sphere', 'mode');
    expect(m).not.toBeNull();
    expect(m![0]).toBe('Lattice Glow');
    expect(m![1]).toBe('Legacy Bloom');
  });
});
