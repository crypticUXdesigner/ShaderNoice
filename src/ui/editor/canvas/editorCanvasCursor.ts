/**
 * Cursor helpers for the node editor canvas and its wrapper host.
 */

import type { NodeGraph } from '../../../data-model/types';
import type { NodeSpec } from '../../../types/nodeSpec';
import type { ToolType } from '../../../types/editor';
import type { HitTestManager } from './HitTestManager';
import { getCursorForHover, type CursorHoverHits } from './handlers/MouseEventHandlerCursor';

export const EDITOR_CONNECTING_CURSOR = 'crosshair';

export interface EditorCursorHost {
  canvas: HTMLCanvasElement;
  cursorRoot?: HTMLElement | null;
}

export function applyEditorCursor(host: EditorCursorHost, cursor: string): void {
  host.canvas.style.cursor = cursor;
  if (host.cursorRoot) {
    host.cursorRoot.style.cursor = cursor;
  }
}

export function applyConnectingCursor(host: EditorCursorHost): void {
  applyEditorCursor(host, EDITOR_CONNECTING_CURSOR);
}

export interface RestoreEditorCursorDeps extends EditorCursorHost {
  hitTestManager: HitTestManager;
  graph: NodeGraph;
  nodeSpecs: Map<string, NodeSpec>;
  getActiveTool: () => ToolType;
  getIsSpacePressed: () => boolean;
  getCurrentMouse: () => { x: number; y: number };
}

export function restoreEditorCursorFromHover(deps: RestoreEditorCursorDeps): void {
  const { x: mouseX, y: mouseY } = deps.getCurrentMouse();
  const portHit = deps.hitTestManager.hitTestPort(mouseX, mouseY);
  const bezierHit = deps.hitTestManager.hitTestBezierControlPoint(mouseX, mouseY);
  const modeHit = deps.hitTestManager.hitTestParameterMode(mouseX, mouseY);
  const paramHit = deps.hitTestManager.hitTestParameter(mouseX, mouseY);
  const nodeBodyHit = !!deps.hitTestManager.hitTestNode(mouseX, mouseY);

  let isToggle = false;
  if (paramHit && !paramHit.isString && !paramHit.frequencyBand) {
    const node = deps.graph.nodes.find((n) => n.id === paramHit.nodeId);
    const spec = node ? deps.nodeSpecs.get(node.type) : undefined;
    const paramSpec = spec?.parameters[paramHit.paramName];
    isToggle = !!(paramSpec && paramSpec.type === 'int' && paramSpec.min === 0 && paramSpec.max === 1);
  }

  const hits: CursorHoverHits = {
    portHit,
    bezierHit: !!bezierHit,
    modeHit: !!modeHit,
    paramHit: paramHit
      ? {
          nodeId: paramHit.nodeId,
          paramName: paramHit.paramName,
          isString: paramHit.isString,
          frequencyBand: paramHit.frequencyBand,
          isToggle,
        }
      : null,
  };

  const cursor = getCursorForHover(
    deps.getActiveTool(),
    deps.getIsSpacePressed(),
    hits,
    false,
    nodeBodyHit
  );
  applyEditorCursor(deps, cursor);
}
