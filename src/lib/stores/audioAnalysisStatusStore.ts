import { writable } from 'svelte/store';

export type AudioAnalysisStatus =
  | { state: 'idle' }
  | { state: 'building'; progress01: number; label?: string }
  | { state: 'fallback'; label?: string }
  | { state: 'ready' }
  | { state: 'failed'; label?: string };

export const audioAnalysisStatusStore = writable<AudioAnalysisStatus>({ state: 'idle' });

