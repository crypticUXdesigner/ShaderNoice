/**
 * Editor session semantics for bundled vs persisted projects (hub + autosave).
 */

export type ActiveSession = { kind: 'none' } | { kind: 'userProject'; projectId: string };

export type HubSelection =
  /** Open persisted local project */
  | { kind: 'userProject'; projectId: string }
  /** New empty / scratch — seeds from built-in `new` preset */
  | { kind: 'newScratch' }
  | { kind: 'forkBundledPreset'; presetName: string };

export function isUserProjectSession(s: ActiveSession): s is { kind: 'userProject'; projectId: string } {
  return s.kind === 'userProject';
}
