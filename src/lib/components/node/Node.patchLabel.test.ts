/** @vitest-environment happy-dom */

import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, unmount } from 'svelte';
import Node from './Node.svelte';
import { nodeSystemSpecs } from '../../../shaders/nodes';
import type { NodeGraph } from '../../../data-model/types';

const transformSpec = nodeSystemSpecs.find((s) => s.id === 'transform')!;

function makeGraph(): NodeGraph {
  return {
    nodes: [
      {
        id: 'n1',
        type: 'transform',
        position: { x: 0, y: 0 },
        parameters: {},
      },
    ],
    connections: [],
    viewState: { zoom: 1, panX: 0, panY: 0, selectedNodeIds: [] },
  };
}

const metrics = {
  width: 200,
  height: 120,
  headerHeight: 88,
  inputPortPositions: new Map(),
  outputPortPositions: new Map(),
};

function mountNode(onPatchIntoDoubleClick = vi.fn(), onDrag = vi.fn()) {
  const target = document.createElement('div');
  document.body.appendChild(target);
  const instance = mount(Node, {
    target,
    props: {
      nodeId: 'n1',
      node: makeGraph().nodes[0],
      spec: transformSpec,
      metrics,
      selected: false,
      graph: makeGraph(),
      audioSetup: { files: [], bands: [], remappers: [] },
      nodeSpecs: new Map([[transformSpec.id, transformSpec]]),
      nodePosition: { x: 0, y: 0 },
      onDrag,
      onSelect: () => {},
      onLabelChange: () => {},
      onParameterChange: () => {},
      onPatchIntoDoubleClick,
    },
  });
  return { target, instance, onPatchIntoDoubleClick, onDrag };
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('Node — label double-click vs patch-into', () => {
  it('double-clicking header label edits inline and does not start patch tool', async () => {
    const user = userEvent.setup();
    const { target, instance, onPatchIntoDoubleClick } = mountNode();

    const labelText = target.querySelector('.label-text') as HTMLElement;
    expect(labelText).toBeTruthy();

    await user.dblClick(labelText);

    expect(onPatchIntoDoubleClick).not.toHaveBeenCalled();
    expect(target.querySelector('.label-edit-input')).toBeTruthy();

    unmount(instance);
  });

  it('does not start patch when second click lands on drag-area beside label text', async () => {
    const onPatchIntoDoubleClick = vi.fn();
    const { target, instance } = mountNode(onPatchIntoDoubleClick);
    const labelText = target.querySelector('.label-text') as HTMLElement;
    const dragArea = target.querySelector('.drag-area') as HTMLElement;
    expect(labelText).toBeTruthy();
    expect(dragArea).toBeTruthy();

    labelText.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 }));
    dragArea.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, clientX: 10, clientY: 10, detail: 2 })
    );

    expect(onPatchIntoDoubleClick).not.toHaveBeenCalled();

    unmount(instance);
  });

  it('does not start patch after label pointerdown + paired clicks (no pointer capture regression)', () => {
    const onPatchIntoDoubleClick = vi.fn();
    const onDrag = vi.fn();
    const { target, instance } = mountNode(onPatchIntoDoubleClick, onDrag);
    const label = target.querySelector('[data-node-label-edit]') as HTMLElement;
    const labelText = target.querySelector('.label-text') as HTMLElement;
    expect(label).toBeTruthy();

    const pointerOpts = { bubbles: true, cancelable: true, clientX: 50, clientY: 50, pointerId: 1, pointerType: 'mouse', button: 0, buttons: 1 };
    label.dispatchEvent(new PointerEvent('pointerdown', pointerOpts));
    label.dispatchEvent(new PointerEvent('pointerup', { ...pointerOpts, buttons: 0 }));
    labelText.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: 50, clientY: 50 }));

    label.dispatchEvent(new PointerEvent('pointerdown', pointerOpts));
    label.dispatchEvent(new PointerEvent('pointerup', { ...pointerOpts, buttons: 0 }));
    // Without immediate pointer capture, the second click stays on the label (not retargeted to drag-area).
    labelText.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: 50, clientY: 50 }));

    expect(onPatchIntoDoubleClick).not.toHaveBeenCalled();
    expect(onDrag).toHaveBeenCalledTimes(2);

    unmount(instance);
  });

  it('pointerdown on header label arms potential drag', () => {
    const onDrag = vi.fn();
    const { target, instance } = mountNode(vi.fn(), onDrag);
    const labelText = target.querySelector('.label-text') as HTMLElement;
    expect(labelText).toBeTruthy();

    labelText.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        clientX: 40,
        clientY: 40,
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
        buttons: 1,
      })
    );

    expect(onDrag).toHaveBeenCalledOnce();
    expect(onDrag).toHaveBeenCalledWith('n1', 40, 40, false);

    unmount(instance);
  });

  it('double-clicking node body (outside label) starts patch tool', async () => {
    const user = userEvent.setup();
    const { target, instance, onPatchIntoDoubleClick } = mountNode();

    const body = target.querySelector('.node-body') as HTMLElement;
    expect(body).toBeTruthy();

    await user.dblClick(body);

    expect(onPatchIntoDoubleClick).toHaveBeenCalledOnce();
    expect(onPatchIntoDoubleClick).toHaveBeenCalledWith('n1');

    unmount(instance);
  });
});
