/**
 * Audio Signal Picker — slot contracts for 02A (large) and 02B (compact).
 * WP audio-signal-picker-01.
 */

import type { NodeGraph } from '../../../data-model/types';
import type { NodeSpec } from '../../../types/nodeSpec';
import type { AudioSetup } from '../../../data-model/audioSetupTypes';
import type { SignalSelectPayload } from '../../../types/editor';
import type { IAudioManager } from '../../../runtime/types';

/** Props passed to the large slot (02A). */
export interface LargeSlotProps {
  targetNodeId: string;
  targetParameter: string;
  triggerElement: HTMLElement | null;
  graph: NodeGraph;
  audioSetup: AudioSetup;
  nodeSpecs: Map<string, NodeSpec>;
  onSelect: (signal: SignalSelectPayload) => void;
  onClose: () => void;
  /** Called when bands/remappers are added or updated so parent can persist audioSetup. */
  onAudioSetupChange: (setup: AudioSetup) => void;
  /** Optional: for live spectrum and remapper value visualization in the picker. */
  getAudioManager?: () => IAudioManager | null;
  /** When opening from compact "expand to full", pre-select this band in the list. */
  initialBandId?: string | null;
  /** Register a handler to run when user presses Delete (only when focus is not in an input). */
  registerDeleteHandler?: (handler: (() => void) | null) => void;
  /**
   * Browse-only mode: opened from a global entry point (e.g. bottom-bar audio button),
   * not from a parameter port. Hides Connect actions on bands/remappers; everything
   * else (create, edit, delete) stays available.
   */
  browseOnly?: boolean;
  /** Pan/zoom node editor to a parameter port without closing the picker. */
  onRevealInNodeEditor?: (nodeId: string, paramName: string) => void;
}

/** Overview lists connectable drivers; focused edits one attached driver. */
export type DriverPanelLayoutMode = 'overview' | 'focused';

/** Props passed to the audio driver panel main column (parameter-drivers-v1 02A). */
export interface AudioDriverPanelProps {
  targetNodeId: string;
  targetParameter: string;
  graph: NodeGraph;
  audioSetup: AudioSetup;
  nodeSpecs: Map<string, NodeSpec>;
  onSelect: (signal: SignalSelectPayload) => void;
  onAudioSetupChange: (setup: AudioSetup) => void;
  /** Update graph for per-target driver Out on virtual remap connections. */
  onGraphUpdate?: (graph: NodeGraph) => void;
  getAudioManager?: () => IAudioManager | null;
  /** Pre-select / scroll to this band section when opening. */
  initialBandId?: string | null;
  /** Remapper id for scroll-to on open. */
  focusRemapperId?: string | null;
  connectionId?: string | null;
  registerDeleteHandler?: (handler: (() => void) | null) => void;
  onRevealInNodeEditor?: (nodeId: string, paramName: string) => void;
  layoutMode?: DriverPanelLayoutMode;
  /** Same handler as shell toolbar “New band” (empty-state primary CTA). */
  onNewBand?: () => void;
  /** When false, hide Connect / Disconnect actions (global library browse). */
  hasConnectTarget?: boolean;
}

/** Waveform fetcher for curve editor backgrounds (matches TimelineCurveEditor). */
export type GetWaveformData = () => Promise<{
  values: number[];
  valuesRight?: number[];
  durationSeconds: number;
}>;

/** Props for MIDI envelope driver panel content (parameter-drivers-v1 05). */
export interface MidiDriverPanelProps {
  targetNodeId: string;
  targetParameter: string;
  /** Node · param label for focused driver header. */
  parameterTitle: string;
  graph: NodeGraph;
  nodeSpecs: Map<string, NodeSpec>;
  audioSetup: AudioSetup;
  onGraphUpdate: (graph: NodeGraph) => void;
  getTimelineState?: () => import('../../../runtime/types').TimelineState | null;
  registerDeleteHandler?: (handler: (() => void) | null) => void;
  layoutMode?: DriverPanelLayoutMode;
  /** Pre-select / scroll to this envelope preset section when opening. */
  initialPresetId?: string | null;
  /** Remapper id for scroll-to on open. */
  focusRemapperId?: string | null;
  /** Overview: notify parent when the selected envelope preset in the nav list changes. */
  onSelectedPresetChange?: (presetId: string | null) => void;
  /** @deprecated Use {@link onSelectedPresetChange}. */
  onSelectedBindingChange?: (bindingId: string | null) => void;
  /** Reveal a connected parameter on the node canvas. */
  onRevealInNodeEditor?: (nodeId: string, paramName: string) => void;
  /** After Connect or New envelope attaches a driver to the target parameter. */
  onDriverAttached?: () => void;
  /** Close the driver panel after disconnecting from the target parameter. */
  onClose?: () => void;
  /** Focused layout: open overview / preset library (empty-state Browse CTA). */
  onBrowseOverview?: () => void;
  /** Fetch studio project arrangement (empty state when no snapshot yet). */
  arrangementImportBusy?: boolean;
  onImportArrangement?: () => void;
  /** When false, hide Connect actions (global library browse). */
  hasConnectTarget?: boolean;
}

/** Props for animation driver panel content (parameter-drivers-v1 02B). */
export interface AnimationDriverPanelProps {
  targetNodeId: string;
  targetParameter: string;
  /** Node · param label for focused driver header. */
  parameterTitle: string;
  graph: NodeGraph;
  nodeSpecs: Map<string, NodeSpec>;
  onGraphUpdate: (graph: NodeGraph) => void;
  getTimelineState?: () => import('../../../runtime/types').TimelineState | null;
  onSeek?: (timeSeconds: number) => void;
  getWaveformData?: GetWaveformData;
  registerDeleteHandler?: (handler: (() => void) | null) => void;
  onRevealInNodeEditor?: (nodeId: string, paramName: string) => void;
  layoutMode?: DriverPanelLayoutMode;
  /** Leave overview browse layout and return to focused curve editing. */
  onReturnToFocusedEdit?: () => void;
  /** Focused driver: advanced curve tools visibility (toolbar lives in panel header). */
  compactAdvancedOpen?: boolean;
  /** Focused driver: hide Bezier/Advanced row inside the curve editor. */
  hideCurveToolbar?: boolean;
  /** Global browse: show multi-lane timeline instead of a single-port curve editor. */
  browseMode?: boolean;
  waveformService?: import('../../../runtime/waveform').WaveformService | null;
  /** When false, hide Add animation driver (global library browse). */
  hasConnectTarget?: boolean;
}

/** Props passed to the compact slot (02B). */
export interface CompactSlotProps {
  /** Node · param label for focused driver header. */
  parameterTitle: string;
  targetNodeId: string;
  targetParameter: string;
  triggerElement: HTMLElement | null;
  graph: NodeGraph;
  audioSetup: AudioSetup;
  nodeSpecs: Map<string, NodeSpec>;
  onSelect: (signal: SignalSelectPayload) => void;
  onClose: () => void;
  /** Called when band or remapper config is edited; 02B uses for persistence. */
  onAudioSetupChange: (setup: AudioSetup) => void;
  /** Update graph for per-target driver Out on virtual remap connections. */
  onGraphUpdate?: (graph: NodeGraph) => void;
  /** Virtual node id of the connected audio signal (e.g. audio-signal:band-xyz-raw). */
  connectedVirtualNodeId: string;
  /** Signal id (e.g. band-{id}-raw, remap-{id}) so 02B can resolve band/remapper. */
  connectedSignalId: string;
  /** Connection id for disconnect. */
  connectionId: string;
  /** Optional: for live spectrum and remapper value visualization in the picker. */
  getAudioManager?: () => IAudioManager | null;
  onRevealInNodeEditor?: (nodeId: string, paramName: string) => void;
  registerDeleteHandler?: (handler: (() => void) | null) => void;
  /** Standalone audio picker: open large slot with this band selected. */
  onOpenLargeWithBand?: (bandId: string) => void;
}
