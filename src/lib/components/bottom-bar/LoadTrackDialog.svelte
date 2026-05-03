<script lang="ts">
  /**
   * LoadTrackDialog - Playlist-waveform 02A
   * Button shows current track displayName or "Select track"; click opens menu with
   * search, track list (tracks-data.json), and Upload. Select track or upload sets primary.
   */
  import type { Action } from 'svelte/action';
  import { Button, ButtonGroup, IconSvg, Message, ModalDialog, SearchInput } from '../ui';
  import TrackListItem from './TrackListItem.svelte';
  import { getTracksData, getPlaylistOrder, type TracksDataMap } from '../../../runtime/tracksData';
  import { onMount } from 'svelte';
  import { tick } from 'svelte';
  import type { AudioSetup } from '../../../data-model/audioSetupTypes';
  import type { PlaylistTrackPickMeta } from '../../../data-model/audioSetupTypes';
  import type { AuthenticatedClient } from '@audiotool/nexus';
  import { listAudiotoolMyPublishedTracks, withAudiotoolUserSession } from '../../../utils/audiotoolSessionRpc';
  import { resolvePlaylistTrackLabel } from '../../../utils/playlistTrackLabel';

  interface TrackItem {
    id: string;
    displayName: string;
    playDuration?: string;
    source?: 'builtin' | 'audiotool';
  }

  interface Props {
    audioSetup: AudioSetup;
    getPrimaryAudioFileNodeId: () => string | undefined;
    onSelectTrack: (trackId: string, pickMeta?: PlaylistTrackPickMeta) => void | Promise<void>;
    onAudioFileSelected: (nodeId: string, file: File) => Promise<void>;
    /** Optional Audiotool OAuth session — when present, lists user's published tracks. */
    audiotoolRpcClient?: AuthenticatedClient | null;
    audiotoolUserName?: string;
    /** Called when RPC indicates OAuth bearer is invalid (expired/revoked). */
    onAudiotoolSessionInvalidated?: () => void;
  }

  let {
    audioSetup,
    getPrimaryAudioFileNodeId,
    onSelectTrack,
    onAudioFileSelected,
    audiotoolRpcClient = null,
    audiotoolUserName,
    onAudiotoolSessionInvalidated,
  }: Props = $props();

  let fileInputEl: HTMLInputElement;
  let menuOpen = $state(false);
  type TrackTabId = 'yours' | 'other';

  let searchQuery = $state('');
  let searchDebounced = $state('');
  let trackTab = $state<TrackTabId>('other');
  let tracks = $state<TrackItem[]>([]);
  /** Resolved catalog map for centralized playlist labels */
  let tracksDataMap = $state.raw<TracksDataMap | null>(null);
  let tracksLoadError = $state<string | null>(null);
  let audiotoolTracks = $state.raw<TrackItem[]>([]);
  let audiotoolTracksLoadError = $state<string | null>(null);
  let audiotoolTracksLoading = $state(false);
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  /** -1 = search focused, 0..n = list option index */
  let listActiveIndex = $state(-1);
  let searchTopbarEl = $state<HTMLDivElement | null>(null);
  let listEl = $state<HTMLDivElement | null>(null);
  const listOptionId = (i: number) => `track-option-${i}`;

  const audiotoolSignedIn = $derived(Boolean(audiotoolRpcClient && audiotoolUserName?.trim()));

  const syncLoadTrackDialogState: Action<
    HTMLElement,
    {
      menuOpen: boolean;
      signedIn: boolean;
      maxListIndex: number;
      getTab: () => TrackTabId;
      setTab: (t: TrackTabId) => void;
      getListIndex: () => number;
      setListIndex: (i: number) => void;
    }
  > = (_n, _p) => ({
    update(p) {
      if (p.menuOpen && !p.signedIn && p.getTab() === 'yours') p.setTab('other');
      if (p.menuOpen && p.getListIndex() >= 0 && p.getListIndex() > p.maxListIndex) {
        p.setListIndex(Math.max(0, p.maxListIndex));
      }
    },
  });

  const buttonLabel = $derived.by(() => {
    const primary = audioSetup.primarySource;
    if (primary?.type === 'upload') {
      const fp = primary.file.filePath ?? primary.file.name;
      return (typeof fp === 'string' && fp.trim() !== '' ? (fp.split(/[/\\]/).pop() ?? fp) : primary.file.name).trim();
    }
    if (primary?.type === 'playlist') {
      return resolvePlaylistTrackLabel(primary.trackId, {
        bundledCatalog: tracksDataMap,
        persistedPlaylist: primary,
      }).text;
    }
    const firstFile = audioSetup.files[0];
    if (!firstFile) return 'Select track';
    const fp = firstFile.filePath ?? firstFile.name;
    if (typeof fp !== 'string' || fp.trim() === '') return 'Select track';
    return (fp.split(/[/\\]/).pop() ?? fp).trim() || 'Select track';
  });

  const filteredYourTracks = $derived.by(() => {
    const q = searchDebounced.trim().toLowerCase();
    const base = audiotoolTracks;
    if (!q) return base;
    return base.filter((t) => t.displayName.toLowerCase().includes(q));
  });

  const filteredOtherTracks = $derived.by(() => {
    const q = searchDebounced.trim().toLowerCase();
    const base = tracks;
    if (!q) return base;
    return base.filter((t) => t.displayName.toLowerCase().includes(q));
  });

  const filteredActiveTracks = $derived(trackTab === 'yours' ? filteredYourTracks : filteredOtherTracks);

  const searchPlaceholder = $derived(
    trackTab === 'yours' ? 'Search your tracks…' : 'Search tracks…'
  );

  const searchAriaLabel = $derived(trackTab === 'yours' ? 'Search your tracks' : 'Search tracks');

  const activeId = $derived(
    listActiveIndex >= 0 && listActiveIndex < filteredActiveTracks.length ? listOptionId(listActiveIndex) : undefined
  );

  const maxFilteredTrackIndex = $derived(Math.max(0, filteredActiveTracks.length - 1));

  function loadTracks(): void {
    if (tracks.length > 0) return;
    tracksLoadError = null;
    getTracksData()
      .then((data: TracksDataMap) => {
        tracksDataMap = data;
        const order = getPlaylistOrder(data);
        tracks = order.map((id) => {
          const entry = data[id];
          return {
            id,
            displayName: entry?.displayName ?? entry?.name ?? id,
            playDuration: typeof entry?.playDuration === 'string' ? entry.playDuration : undefined,
            source: 'builtin',
          };
        });
      })
      .catch((err: unknown) => {
        tracksLoadError = err instanceof Error ? err.message : String(err);
      });
  }

  function loadAudiotoolTracks(): void {
    const session = audiotoolRpcClient;
    const userName = audiotoolUserName?.trim() ?? '';
    if (!session || !userName) {
      if (import.meta.env.DEV) {
        console.info('[ShaderNoice] Audiotool tracks: skipped (no session or user name for picker)');
      }
      return;
    }
    if (audiotoolTracks.length > 0) return;
    if (audiotoolTracksLoading) return;

    audiotoolTracksLoading = true;
    audiotoolTracksLoadError = null;

    if (import.meta.env.DEV) {
      console.info(
        '[ShaderNoice] Audiotool tracks: TrackService.ListTracks (Connect+JSON; contributor filter fallback; Nexus has no `.tracks`)'
      );
    }

    void withAudiotoolUserSession(session, (client) => listAudiotoolMyPublishedTracks(client, userName)).then((res) => {
      audiotoolTracksLoading = false;
      if (!res.ok) {
        if (import.meta.env.DEV) {
          console.warn('[ShaderNoice] Audiotool tracks:', res);
        }
        if (res.reason === 'rpc_forbidden') {
          audiotoolTracksLoadError =
            'Cannot load your Audiotool tracks — the API refused listing (OAuth scopes). Enable scopes for your app at https://developer.audiotool.com/applications, set VITE_AUDIOTOOL_OAUTH_SCOPE if needed, then sign out and sign back in.';
          return;
        }
        if (res.reason === 'session_auth_failed') {
          audiotoolTracksLoadError = 'Audiotool sign-in expired — sign out and sign in again.';
          onAudiotoolSessionInvalidated?.();
        }
        return;
      }
      if (import.meta.env.DEV) {
        console.info('[ShaderNoice] Audiotool tracks: loaded', res.value.items.length, 'published track(s)');
      }
      audiotoolTracks = res.value.items.map((t) => ({
        id: t.trackId,
        displayName: t.displayName,
        source: 'audiotool',
      }));
    }).catch((err: unknown) => {
      audiotoolTracksLoading = false;
      audiotoolTracksLoadError = err instanceof Error ? err.message : String(err);
      if (import.meta.env.DEV) {
        console.warn('[ShaderNoice] Audiotool tracks: request failed', err);
      }
    });
  }

  onMount(() => {
    loadTracks();
  });

  function openDialog(): void {
    menuOpen = true;
    trackTab = audiotoolSignedIn ? 'yours' : 'other';
    loadTracks();
    loadAudiotoolTracks();
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
    const idx = Math.max(0, Math.min(atIndex, filteredActiveTracks.length - 1));
    listActiveIndex = filteredActiveTracks.length > 0 ? idx : -1;
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
      } else if (inList && filteredActiveTracks.length > 0) {
        e.preventDefault();
        listEl?.focus();
        if (listActiveIndex < filteredActiveTracks.length - 1) {
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
        focusList(filteredActiveTracks.length - 1);
      }
      return;
    }
    if (e.key === 'Enter' && inList && listActiveIndex >= 0 && filteredActiveTracks[listActiveIndex]) {
      e.preventDefault();
      handleSelectTrack(
        filteredActiveTracks[listActiveIndex].id,
        filteredActiveTracks[listActiveIndex],
      );
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

  function mapTrackPickMeta(item: TrackItem): PlaylistTrackPickMeta {
    const source =
      item.source === 'audiotool' ? 'audiotool' : item.source === 'builtin' ? 'bundled' : 'unknown';
    return { displayName: item.displayName, displayNameSource: source };
  }

  function handleSelectTrack(trackId: string, item?: TrackItem): void {
    if (item) {
      void onSelectTrack(trackId, mapTrackPickMeta(item));
    } else {
      void onSelectTrack(trackId);
    }
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
  <div
    class="track-picker-topbar"
    role="presentation"
    bind:this={searchTopbarEl}
    onkeydown={handleMenuKeydown}
  >
    <ButtonGroup role="tablist" ariaLabel="Track list sections">
      <Button
        variant="ghost"
        size="sm"
        mode="icon-only"
        class="track-picker-tab {trackTab === 'yours' ? 'is-active' : ''}"
        role="tab"
        aria-selected={trackTab === 'yours'}
        aria-controls="track-picker-panel-yours"
        id="track-picker-tab-yours"
        aria-label="Your tracks"
        disabled={!audiotoolSignedIn}
        title={!audiotoolSignedIn
          ? 'Sign in with Audiotool to see your published tracks'
          : 'Your tracks'}
        onclick={() => {
          if (audiotoolSignedIn) trackTab = 'yours';
        }}
      >
        <IconSvg name="user" variant="line" class="track-picker-tab__icon" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        mode="icon-only"
        class="track-picker-tab {trackTab === 'other' ? 'is-active' : ''}"
        role="tab"
        aria-selected={trackTab === 'other'}
        aria-controls="track-picker-panel-other"
        id="track-picker-tab-other"
        aria-label="Other tracks"
        title="Other tracks"
        onclick={() => {
          trackTab = 'other';
        }}
      >
        <IconSvg name="play" variant="line" class="track-picker-tab__icon" />
      </Button>
    </ButtonGroup>
    <div class="track-picker-topbar__search">
      <SearchInput
        variant="primary"
        size="sm"
        placeholder={searchPlaceholder}
        bind:value={searchQuery}
        onInput={(value: string) => {
          if (value.trim() === '') clearSearch();
          else onSearchValue(value);
        }}
        ariaLabel={searchAriaLabel}
      />
    </div>
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
    <span
      class="track-selector-dialog-sync"
      aria-hidden="true"
      use:syncLoadTrackDialogState={{
        menuOpen,
        signedIn: audiotoolSignedIn,
        maxListIndex: maxFilteredTrackIndex,
        getTab: () => trackTab,
        setTab: (t) => {
          trackTab = t;
        },
        getListIndex: () => listActiveIndex,
        setListIndex: (i) => {
          listActiveIndex = i;
        },
      }}
    ></span>
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
      {#if trackTab === 'yours'}
        <div id="track-picker-panel-yours" role="tabpanel" aria-labelledby="track-picker-tab-yours">
          {#if audiotoolTracksLoadError}
            <div class="list-message" role="alert">
              <Message inline variant="error">
                <span>{audiotoolTracksLoadError}</span>
              </Message>
            </div>
          {:else if audiotoolTracksLoading && audiotoolTracks.length === 0}
            <div class="loading">Loading…</div>
          {:else if filteredYourTracks.length === 0}
            <div class="no-results">
              {searchDebounced.trim() ? 'No matching tracks' : 'No published tracks from your account.'}
            </div>
          {:else}
            {#each filteredYourTracks as track, i (track.id)}
              <div
                id={listOptionId(i)}
                role="option"
                aria-selected={listActiveIndex === i}
                class="list-option"
              >
                <TrackListItem
                  label={track.displayName}
                  selected={listActiveIndex === i}
                  onclick={() => handleSelectTrack(track.id, track)}
                />
              </div>
            {/each}
          {/if}
        </div>
      {:else}
        <div id="track-picker-panel-other" role="tabpanel" aria-labelledby="track-picker-tab-other">
          {#if tracksLoadError}
            <div class="list-message" role="alert">
              <Message inline variant="error">
                <span>{tracksLoadError}</span>
              </Message>
            </div>
          {:else if tracks.length === 0 && !tracksLoadError}
            <div class="loading">Loading…</div>
          {:else if filteredOtherTracks.length === 0}
            <div class="no-results">No matching tracks</div>
          {:else}
            {#each filteredOtherTracks as track, i (track.id)}
              <div
                id={listOptionId(i)}
                role="option"
                aria-selected={listActiveIndex === i}
                class="list-option"
              >
                <TrackListItem
                  label={track.displayName}
                  selected={listActiveIndex === i}
                  onclick={() => handleSelectTrack(track.id, track)}
                />
              </div>
            {/each}
          {/if}
        </div>
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
    flex-shrink: 0;
  }

  :global(.track-selector-dialog-body .modal-dialog-scroll) {
    padding: var(--pd-lg);
  }

  .track-picker-topbar {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: var(--pd-md);
    width: 100%;
    flex-wrap: wrap;
  }

  .track-picker-topbar__search {
    flex: 1;
    min-width: 140px;
  }

  .track-picker-topbar__search :global(input) {
    width: 100%;
  }

  .track-picker-topbar :global(.button-group) {
    flex-shrink: 0;
  }

  .track-picker-topbar :global(.track-picker-tab) {
    font-size: 1.125rem;
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

  .list-message {
    width: 100%;
  }

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
