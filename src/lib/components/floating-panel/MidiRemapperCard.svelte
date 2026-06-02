<script lang="ts">
  /**
   * MIDI remap card — out range + Connect; parallels RemapperCard.
   */
  import { Button, IconSvg, EditableLabel, ValueInput } from '../ui';
  import DriverConnectionTargetTags from './DriverConnectionTargetTags.svelte';
  import type { DriverConnectionTargetDisplay } from './driverTargetDisplay';
  import type { MidiEnvelopeRemapper } from '../../../data-model/midiEnvelopeTypes';

  /** Hit level is 0–1; mapped value uses parameter units. */
  const OUTPUT_VALUE_MIN = -9999;
  const OUTPUT_VALUE_MAX = 9999;
  const OUTPUT_VALUE_STEP = 0.01;

  interface Props {
    remapper: MidiEnvelopeRemapper;
    envelopePresetName?: string;
    isConnectedToTarget?: boolean;
    onConnect?: () => void;
    onDisconnect?: () => void;
    onDelete?: () => void;
    onDuplicate?: () => void;
    onRemapperChange?: (patch: Partial<Pick<MidiEnvelopeRemapper, 'name' | 'outMin' | 'outMax'>>) => void;
    connectionTargets?: DriverConnectionTargetDisplay[];
    activeTargetNodeId?: string;
    activeTargetParamName?: string;
    onRevealParameter?: (nodeId: string, paramName: string) => void;
    /** Focused compact driver: borderless, fits parent width. */
    embedded?: boolean;
  }

  let {
    remapper,
    envelopePresetName = 'Track set',
    isConnectedToTarget = false,
    onConnect,
    onDisconnect,
    onDelete,
    onDuplicate,
    onRemapperChange,
    connectionTargets = [],
    activeTargetNodeId,
    activeTargetParamName,
    onRevealParameter,
    embedded = false,
  }: Props = $props();

  const displayName = $derived(remapper.name?.trim() || 'Remap');
</script>

<div
  class="midi-remapper-card panel-card"
  class:is-embedded={embedded}
  class:connected={isConnectedToTarget}
  role="group"
  aria-label={`Remap: ${displayName}`}
>
  <div class="header">
    <div class="label-wrap" role="presentation" ondblclick={(e) => e.stopPropagation()}>
      <EditableLabel
        value={remapper.name ?? ''}
        prefix={`${envelopePresetName}: `}
        placeholder="Remap"
        ariaLabel="Remap name"
        onCommit={(value) => onRemapperChange?.({ name: value })}
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
          aria-label={`Connect: ${displayName}`}
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
          aria-label={`Duplicate remap: ${displayName}`}
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
          aria-label={`Delete remap: ${displayName}`}
          onclick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <IconSvg name="trash" variant="line" />
        </Button>
      {/if}
    </div>
  </div>
  <div class="editor-wrap">
    <div class="range-controls" role="group" aria-label="Remap range">
      <div class="control">
        <ValueInput
          value={remapper.outMin}
          min={OUTPUT_VALUE_MIN}
          max={OUTPUT_VALUE_MAX}
          step={OUTPUT_VALUE_STEP}
          decimals={3}
          size="sm"
          onChange={(v) => onRemapperChange?.({ outMin: v })}
          onCommit={(v) => onRemapperChange?.({ outMin: v })}
        />
        <span class="label">Out min</span>
      </div>
      <div class="control">
        <ValueInput
          value={remapper.outMax}
          min={OUTPUT_VALUE_MIN}
          max={OUTPUT_VALUE_MAX}
          step={OUTPUT_VALUE_STEP}
          decimals={3}
          size="sm"
          onChange={(v) => onRemapperChange?.({ outMax: v })}
          onCommit={(v) => onRemapperChange?.({ outMax: v })}
        />
        <span class="label">Out max</span>
      </div>
    </div>
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
  .midi-remapper-card {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
    padding-bottom: var(--pd-sm);
    cursor: default;

    &:hover,
    &:active {
      border-color: var(--panel-card-border);
    }

    &.connected {
      outline: 1px solid var(--color-blue-90);
      outline-offset: -1px;
    }

    &.is-embedded {
      margin: 0;
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
      gap: var(--pd-sm);
      width: 100%;
      padding: 0 var(--pd-sm) var(--pd-xs);
    }

    .range-controls {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      column-gap: var(--pd-sm);
      width: 100%;
    }

    .control {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: var(--pd-2xs);
      min-width: 0;

      :global(.value-input-wrapper) {
        width: 100%;
      }

      :global(.value-input) {
        width: 100%;
        box-sizing: border-box;
        justify-content: center;
      }

      .label {
        font-size: var(--text-xs);
        color: var(--color-gray-100);
        text-align: center;
      }
    }
  }
</style>
