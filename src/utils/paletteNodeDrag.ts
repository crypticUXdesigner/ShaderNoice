/**
 * HTML5 drag payload for adding a node type from the side panel onto the canvas.
 * Custom MIME distinguishes palette drags from arbitrary text/file drags during dragover.
 */

export const PALETTE_NODE_DRAG_MIME = 'application/x-shadernoice-node';

function iterateTransferTypes(types: DataTransfer['types']): string[] {
  const out: string[] = [];
  const list = types as readonly string[] & { item?: (i: number) => string | null };
  for (let i = 0; i < types.length; i++) {
    const t = typeof list.item === 'function' ? list.item(i) : list[i];
    if (t) out.push(t);
  }
  return out;
}

/** True when this drag was started from the node palette (custom MIME present). */
export function hasPaletteNodeMime(dt: DataTransfer | null): boolean {
  if (!dt) return false;
  const mime = PALETTE_NODE_DRAG_MIME.toLowerCase();
  for (const t of iterateTransferTypes(dt.types)) {
    if (t === PALETTE_NODE_DRAG_MIME || t.toLowerCase() === mime) return true;
  }
  return false;
}

/** Node type id from palette drag (MIME preferred; text/plain fallback). */
export function readPaletteNodeType(dt: DataTransfer | null): string | null {
  if (!dt) return null;
  const fromMime = dt.getData(PALETTE_NODE_DRAG_MIME);
  if (fromMime) return fromMime.trim();
  const plain = dt.getData('text/plain');
  if (plain) return plain.trim();
  return null;
}
