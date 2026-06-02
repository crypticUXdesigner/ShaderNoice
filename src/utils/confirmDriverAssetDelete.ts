/**
 * Browser confirm when deleting a shared driver asset (remap or MIDI track set)
 * that is still wired to more than one parameter port.
 */
export function confirmDeleteDriverAsset(options: {
  assetKind: 'remapper' | 'envelope';
  connectionCount: number;
}): boolean {
  const { assetKind, connectionCount } = options;
  if (connectionCount <= 1) return true;

  const noun = assetKind === 'remapper' ? 'remap' : 'track set';
  const params =
    connectionCount === 2
      ? '2 parameters'
      : `${connectionCount} parameters`;

  return globalThis.confirm?.(
    `This ${noun} is connected to ${params}. Delete it and disconnect all of them?`
  ) ?? false;
}
