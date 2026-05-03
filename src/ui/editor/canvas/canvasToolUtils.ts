import type { ToolType } from '../../../types/editor';

/** Tools that use the same hit-tests and interactions as the cursor (including Add). */
export function isCursorLikeTool(tool: ToolType): boolean {
  return tool === 'cursor' || tool === 'add';
}
