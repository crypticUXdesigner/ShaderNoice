/**
 * Re-export shim — canonical home is `src/data-model/virtualNodes.ts` (arch-perf task 08).
 * Prefer importing from `data-model` (or `data-model/virtualNodes`) in new code.
 */

export {
  VIRTUAL_NODE_PREFIX,
  isVirtualNodeId,
  getSignalIdFromVirtualNodeId,
  getVirtualNodeId,
  getNamedSignalsFromAudioSetup,
  getVirtualNodeIdsFromAudioSetup,
} from '../data-model/virtualNodes';
export type { NamedSignal } from '../data-model/virtualNodes';
