/**
 * Graph undo/redo helpers for the editor shell — view-state merge stays live; history is semantic-only.
 */

import type { GraphViewState, NodeGraph } from '../../data-model/types';
import type { UndoRedoManager } from '../../ui/editor';

export type LiveCanvasViewState = {
  zoom: number;
  panX: number;
  panY: number;
  selectedNodeIds: string[];
};

/**
 * Merge current pan/zoom/selection into a semantic snapshot so undo/redo never rewires the camera or selection.
 */
export function mergeLiveViewStateIntoGraph(
  semantic: NodeGraph,
  live: LiveCanvasViewState | null | undefined,
  storeViewState: GraphViewState | null | undefined
): NodeGraph {
  const vs: GraphViewState = live
    ? {
        zoom: live.zoom,
        panX: live.panX,
        panY: live.panY,
        selectedNodeIds: [...live.selectedNodeIds],
      }
    : {
        zoom: storeViewState?.zoom ?? 1,
        panX: storeViewState?.panX ?? 0,
        panY: storeViewState?.panY ?? 0,
        selectedNodeIds: [...(storeViewState?.selectedNodeIds ?? [])],
      };
  return { ...semantic, viewState: vs };
}

export interface GraphHistoryRestoreHost {
  getLiveViewState: () => LiveCanvasViewState | null | undefined;
  getStoreViewState: () => GraphViewState | null | undefined;
  beginGraphHistoryRestore: () => void;
  completeGraphHistoryRestore: (graph: NodeGraph) => void;
  clearPatchPicks: () => void;
  setGraph: (g: NodeGraph, options: { skipGraphChangedListener: true }) => void;
  getGraphAfterSet: () => NodeGraph;
  bumpLocalRevision: () => void;
  bumpUndoStackRevision: () => void;
  loadGraph: (g: NodeGraph) => Promise<void> | void;
}

/** Apply an undo/redo snapshot: live view state + store replace + runtime load. */
export async function applyGraphHistorySnapshot(
  semantic: NodeGraph,
  host: GraphHistoryRestoreHost
): Promise<void> {
  const merged = mergeLiveViewStateIntoGraph(
    semantic,
    host.getLiveViewState(),
    host.getStoreViewState()
  );
  host.beginGraphHistoryRestore();
  try {
    host.clearPatchPicks();
    host.setGraph(merged, { skipGraphChangedListener: true });
    host.bumpLocalRevision();
    await host.loadGraph(merged);
  } finally {
    host.bumpUndoStackRevision();
    host.completeGraphHistoryRestore(host.getGraphAfterSet());
  }
}

export async function performGraphUndo(deps: {
  undoRedoManager: UndoRedoManager | null | undefined;
  host: GraphHistoryRestoreHost;
  /** When false (e.g. no runtime), no-op — matches App.svelte. */
  canApply: boolean;
}): Promise<void> {
  if (!deps.canApply || !deps.undoRedoManager) return;
  const g = deps.undoRedoManager.undo();
  if (!g) return;
  await applyGraphHistorySnapshot(g, deps.host);
}

export async function performGraphRedo(deps: {
  undoRedoManager: UndoRedoManager | null | undefined;
  host: GraphHistoryRestoreHost;
  canApply: boolean;
}): Promise<void> {
  if (!deps.canApply || !deps.undoRedoManager) return;
  const g = deps.undoRedoManager.redo();
  if (!g) return;
  await applyGraphHistorySnapshot(g, deps.host);
}
