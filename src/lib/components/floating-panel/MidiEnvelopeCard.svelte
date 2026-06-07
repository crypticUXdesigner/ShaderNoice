<script lang="ts">
  /**
   * MIDI track-set card — tracks first, then response (ADSR). Parallels band section layout.
   */
  import { untrack } from 'svelte';
  import { Button, IconSvg, DropdownMenu, MenuInput, MenuItem, MenuNoResults, Tag, EditableLabel } from '../ui';
  import AdsrEnvelopeEditor from '../ui/input/AdsrEnvelopeEditor.svelte';
  import type {
    MidiEnvelopePreset,
    MidiEnvelopeRetriggerPolicy,
  } from '../../../data-model/midiEnvelopeTypes';
  import { resolveMidiEnvelopeRetriggerPolicy } from '../../../data-model/midiEnvelopeTypes';
  import type { ArrangementTrackFilterRow } from '../../../audiotool/arrangement/arrangementTrackFilter';

  interface Props {
    preset: MidiEnvelopePreset;
    title: string;
    isSelected?: boolean;
    /** Normalized ADSR shape 0–1 for live needle on the envelope editor. */
    livePresetShape?: number | null;
    connectedTracks: ArrangementTrackFilterRow[];
    availableTracks: ArrangementTrackFilterRow[];
    onSelect?: (e: MouseEvent) => void;
    onPresetChange?: (
      patch: Partial<Pick<MidiEnvelopePreset, 'label' | 'trackIds' | 'envelope' | 'retriggerPolicy'>>
    ) => void;
    onAddTrack?: (trackId: string) => void;
    onRemoveTrack?: (trackId: string) => void;
    /** Flat layout for the focused driver dialog (no inset panel-card chrome). */
    embedded?: boolean;
    /** Focused driver: target/source live in DriverFocusedHeader instead of card header. */
    hideTitleHeader?: boolean;
    /** Focused compact driver: track picker lives in overview only. */
    hideTracksSection?: boolean;
  }

  let {
    preset,
    title,
    isSelected = false,
    livePresetShape = null,
    connectedTracks,
    availableTracks,
    onSelect,
    onPresetChange,
    onAddTrack,
    onRemoveTrack,
    embedded = false,
    hideTitleHeader = false,
    hideTracksSection = false,
  }: Props = $props();

  const RETRIGGER_POLICY_OPTIONS: {
    value: MidiEnvelopeRetriggerPolicy;
    label: string;
    helper: string;
  }[] = [
    {
      value: 'lastNoteWins',
      label: 'Restart',
      helper: 'Restart attack on every note.',
    },
    {
      value: 'holdIfHigher',
      label: 'Hold level',
      helper: 'Highest envelope level wins.',
    },
    {
      value: 'legato',
      label: 'Legato',
      helper: 'Skip attack while a note is still sounding.',
    },
  ];

  let addTrackOpen = $state(false);
  let retriggerPolicyOpen = $state(false);
  let retriggerPolicyAnchorEl = $state<HTMLDivElement | null>(null);
  let addTrackAnchorEl = $state<HTMLDivElement | null>(null);
  let addTrackSearch = $state('');
  let addTrackSelectedIndex = $state(-1);

  const filteredAvailableTracks = $derived.by(() => {
    const query = addTrackSearch.trim().toLowerCase();
    if (!query) return availableTracks;
    return availableTracks.filter((track) => track.label.toLowerCase().includes(query));
  });

  function getAddTrackInput(): HTMLInputElement | null {
    return document.querySelector('.midi-add-track-dropdown input.input');
  }

  function getAddTrackListEl(): HTMLElement | null {
    return document.querySelector('.midi-add-track-dropdown .midi-add-track-list');
  }

  function closeAddTrackMenu(): void {
    addTrackOpen = false;
    addTrackSearch = '';
    addTrackSelectedIndex = -1;
  }

  function scrollAddTrackSelectionIntoView(): void {
    requestAnimationFrame(() => {
      const list = getAddTrackListEl();
      list?.querySelector('.menu-item.is-selected')?.scrollIntoView({ block: 'nearest' });
    });
  }

  function handleAddTrackKeydown(e: KeyboardEvent): void {
    const items = filteredAvailableTracks;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeAddTrackMenu();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (items.length === 0) return;
      addTrackSelectedIndex =
        addTrackSelectedIndex < 0
          ? 0
          : Math.min(addTrackSelectedIndex + 1, items.length - 1);
      scrollAddTrackSelectionIntoView();
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (items.length === 0) return;
      addTrackSelectedIndex = Math.max(-1, addTrackSelectedIndex - 1);
      if (addTrackSelectedIndex >= 0) scrollAddTrackSelectionIntoView();
      return;
    }
    if (e.key === 'Enter') {
      if (addTrackSelectedIndex >= 0 && addTrackSelectedIndex < items.length) {
        e.preventDefault();
        const track = items[addTrackSelectedIndex]!;
        onAddTrack?.(track.id);
        closeAddTrackMenu();
      }
    }
  }

  function handleAddTrackInput(e: Event): void {
    addTrackSelectedIndex = -1;
    addTrackSearch = (e.currentTarget as HTMLInputElement).value;
  }

  function selectAvailableTrack(trackId: string): void {
    onAddTrack?.(trackId);
    closeAddTrackMenu();
  }

  $effect(() => {
    if (!addTrackOpen) {
      untrack(() => {
        addTrackSelectedIndex = -1;
      });
      return;
    }
    untrack(() => {
      addTrackSelectedIndex = -1;
    });
    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled) return;
        const input = getAddTrackInput();
        input?.focus();
        input?.select();
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  });

  function patchEnvelope(
    updater: (env: MidiEnvelopePreset['envelope']) => MidiEnvelopePreset['envelope']
  ) {
    onPresetChange?.({ envelope: updater(preset.envelope) });
  }

  const resolvedRetriggerPolicy = $derived(
    resolveMidiEnvelopeRetriggerPolicy(preset.retriggerPolicy)
  );

  const retriggerPolicyLabel = $derived(
    RETRIGGER_POLICY_OPTIONS.find((o) => o.value === resolvedRetriggerPolicy)?.label ?? 'Restart'
  );

  const retriggerPolicyHelper = $derived(
    RETRIGGER_POLICY_OPTIONS.find((o) => o.value === resolvedRetriggerPolicy)?.helper ?? ''
  );
</script>

<div
  class="midi-envelope-card"
  class:panel-card={!embedded}
  class:is-embedded={embedded}
  class:in-section={embedded && hideTitleHeader && !hideTracksSection}
  class:hide-tracks={hideTracksSection}
  class:selected={isSelected}
  role="option"
  aria-selected={isSelected}
  tabindex="0"
  aria-label="MIDI track set settings"
  onclick={onSelect}
  onkeydown={(e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onSelect?.(e as unknown as MouseEvent);
    }
  }}
>
  {#if !hideTitleHeader}
    <div class="header">
      <div class="label-wrap" role="presentation" ondblclick={(e) => e.stopPropagation()}>
        <EditableLabel
          value={preset.label ?? ''}
          placeholder={title}
          ariaLabel="Track set name"
          onCommit={(value) => onPresetChange?.({ label: value })}
        />
        {#if livePresetShape != null}
          <span class="live-output" title="Live hit level">{livePresetShape.toFixed(3)}</span>
        {/if}
      </div>
    </div>
  {/if}

  {#if !hideTracksSection}
  <div class="tracks-section" role="presentation" ondblclick={(e) => e.stopPropagation()}>
    <div class="tracks-header">
      <span class="tracks-label">Tracks</span>
      {#if availableTracks.length > 0}
        <div class="add-track-wrap" bind:this={addTrackAnchorEl}>
          <Button
            variant="ghost"
            size="sm"
            mode="both"
            aria-expanded={addTrackOpen}
            aria-haspopup="listbox"
            onclick={(e) => {
              e.stopPropagation();
              addTrackOpen = !addTrackOpen;
            }}
          >
            <IconSvg name="plus" variant="line" />
            Add track
          </Button>
          <DropdownMenu
            open={addTrackOpen}
            anchor={addTrackAnchorEl}
            align="end"
            openAbove={true}
            onClose={closeAddTrackMenu}
            class="midi-add-track-dropdown"
          >
            {#snippet children()}
              <MenuInput
                value={addTrackSearch}
                placeholder="Search tracks…"
                aria-label="Search tracks"
                oninput={handleAddTrackInput}
                onkeydown={handleAddTrackKeydown}
              />
              <div class="midi-add-track-list scrollbar-styled" role="listbox" aria-label="Available tracks">
                {#if filteredAvailableTracks.length === 0}
                  <MenuNoResults>
                    {addTrackSearch.trim() ? 'No matching tracks' : 'No tracks available'}
                  </MenuNoResults>
                {:else}
                  {#each filteredAvailableTracks as track, index (track.id)}
                    <MenuItem
                      label={track.label}
                      selected={index === addTrackSelectedIndex}
                      onclick={() => selectAvailableTrack(track.id)}
                    >
                      {#snippet trailing()}
                        <span class="track-note-count">{track.noteCount.toLocaleString()} notes</span>
                      {/snippet}
                    </MenuItem>
                  {/each}
                {/if}
              </div>
            {/snippet}
          </DropdownMenu>
        </div>
      {/if}
    </div>

    {#if connectedTracks.length === 0}
      <p class="tracks-empty">No tracks yet. Add a track to listen for note hits.</p>
    {:else}
      <ul class="tracks-tags" aria-label="Connected tracks">
        {#each connectedTracks as track (track.id)}
          <li>
            <Tag size="sm" class="track-tag" title={`${track.label}, ${track.noteCount} notes`}>
              <span class="track-label">
                <span class="track-name">{track.label}</span>
                <span class="track-meta" aria-hidden="true">({track.noteCount})</span>
              </span>
              <Button
                variant="ghost"
                size="xs"
                mode="icon-only"
                class="track-remove-btn"
                title="Remove track"
                aria-label={`Remove track ${track.label}`}
                onclick={(e) => {
                  e.stopPropagation();
                  onRemoveTrack?.(track.id);
                }}
              >
                <IconSvg name="x" variant="line" />
              </Button>
            </Tag>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
  {/if}

  <div class="response-section" role="presentation" ondblclick={(e) => e.stopPropagation()}>
    <div class="editor-wrap">
      <div class="card-display">
        <AdsrEnvelopeEditor
          adsr={preset.envelope.adsr}
          liveLevel={livePresetShape}
          velocityToPeak={preset.envelope.velocityToPeak}
          onChange={(adsr) => patchEnvelope((env) => ({ ...env, adsr: { ...adsr } }))}
          onVelocityToPeakChange={(velocityToPeak) =>
            patchEnvelope((env) => ({ ...env, velocityToPeak }))}
        >
          {#snippet controlsTrail()}
            <div class="overlap-mode-row">
              <div class="overlap-mode-left">
                <span class="overlap-mode-label" id="overlap-mode-label-{preset.id}">Mode</span>
                <div class="overlap-mode-control" bind:this={retriggerPolicyAnchorEl}>
                  <Button
                    variant="secondary"
                    size="sm"
                    mode="both"
                    aria-labelledby="overlap-mode-label-{preset.id}"
                    aria-haspopup="listbox"
                    aria-expanded={retriggerPolicyOpen}
                    onclick={(e) => {
                      e.stopPropagation();
                      retriggerPolicyOpen = !retriggerPolicyOpen;
                    }}
                  >
                    {retriggerPolicyLabel}
                  </Button>
                  <DropdownMenu
                    open={retriggerPolicyOpen}
                    anchor={retriggerPolicyAnchorEl}
                    align="start"
                    onClose={() => (retriggerPolicyOpen = false)}
                  >
                    {#snippet children()}
                      {#each RETRIGGER_POLICY_OPTIONS as option (option.value)}
                        <MenuItem
                          label={option.label}
                          desc={option.helper}
                          selected={resolvedRetriggerPolicy === option.value}
                          onclick={() => {
                            onPresetChange?.({ retriggerPolicy: option.value });
                            retriggerPolicyOpen = false;
                          }}
                        />
                      {/each}
                    {/snippet}
                  </DropdownMenu>
                </div>
              </div>
              <p class="overlap-mode-helper">{retriggerPolicyHelper}</p>
            </div>
          {/snippet}
        </AdsrEnvelopeEditor>
      </div>
    </div>
  </div>

</div>

<style>
  .midi-envelope-card {
    display: flex;
    flex-direction: column;
    width: 100%;
    box-sizing: border-box;
    padding-bottom: var(--pd-sm);
    cursor: default;

    &.is-embedded {
      padding-bottom: 0;
      background: transparent;
      border: none;
      border-radius: 0;

      .header {
        padding: var(--pd-sm) var(--pd-md) 0;
      }

      .tracks-section {
        padding: var(--pd-md) var(--pd-md) 0;
      }

      .response-section {
        padding: 0 var(--pd-md) var(--pd-sm);
        border-top: none;
        margin-top: 0;
      }
    }

    &.is-embedded.in-section {
      .tracks-section {
        padding: 0;
      }

      .tracks-header,
      .tracks-empty,
      .tracks-tags {
        padding-inline: var(--pd-sm);
      }

      .response-section {
        padding: var(--pd-md) 0 0;
        border-top: 1px solid var(--color-gray-70);
        margin-top: 0;
      }
    }

    &.is-embedded.hide-tracks {
      .response-section {
        padding: var(--pd-sm) var(--pd-md) 0;
      }
    }

    .header {
      display: flex;
      align-items: center;
      gap: var(--pd-sm);
      width: 100%;
      min-height: var(--size-md);
      padding: 0 var(--pd-sm);
    }

    .label-wrap {
      display: flex;
      align-items: center;
      gap: var(--pd-sm);
      flex: 1;
      min-width: 0;
    }

    .label-wrap :global(.editable-label) {
      flex: 1;
      min-width: 0;
    }

    .live-output {
      flex-shrink: 0;
      font-size: var(--text-xs);
      font-variant-numeric: tabular-nums;
      color: var(--color-violet-110);
    }

    .tracks-section {
      padding: 0 var(--pd-sm);
    }

    .response-section {
      padding: var(--pd-md) var(--pd-sm) 0;
      border-top: 1px solid var(--color-gray-70);
      margin-top: var(--pd-md);
    }

    .overlap-mode-row {
      display: flex;
      align-items: center;
      gap: var(--pd-md);
      width: 100%;
      min-width: 0;
    }

    .overlap-mode-left {
      display: flex;
      align-items: center;
      gap: var(--pd-sm);
      flex-shrink: 0;
    }

    .overlap-mode-label {
      font-size: var(--text-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-gray-110);
    }

    .overlap-mode-helper {
      flex: 1;
      min-width: 0;
      margin: 0;
      font-size: var(--text-xs);
      color: var(--color-gray-100);
      line-height: 1.35;
    }

    .editor-wrap {
      width: 100%;
    }

    .tracks-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--pd-sm);
      margin-bottom: var(--pd-xs);

      .tracks-label {
        font-size: var(--text-sm);
        font-weight: var(--font-weight-medium);
        color: var(--color-gray-110);
      }
    }

    .add-track-wrap {
      flex-shrink: 0;
    }

    .tracks-empty {
      margin: 0;
      font-size: var(--text-sm);
      color: var(--color-gray-100);
    }

    .tracks-tags {
      display: flex;
      flex-wrap: wrap;
      gap: var(--pd-sm);
      margin: 0;
      padding: 0;
      list-style: none;

      li {
        max-width: 100%;
      }
    }

    .tracks-tags :global(.track-tag.tag) {
      display: inline-flex;
      align-items: center;
      gap: var(--pd-xs);
      box-sizing: border-box;
      max-width: 100%;
      height: auto;
      min-height: var(--size-sm);
      padding: var(--pd-2xs) var(--pd-sm);
      letter-spacing: normal;
      line-height: 1;
      background: var(--color-gray-70);
      border: 1px solid var(--color-gray-90);
      color: var(--color-gray-120);
    }

    .track-label {
      display: inline-flex;
      align-items: baseline;
      gap: var(--pd-2xs);
      min-width: 0;
    }

    .track-name {
      min-width: 0;
      max-width: 10rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: var(--text-xs);
      line-height: 1;
    }

    .track-meta {
      flex-shrink: 0;
      font-size: var(--text-2xs);
      line-height: 1;
      font-variant-numeric: tabular-nums;
      color: var(--color-gray-100);
    }

    .tracks-tags :global(.track-remove-btn.button.xs.icon-only) {
      flex-shrink: 0;
    }

    .tracks-tags :global(.track-tag.tag:focus-within .track-remove-btn.button.ghost:hover) {
      background: var(--color-gray-90);
      color: var(--color-gray-130);
    }
  }

  :global(.midi-add-track-dropdown.dropdown-menu.menu-wrapper) {
    /* Hug content; global .dropdown-menu uses a fixed 260px width. */
    width: auto;
    min-width: 220px;
    max-width: min(320px, calc(100vw - 16px));
    max-height: min(40vh, 320px);
    overflow: hidden;
    padding: 0;
    /* Only the track list scrolls — don't reserve gutter on the shell. */
    scrollbar-gutter: auto;

    :global(.menu-wrapper-inner) {
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow: hidden;
      padding: var(--pd-xs);
      scrollbar-gutter: auto;
    }

    .midi-add-track-list {
      flex: 1;
      min-height: 0;
      max-height: 240px;
      overflow-y: auto;
      overflow-x: hidden;
      padding: var(--pd-sm) 0 0;
    }

    :global(.menu-item .trailing .track-note-count) {
      font-size: var(--text-xs);
      font-variant-numeric: tabular-nums;
      color: var(--print-subtle);
      white-space: nowrap;
    }
  }
</style>
