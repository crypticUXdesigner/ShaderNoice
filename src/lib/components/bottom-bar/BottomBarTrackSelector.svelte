<script lang="ts">
  /**
   * BottomBarTrackSelector - Playlist-waveform 02A
   * Button shows current track displayName or "Select track"; click opens menu with
   * search, track list (tracks-data.json), and Upload. Select track or upload sets primary.
   */
  import { Button, MenuItem, ModalDialog, SearchInput } from '../ui';
  import { getTracksData, getPlaylistOrder } from '../../../runtime/tracksData';
  import type { TracksDataMap } from '../../../runtime/tracksData';
  import { onMount } from 'svelte';
  import { tick } from 'svelte';
  import type { AudioSetup } from '../../../data-model/audioSetupTypes';

  interface TrackItem {
    id: string;
    displayName: string;
    playDuration?: string;
  }

  interface Props {
    audioSetup: AudioSetup;
    getPrimaryAudioFileNodeId: () => string | undefined;
    onSelectTrack: (trackId: string) => void;
    onAudioFileSelected: (nodeId: string, file: File) => Promise<void>;
  }

  let {
    audioSetup,
    getPrimaryAudioFileNodeId,
    onSelectTrack,
    onAudioFileSelected,
  }: Props = $props();

  let fileInputEl: HTMLInputElement;
  let menuOpen = $state(false);
  let searchQuery = $state('');
  let searchDebounced = $state('');
  let tracks = $state<TrackItem[]>([]);
  let tracksLoadError = $state<string | null>(null);
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  /** -1 = search focused, 0..n = list option index */
  let listActiveIndex = $state(-1);
  let searchTopbarEl = $state<HTMLDivElement | null>(null);
  let listEl = $state<HTMLDivElement | null>(null);
  const listOptionId = (i: number) => `track-option-${i}`;

  const buttonLabel = $derived.by(() => {
    const primary = audioSetup.primarySource;
    if (primary?.type === 'upload') {
      const fp = primary.file.filePath ?? primary.file.name;
      return (typeof fp === 'string' && fp.trim() !== '' ? (fp.split(/[/\\]/).pop() ?? fp) : primary.file.name).trim();
    }
    if (primary?.type === 'playlist') {
      const t = tracks.find((x) => x.id === primary.trackId);
      return t?.displayName ?? primary.trackId;
    }
    const firstFile = audioSetup.files[0];
    if (!firstFile) return 'Select track';
    const fp = firstFile.filePath ?? firstFile.name;
    if (typeof fp !== 'string' || fp.trim() === '') return 'Select track';
    return (fp.split(/[/\\]/).pop() ?? fp).trim() || 'Select track';
  });

  const filteredTracks = $derived.by(() => {
    const q = searchDebounced.trim().toLowerCase();
    if (!q) return tracks;
    return tracks.filter((t) => t.displayName.toLowerCase().includes(q));
  });

  const activeId = $derived(
    listActiveIndex >= 0 && listActiveIndex < filteredTracks.length ? listOptionId(listActiveIndex) : undefined
  );

  $effect(() => {
    if (!menuOpen || listActiveIndex < 0) return;
    const max = filteredTracks.length - 1;
    if (listActiveIndex > max) listActiveIndex = max;
  });

  function loadTracks(): void {
    if (tracks.length > 0) return;
    tracksLoadError = null;
    getTracksData()
      .then((data: TracksDataMap) => {
        const order = getPlaylistOrder(data);
        tracks = order.map((id) => {
          const entry = data[id];
          return {
            id,
            displayName: entry?.displayName ?? entry?.name ?? id,
            playDuration: typeof entry?.playDuration === 'string' ? entry.playDuration : undefined,
          };
        });
      })
      .catch((err: unknown) => {
        tracksLoadError = err instanceof Error ? err.message : String(err);
      });
  }

  onMount(() => {
    loadTracks();
  });

  function openDialog(): void {
    menuOpen = true;
    loadTracks();
    searchQuery = '';
    searchDebounced = '';
    listActiveIndex = -1;
    tick().then(() => {
      searchTopbarEl?.querySelector<HTMLInputElement>('input')?.focus();
    });
  }

  function closeDialog(): void {
    menuOpen = false;
    searchQuery = '';
    searchDebounced = '';
    listActiveIndex = -1;
  }

  function scrollActiveOptionIntoView(): void {
    if (listActiveIndex >= 0) {
      listEl?.querySelector(`#${listOptionId(listActiveIndex)}`)?.scrollIntoView({ block: 'nearest' });
    }
  }

  function focusList(atIndex: number): void {
    const idx = Math.max(0, Math.min(atIndex, filteredTracks.length - 1));
    listActiveIndex = filteredTracks.length > 0 ? idx : -1;
    listEl?.focus();
    scrollActiveOptionIntoView();
  }

  function focusSearch(): void {
    listActiveIndex = -1;
    searchTopbarEl?.querySelector<HTMLInputElement>('input')?.focus();
  }

  function handleMenuKeydown(e: KeyboardEvent): void {
    const target = e.target as HTMLElement;
    const inSearch = searchTopbarEl?.contains(target) ?? false;
    const inList = listEl?.contains(target) ?? false;
    const inFooter = target.closest?.('.track-selector-footer') ?? false;

    if (e.key === 'ArrowDown') {
      if (inSearch) {
        e.preventDefault();
        focusList(0);
      } else if (inList && filteredTracks.length > 0) {
        e.preventDefault();
        listEl?.focus();
        if (listActiveIndex < filteredTracks.length - 1) {
          listActiveIndex++;
          scrollActiveOptionIntoView();
        }
      }
      return;
    }
    if (e.key === 'ArrowUp') {
      if (inList) {
        e.preventDefault();
        listEl?.focus();
        if (listActiveIndex <= 0) {
          focusSearch();
        } else {
          listActiveIndex--;
          scrollActiveOptionIntoView();
        }
      } else if (inFooter) {
        e.preventDefault();
        focusList(filteredTracks.length - 1);
      }
      return;
    }
    if (e.key === 'Enter' && inList && listActiveIndex >= 0 && filteredTracks[listActiveIndex]) {
      e.preventDefault();
      handleSelectTrack(filteredTracks[listActiveIndex].id);
    }
  }

  function onSearchValue(value: string): void {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      searchDebounced = value;
      debounceTimer = null;
    }, 150);
  }

  function clearSearch(): void {
    searchQuery = '';
    searchDebounced = '';
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  }

  function handleSelectTrack(trackId: string): void {
    onSelectTrack(trackId);
    closeDialog();
  }

  function handleUploadClick(): void {
    const nodeId = getPrimaryAudioFileNodeId?.() ?? null;
    if (nodeId) fileInputEl?.click();
  }

  async function handleFileInputChange(): Promise<void> {
    const file = fileInputEl?.files?.[0];
    const nodeId = getPrimaryAudioFileNodeId?.() ?? null;
    if (file && nodeId) {
      await onAudioFileSelected?.(nodeId, file);
      if (fileInputEl) fileInputEl.value = '';
      closeDialog();
    }
  }
</script>

{#snippet searchTopbarSnippet()}
  <div class="search" role="presentation" bind:this={searchTopbarEl} onkeydown={handleMenuKeydown}>
    <SearchInput
      variant="primary"
      size="sm"
      placeholder="Search tracks…"
      bind:value={searchQuery}
      onInput={(value: string) => {
        if (value.trim() === '') clearSearch();
        else onSearchValue(value);
      }}
      ariaLabel="Search tracks"
    />
  </div>
{/snippet}

<div class="track-selector">
  <div class="button-wrap">
    <Button
      variant="ghost"
      size="sm"
      layout="label-only"
      class="button"
      title="Select track or upload audio"
      onclick={() => (menuOpen ? closeDialog() : openDialog())}
    >
      <span class="label">{buttonLabel}</span>
    </Button>
  </div>

  <ModalDialog
    open={menuOpen}
    onClose={closeDialog}
    variant="list"
    title="Select Track"
    class="track-selector-dialog"
    bodyClass="track-selector-dialog-body"
    bodyScroll="content"
    bodyTopbar={searchTopbarSnippet}
  >
    {#snippet footer()}
      <div class="footer track-selector-footer" role="presentation" onkeydown={handleMenuKeydown}>
        <Button
          variant="ghost"
          size="sm"
          layout="label-only"
          class="upload-button"
          onclick={handleUploadClick}
          type="button"
        >
          Upload…
        </Button>
        <Button variant="primary" size="sm" onclick={closeDialog} type="button">
          Done
        </Button>
      </div>
    {/snippet}

    <div
      class="list"
      role="listbox"
      tabindex="-1"
      aria-activedescendant={activeId}
      bind:this={listEl}
      onkeydown={handleMenuKeydown}
    >
      {#if tracksLoadError}
        <div class="error">{tracksLoadError}</div>
      {:else if tracks.length === 0 && !tracksLoadError}
        <div class="loading">Loading…</div>
      {:else if filteredTracks.length === 0}
        <div class="no-results">No matching tracks</div>
      {:else}
        {#each filteredTracks as track, i (track.id)}
          <div
            id={listOptionId(i)}
            role="option"
            aria-selected={listActiveIndex === i}
            class="list-option"
          >
            <MenuItem
              label={track.displayName}
              selected={listActiveIndex === i}
              class="track-menu-item"
              onclick={() => handleSelectTrack(track.id)}
            />
          </div>
        {/each}
      {/if}
    </div>
  </ModalDialog>

  <input
    bind:this={fileInputEl}
    type="file"
    accept="audio/mpeg,.mp3"
    style="display: none"
    onchange={handleFileInputChange}
    aria-label="Upload audio file"
  />
</div>

<style>
  /* Button/label live in this tree; dialog is portaled by Modal/ModalDialog */
  .track-selector {
    position: relative;
    min-width: 0; /* allow shrink in flex layout */
    max-width: 100%; /* never grow larger than parent (playback controls) */
    width: fit-content;

    .button-wrap {
      width: fit-content;
      max-width: min(240px, 100%); /* cap at 240px but never exceed track-selector */
      min-width: 0;
      overflow: hidden;

      :global(.button) {
        width: 100%;
      }

      :global(.label) {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }

  :global(.track-selector-dialog-body) {
    padding: 0;
    gap: var(--pd-lg);
  }

  :global(.track-selector-dialog-body .modal-dialog-topbar) {
    padding: var(--pd-md) var(--pd-lg);
  }

  :global(.track-selector-dialog-body .modal-dialog-scroll) {
    padding: var(--pd-lg);
  }

  .search {
    width: 100%;
  }

  .list {
    display: flex;
    flex-direction: column;
    gap: var(--pd-2xs);
    min-height: 0;
    align-items: stretch;
  }

  .list-option {
    width: 100%;
    min-width: 0;
  }

  .list-option :global(.menu-item) {
    width: 100%;
  }

  /* Track list items: align with DocsPanelItem styling */
  .list-option :global(.menu-item.track-menu-item) {
    padding: var(--pd-sm);
    border-radius: calc(var(--radius-lg) + var(--pd-sm));
    background: var(--ghost-bg);
    color: var(--print-highlight);
    font-size: var(--text-sm);
    transition: background 0.15s, transform 0.15s, color 0.15s;
  }

  .list-option :global(.menu-item.track-menu-item:hover:not(.is-disabled)) {
    transform: translateX(var(--pd-2xs));
    background: var(--ghost-bg-hover);
    color: var(--print-light);
  }

  .list-option :global(.menu-item.track-menu-item.is-selected:not(.is-disabled)) {
    background: var(--ghost-bg-active);
    color: var(--color-blue-110);
  }

  .list-option :global(.menu-item.track-menu-item .content .name) {
    margin-bottom: 0;
    font-weight: 400;
  }

  .error,
  .loading,
  .no-results {
    padding: var(--pd-md);
    font-size: var(--text-sm);
    color: var(--text-muted, var(--color-gray-100));
  }

  .footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--pd-md);
    width: 100%;
  }

</style>
