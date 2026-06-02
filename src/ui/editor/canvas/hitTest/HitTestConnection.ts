/**
 * Connection hit testing and bezier curve helpers.
 */

import type { HitTestContext } from './HitTestContext';
import { isPointNearConnectionBezier } from '../../connectionBezier';

export function hitTestConnection(ctx: HitTestContext, mouseX: number, mouseY: number): string | null {
  const rect = ctx.getConnectionHitTestRect?.() ?? ctx.canvas.getBoundingClientRect();
  const canvasPos = ctx.viewStateManager.screenToCanvas(mouseX, mouseY, rect);
  const viewState = ctx.getViewState();
  const hitThreshold = 24 / viewState.zoom;

  for (const conn of ctx.graph.connections) {
    const sourceNode = ctx.graph.nodes.find(n => n.id === conn.sourceNodeId);
    const targetNode = ctx.graph.nodes.find(n => n.id === conn.targetNodeId);
    if (!sourceNode || !targetNode) continue;

    const sourceSpec = ctx.nodeSpecs.get(sourceNode.type);
    const targetSpec = ctx.nodeSpecs.get(targetNode.type);
    const sourceMetrics = ctx.nodeMetrics.get(sourceNode.id);
    const targetMetrics = ctx.nodeMetrics.get(targetNode.id);
    if (!sourceSpec || !targetSpec || !sourceMetrics || !targetMetrics) continue;

    let sourcePortPos: { x: number; y: number } | undefined;
    if (conn.targetParameter) {
      const headerKey = `${conn.sourceNodeId}:output:${conn.sourcePort}`;
      sourcePortPos = ctx.getHeaderOutputPortPositionsFromDOM?.().get(headerKey);
    }
    sourcePortPos ??= sourceMetrics.portPositions.get(`output:${conn.sourcePort}`);

    let targetPortPos: { x: number; y: number } | undefined;
    if (conn.targetParameter) {
      const domKey = `${conn.targetNodeId}:${conn.targetParameter}`;
      targetPortPos = ctx.getParamPortPositionsFromDOM?.().get(domKey) ?? targetMetrics.parameterInputPortPositions.get(conn.targetParameter);
    } else {
      targetPortPos = targetMetrics.portPositions.get(`input:${conn.targetPort}`);
    }

    if (!sourcePortPos || !targetPortPos) continue;

    if (
      isPointNearConnectionBezier(
        canvasPos.x,
        canvasPos.y,
        sourcePortPos,
        targetPortPos,
        hitThreshold
      )
    ) {
      return conn.id;
    }
  }
  return null;
}
