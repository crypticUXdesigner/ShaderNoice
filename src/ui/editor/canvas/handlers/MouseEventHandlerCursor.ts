/**
 * Cursor selection for mouse hover state in the node editor.
 * Used by MouseEventHandler during handleMouseMove.
 */

import type { ToolType } from '../../../../types/editor';
import { getAddToolAltCursorValue } from '../addToolCursor';

export interface CursorHoverHits {
  paramHit: {
    nodeId: string;
    paramName: string;
    isString?: boolean;
    frequencyBand?: { field: 'start' | 'end' | 'sliderLow' | 'sliderHigh' };
    isToggle?: boolean;
  } | null;
  portHit: { nodeId: string; port: string; isOutput: boolean; parameter?: string } | null;
  bezierHit: boolean;
  modeHit: boolean;
}

/**
 * Returns the canvas cursor string for the current hover state (tool, space, hits).
 * @param nodeBodyHit — true when the pointer is over a node's body (not necessarily a port/param).
 *   Used so Alt+Cursor shows the add-node cursor only on empty canvas, not over nodes.
 */
export function getCursorForHover(
  activeTool: ToolType,
  isSpacePressed: boolean,
  hits: CursorHoverHits,
  altKey = false,
  nodeBodyHit = false
): string {
  if (hits.bezierHit) return 'move';
  if (hits.modeHit) return 'pointer';
  if (hits.portHit) return 'crosshair';
  if (hits.paramHit) {
    if (hits.paramHit.isString) return 'pointer';
    if (hits.paramHit.isToggle) return 'pointer';
    if (hits.paramHit.frequencyBand) {
      const f = hits.paramHit.frequencyBand.field;
      return f === 'sliderLow' || f === 'sliderHigh' ? 'ew-resize' : 'default';
    }
    return 'ns-resize'; // float/int slider
  }
  if (activeTool === 'hand') return 'grab';
  if (activeTool === 'select') return 'crosshair';
  if (activeTool === 'add') {
    return getAddToolAltCursorValue();
  }
  if (activeTool === 'cursor' && altKey && !nodeBodyHit) {
    return getAddToolAltCursorValue();
  }
  if (isSpacePressed) return 'grab';
  return 'default';
}
