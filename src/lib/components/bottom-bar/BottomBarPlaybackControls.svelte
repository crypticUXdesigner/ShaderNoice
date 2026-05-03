<script lang="ts">
  /**
   * BottomBarPlaybackControls - Play/pause, loop, and load-track dialog for the bottom bar.
   */
  import { Button, ButtonGroup, IconSvg } from '../ui';
  import LoadTrackDialog from './LoadTrackDialog.svelte';
  import type { AudioSetup, PlaylistTrackPickMeta } from '../../../data-model/audioSetupTypes';
  import type { AuthenticatedClient } from '@audiotool/nexus';

  interface Props {
    isPlaying: boolean;
    audioSetup: AudioSetup;
    loopCurrentTrack?: boolean;
    onPlayToggle?: () => void;
    onLoopToggle?: () => void;
    getPrimaryAudioFileNodeId?: () => string | undefined;
    onSelectTrack?: (trackId: string, pickMeta?: PlaylistTrackPickMeta) => void | Promise<void>;
    onAudioFileSelected?: (nodeId: string, file: File) => Promise<void>;
    audiotoolRpcClient?: AuthenticatedClient | null;
    audiotoolUserName?: string;
    onAudiotoolSessionInvalidated?: () => void;
  }

  let {
    isPlaying,
    audioSetup,
    loopCurrentTrack = false,
    onPlayToggle,
    onLoopToggle,
    getPrimaryAudioFileNodeId,
    onSelectTrack,
    onAudioFileSelected,
    audiotoolRpcClient = null,
    audiotoolUserName,
    onAudiotoolSessionInvalidated,
  }: Props = $props();

  function handlePlayToggle() {
    onPlayToggle?.();
  }
</script>

<div class="playback-controls">
  <ButtonGroup class="playback-controls-group">
    <Button
      variant="ghost"
      size="sm"
      mode="both"
      class={`play-toggle ${isPlaying ? 'is-active' : ''}`}
      title="Play/Pause all audio (Space)"
      aria-label={isPlaying ? 'Pause all audio' : 'Play all audio'}
      onclick={handlePlayToggle}
    >
      {#if isPlaying}
        <IconSvg name="pause" variant="filled" />
      {:else}
        <IconSvg name="play" variant="filled" />
      {/if}
      <span class="play-shortcut-hint">Space</span>
    </Button>
    {#if audioSetup?.primarySource?.type === 'playlist'}
      <Button
        variant="ghost"
        size="sm"
        mode="icon-only"
        class={loopCurrentTrack ? 'is-active' : ''}
        title={loopCurrentTrack ? 'Loop current track (on)' : 'Loop current track (off) — playlist continues'}
        onclick={() => onLoopToggle?.()}
      >
        <IconSvg name="repeat" variant="line" />
      </Button>
    {/if}
    <LoadTrackDialog
      audioSetup={audioSetup}
      getPrimaryAudioFileNodeId={getPrimaryAudioFileNodeId ?? (() => undefined)}
      onSelectTrack={onSelectTrack ?? (() => {})}
      onAudioFileSelected={onAudioFileSelected ?? (async () => {})}
      audiotoolRpcClient={audiotoolRpcClient}
      audiotoolUserName={audiotoolUserName}
      onAudiotoolSessionInvalidated={onAudiotoolSessionInvalidated}
    />
  </ButtonGroup>
</div>

<style>
  .playback-controls {
    width: fit-content;
    max-width: min(320px, 100%); /* cap at 320px but never exceed parent */
    min-width: 0;
  }

  /* Playback-only shortcut chip (tool strip uses bare letters on ghost buttons). */
  .play-shortcut-hint {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    padding: var(--pd-2xs) var(--pd-xs);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-gray-70);
    background: transparent;
    box-sizing: border-box;
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    font-weight: 400;
    line-height: 1;
    letter-spacing: 0.02em;
    color: var(--print-subtle);
    white-space: nowrap;
    text-transform: none;
    user-select: none;
    transition:
      border-color var(--motion-effects-fast-duration) var(--motion-effects-fast-easing),
      background-color var(--motion-effects-fast-duration) var(--motion-effects-fast-easing),
      color var(--motion-effects-fast-duration) var(--motion-effects-fast-easing);
  }

  /*
   * Interaction styles must use a flat :global(...) chain — nesting
   * :global(.playback-controls-group) { :global(.playback-controls-group .x) ... }
   * compiles to `.playback-controls-group .playback-controls-group …` and never matches.
   */
  :global(.playback-controls-group) {
    min-width: 0;
  }

  :global(.playback-controls-group > .button:first-child.play-toggle) {
    flex-shrink: 0;
    min-width: fit-content;
    transition:
      color var(--motion-effects-fast-duration) var(--motion-effects-fast-easing),
      background-color var(--motion-effects-fast-duration) var(--motion-effects-fast-easing);
  }

  @media (prefers-reduced-motion: reduce) {
    .play-shortcut-hint,
    :global(.playback-controls-group > .button:first-child.play-toggle) {
      transition-duration: 0.01ms !important;
    }
  }

  :global(.playback-controls-group .play-toggle:hover:not(.is-active):not(:disabled)) .play-shortcut-hint,
  :global(.playback-controls-group .play-toggle:focus-visible:not(.is-active):not(:disabled)) .play-shortcut-hint {
    border-color: var(--color-gray-90);
    color: color-mix(in srgb, var(--print-normal) 88%, #fff);
  }

  :global(.playback-controls-group .play-toggle:active:not(.is-active):not(:disabled)) .play-shortcut-hint {
    border-color: var(--color-gray-120);
    background: color-mix(in srgb, var(--color-gray-70) 55%, transparent);
    color: color-mix(in srgb, var(--print-highlight) 82%, #fff);
  }

  :global(.playback-controls-group .play-toggle.is-active) .play-shortcut-hint {
    border-color: var(--color-teal-light-70);
    background: var(--color-teal-light-60);
    color: var(--color-teal-light-100);
  }

  :global(.playback-controls-group .play-toggle.is-active:hover:not(:disabled)) .play-shortcut-hint,
  :global(.playback-controls-group .play-toggle.is-active:focus-visible:not(:disabled)) .play-shortcut-hint {
    border-color: var(--color-teal-light-80);
    background: var(--color-teal-light-70);
    color: var(--color-teal-light-100);
  }

  :global(.playback-controls-group .play-toggle.is-active:active:not(:disabled)) .play-shortcut-hint {
    border-color: color-mix(in srgb, var(--color-teal-light-130) 78%, #fff);
    background: color-mix(in srgb, var(--power-button-active-bg) 55%, var(--ghost-bg-active));
    color: color-mix(in srgb, var(--ghost-print-active) 74%, #fff);
  }

  :global(.playback-controls-group .track-selector .label) {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
