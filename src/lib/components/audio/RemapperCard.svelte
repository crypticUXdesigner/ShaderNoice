<script lang="ts">
  /**
   * RemapperCard - Single remap card in the audio signal picker.
   * Shows remap name (with band prefix), range editor, and Connect action.
   */
  import { Button, IconSvg, EditableLabel, RemapRangeEditor } from '../ui';
  import DriverConnectionTargetTags from '../floating-panel/DriverConnectionTargetTags.svelte';
  import type { DriverConnectionTargetDisplay } from '../floating-panel/driverTargetDisplay';
  import type { AudioRemapperEntry } from '../../../data-model/audioSetupTypes';

  interface LiveValues {
    incoming: number | null;
    outgoing: number | null;
  }

  interface Props {
    remapper: AudioRemapperEntry;
    bandName?: string;
    isConnectedToTarget?: boolean;
    liveValues?: LiveValues | null;
    onConnect?: () => void;
    onDisconnect?: () => void;
    onDelete?: () => void;
    onDuplicate?: () => void;
    onRemapperChange?: (updater: (r: AudioRemapperEntry) => AudioRemapperEntry) => void;
    connectionTargets?: DriverConnectionTargetDisplay[];
    activeTargetNodeId?: string;
    activeTargetParamName?: string;
    onRevealParameter?: (nodeId: string, paramName: string) => void;
  }

  let {
    remapper,
    bandName = 'Band',
    isConnectedToTarget = false,
    liveValues = null,
    onConnect,
    onDisconnect,
    onDelete,
    onDuplicate,
    onRemapperChange,
    connectionTargets = [],
    activeTargetNodeId,
    activeTargetParamName,
    onRevealParameter,
  }: Props = $props();
</script>

<div
  class="remapper-card panel-card"
  class:connected={isConnectedToTarget}
  role="group"
  aria-label={`Remap: ${remapper.name || remapper.id}`}
>
  <div class="header">
    <div class="label-wrap" role="presentation" ondblclick={(e) => e.stopPropagation()}>
      <EditableLabel
        value={remapper.name}
        prefix={`${bandName}: `}
        placeholder="Remap name"
        ariaLabel="Remap name"
        onCommit={(value) => onRemapperChange?.((r) => ({ ...r, name: value }))}
      />
    </div>
    <div class="header-actions" role="presentation" ondblclick={(e) => e.stopPropagation()}>
      {#if onDisconnect}
        <Button
          variant="warning"
          size="sm"
          mode="both"
          title="Disconnect from parameter"
          aria-label="Disconnect from parameter"
          onclick={(e) => {
            e.stopPropagation();
            onDisconnect();
          }}
        >
          <IconSvg name="prohibit" variant="line" />
          Disconnect
        </Button>
      {:else if onConnect}
        <Button
          variant="primary"
          size="sm"
          mode="both"
          title="Connect"
          aria-label={`Connect: ${remapper.name || remapper.id}`}
          onclick={(e) => {
            e.stopPropagation();
            onConnect?.();
          }}
        >
          <IconSvg name="plug" variant="line" />
          Connect
        </Button>
      {/if}
      {#if onDuplicate}
        <Button
          variant="ghost"
          size="sm"
          mode="icon-only"
          title="Duplicate remap"
          aria-label={`Duplicate remap: ${remapper.name || remapper.id}`}
          onclick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
        >
          <IconSvg name="copy" variant="line" />
        </Button>
      {/if}
      {#if onDelete}
        <Button
          variant="ghost"
          size="sm"
          mode="icon-only"
          title="Delete remap"
          aria-label={`Delete remap: ${remapper.name || remapper.id}`}
          onclick={(e) => {
            e.stopPropagation();
            onDelete?.();
          }}
        >
          <IconSvg name="trash" variant="line" />
        </Button>
      {/if}
    </div>
  </div>
  <div class="editor-wrap">
    <RemapRangeEditor
      inMin={remapper.inMin}
      inMax={remapper.inMax}
      outMin={remapper.outMin}
      outMax={remapper.outMax}
      liveInValue={liveValues?.incoming ?? null}
      liveOutValue={liveValues?.outgoing ?? null}
      onChange={(payload) => onRemapperChange?.((r) => ({ ...r, ...payload }))}
    />
  </div>
  <DriverConnectionTargetTags
    targets={connectionTargets}
    activeNodeId={activeTargetNodeId}
    activeParamName={activeTargetParamName}
    onReveal={onRevealParameter}
    sectionLabel="Targets"
  />
</div>

<style>
  .remapper-card {
    /* Layout */
    flex-direction: column;
    width: 100%;
    box-sizing: border-box;
    padding-bottom: var(--pd-sm);

    /* Other */
    cursor: default;

    &:hover,
    &:active {
      border-color: var(--panel-card-border);
    }

    &.connected {
      outline: 1px solid var(--color-blue-90);
      outline-offset: -1px;
    }

    .header {
      display: flex;
      align-items: center;
      gap: var(--pd-sm);
      width: 100%;
      height: var(--size-md);
      min-height: 0;
      padding: 0 var(--pd-sm);

      :global(.button) {
        border-radius: calc(var(--radius-md) - var(--pd-sm));
      }

      :global(.power-audio-icon.is-dimmed svg) {
        color: var(--color-blue-110);
      }
    }

    .label-wrap {
      display: flex;
      align-items: center;
      flex: 1;
      min-width: 0;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: var(--pd-xs);
      flex-shrink: 0;
    }

    .editor-wrap {
      display: flex;
      flex-direction: column;
      width: 100%;
      padding: 0 var(--pd-sm);
    }
  }
</style>
