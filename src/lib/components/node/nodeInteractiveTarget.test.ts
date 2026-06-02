/** @vitest-environment happy-dom */

import { describe, expect, it } from 'vitest';
import { isNodeInteractiveTarget, isNodeLabelEditTarget } from './nodeInteractiveTarget';

describe('isNodeInteractiveTarget', () => {
  it('returns true for parameter controls', () => {
    document.body.innerHTML = `
      <div class="node">
        <button type="button" class="toggle"></button>
        <div class="enum-selector-row"><button type="button">Preset</button></div>
      </div>
    `;
    const toggle = document.querySelector('.toggle')!;
    const enumBtn = document.querySelector('.enum-selector-row button')!;
    expect(isNodeInteractiveTarget(toggle)).toBe(true);
    expect(isNodeInteractiveTarget(enumBtn)).toBe(true);
  });

  it('returns false for node chrome outside controls', () => {
    document.body.innerHTML = `
      <div class="node-body">
        <div class="param-cell"><span class="param-label">Gamma</span></div>
      </div>
    `;
    const label = document.querySelector('.param-label')!;
    expect(isNodeInteractiveTarget(label)).toBe(false);
  });
});

describe('isNodeLabelEditTarget', () => {
  it('returns true for header label chrome', () => {
    document.body.innerHTML = `
      <div class="node-header">
        <div class="label" data-node-label-edit>
          <span class="label-text">My Node</span>
          <input class="label-edit-input" />
        </div>
      </div>
    `;
    expect(isNodeInteractiveTarget(document.querySelector('.label')!)).toBe(true);
    expect(isNodeInteractiveTarget(document.querySelector('.label-text')!)).toBe(true);
    expect(isNodeLabelEditTarget(document.querySelector('.label')!)).toBe(true);
    expect(isNodeLabelEditTarget(document.querySelector('.label-text')!)).toBe(true);
    expect(isNodeLabelEditTarget(document.querySelector('.label-edit-input')!)).toBe(true);
  });

  it('returns false for parameter labels and node body', () => {
    document.body.innerHTML = `
      <div class="node-body">
        <span class="param-label">Amount</span>
      </div>
    `;
    expect(isNodeLabelEditTarget(document.querySelector('.param-label')!)).toBe(false);
  });
});
