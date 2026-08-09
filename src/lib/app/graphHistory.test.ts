import { describe, it, expect, vi } from 'vitest';
import type { NodeGraph } from '../../data-model/types';
import { UndoRedoManager } from '../../ui/editor';
import {
  mergeLiveViewStateIntoGraph,
  applyGraphHistorySnapshot,
  performGraphUndo,
  performGraphRedo,
  type GraphHistoryRestoreHost,
} from './graphHistory';

function emptyGraph(overrides?: Partial<NodeGraph>): NodeGraph {
  return {
    id: 'g1',
    nodes: [],
    connections: [],
    viewState: { zoom: 1, panX: 0, panY: 0, selectedNodeIds: [] },
    ...overrides,
  };
}

describe('mergeLiveViewStateIntoGraph', () => {
  it('prefers live canvas view state over store', () => {
    const semantic = emptyGraph({
      viewState: { zoom: 2, panX: 10, panY: 20, selectedNodeIds: ['a'] },
    });
    const merged = mergeLiveViewStateIntoGraph(
      semantic,
      { zoom: 3, panX: 1, panY: 2, selectedNodeIds: ['b'] },
      { zoom: 9, panX: 9, panY: 9, selectedNodeIds: ['c'] }
    );
    expect(merged.viewState).toEqual({
      zoom: 3,
      panX: 1,
      panY: 2,
      selectedNodeIds: ['b'],
    });
    expect(merged.viewState?.selectedNodeIds).not.toBe(
      semantic.viewState?.selectedNodeIds
    );
  });

  it('falls back to store view state when live is missing', () => {
    const semantic = emptyGraph({ viewState: undefined });
    const merged = mergeLiveViewStateIntoGraph(semantic, null, {
      zoom: 1.5,
      panX: 4,
      panY: 5,
      selectedNodeIds: ['n'],
    });
    expect(merged.viewState).toEqual({
      zoom: 1.5,
      panX: 4,
      panY: 5,
      selectedNodeIds: ['n'],
    });
  });
});

describe('applyGraphHistorySnapshot / undo / redo', () => {
  function makeHost(initial: NodeGraph): GraphHistoryRestoreHost & { graph: NodeGraph } {
    const host = {
      graph: initial,
      getLiveViewState: () => ({ zoom: 2, panX: 0, panY: 0, selectedNodeIds: [] as string[] }),
      getStoreViewState: () => initial.viewState,
      beginGraphHistoryRestore: vi.fn(),
      completeGraphHistoryRestore: vi.fn(),
      clearPatchPicks: vi.fn(),
      setGraph: vi.fn((g: NodeGraph) => {
        host.graph = g;
      }),
      getGraphAfterSet: () => host.graph,
      bumpLocalRevision: vi.fn(),
      bumpUndoStackRevision: vi.fn(),
      loadGraph: vi.fn(async () => {}),
    };
    return host;
  }

  it('applies merged graph and bumps revisions', async () => {
    const host = makeHost(emptyGraph());
    const snapshot = emptyGraph({ id: 'snap' });
    await applyGraphHistorySnapshot(snapshot, host);
    expect(host.beginGraphHistoryRestore).toHaveBeenCalledOnce();
    expect(host.clearPatchPicks).toHaveBeenCalledOnce();
    expect(host.setGraph).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'snap', viewState: expect.objectContaining({ zoom: 2 }) }),
      { skipGraphChangedListener: true }
    );
    expect(host.bumpLocalRevision).toHaveBeenCalledOnce();
    expect(host.loadGraph).toHaveBeenCalledOnce();
    expect(host.bumpUndoStackRevision).toHaveBeenCalledOnce();
    expect(host.completeGraphHistoryRestore).toHaveBeenCalledWith(host.graph);
  });

  it('performGraphUndo/Redo respect canApply and empty history', async () => {
    const mgr = new UndoRedoManager();
    const host = makeHost(emptyGraph());
    await performGraphUndo({ undoRedoManager: mgr, host, canApply: true });
    expect(host.setGraph).not.toHaveBeenCalled();

    mgr.pushState(emptyGraph({ id: 'a' }));
    mgr.pushState(emptyGraph({ id: 'b' }));
    await performGraphUndo({ undoRedoManager: mgr, host, canApply: false });
    expect(host.setGraph).not.toHaveBeenCalled();

    await performGraphUndo({ undoRedoManager: mgr, host, canApply: true });
    expect(host.setGraph).toHaveBeenCalled();
    const afterUndoId = (host.setGraph as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[0]?.id;
    expect(afterUndoId).toBe('a');

    await performGraphRedo({ undoRedoManager: mgr, host, canApply: true });
    const afterRedoId = (host.setGraph as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[0]?.id;
    expect(afterRedoId).toBe('b');
  });
});
