<script lang="ts">
  /**
   * ParameterCell — Single reusable cell shell for all parameters.
   * Layout: top row = ports + label; bottom row = mode + signal name (when connected).
   * Mode button shows only when connected (graph or audio).
   * Uses ParamCell wrapper for layout and scoped param-cell styles.
   */

  import ParamCell from './ParamCell.svelte';
  import ParamPort from './ParamPort.svelte';
  import { ModeButton, IconSvg } from '../../ui';
  import type { ParamPortState, AttachedDriverKind } from './ParamPort.svelte';
  import type { IconName } from '../../../../utils/icons';

  interface Props {
    label: string;
    showPort?: boolean;
    showModeButton?: boolean;
    modeButtonIcon?: IconName;
    portId?: string;
    portType?: string;
    nodeId?: string;
    paramName?: string;
    portState?: ParamPortState;
    signalName?: string;
    attachedDriverKind?: AttachedDriverKind;
    liveValue?: number;
    supportsAudio?: boolean;
    supportsAnimation?: boolean;
    /** Timeline automation drives this parameter (evaluable regions on lane). */
    timelineDriven?: boolean;
    onModeClick?: () => void;
    onPortPointerDown?: (e: PointerEvent) => void;
    onPortDoubleClick?: (e: MouseEvent) => void;
    /** Driver bypass power toggle (above port when showPort and a bypass target exists). */
    showDriverPowerToggle?: boolean;
    driverBypassed?: boolean;
    onDriverBypassToggle?: () => void;
    disabled?: boolean;
    class?: string;
    /** Compact shell: control only (e.g. group header toggle). */
    inlineControl?: boolean;
    children?: import('svelte').Snippet<[]>;
  }

  let {
    label,
    showPort = true,
    showModeButton = false,
    modeButtonIcon = 'equal',
    portId = '',
    portType = 'float',
    nodeId = '',
    paramName = '',
    portState = 'default',
    signalName = '',
    attachedDriverKind = null,
    liveValue = 0,
    supportsAudio,
    supportsAnimation,
    timelineDriven = false,
    onModeClick,
    onPortPointerDown,
    onPortDoubleClick,
    showDriverPowerToggle = false,
    driverBypassed = false,
    onDriverBypassToggle,
    disabled = false,
    class: className = '',
    inlineControl = false,
    children
  }: Props = $props();

  /** Graph/audio wires and non-wire drivers (animation lane, MIDI envelope) share connected row chrome. */
  const isConnected = $derived(
    portState === 'graph-connected' ||
      portState === 'audio-connected' ||
      attachedDriverKind === 'midi' ||
      attachedDriverKind === 'animation' ||
      timelineDriven
  );

  function handleModeClick() {
    if (disabled) return;
    onModeClick?.();
  }

  const driverPowerHelp = $derived(
    driverBypassed
      ? 'Power — driver bypassed for this parameter'
      : 'Power — bypass driver for this parameter'
  );

  function handleDriverPowerClick(e: MouseEvent) {
    e.stopPropagation();
    onDriverBypassToggle?.();
  }

  function handleDriverPowerMouseDownCapture(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDriverPowerPointerDown(e: PointerEvent) {
    e.stopPropagation();
  }
</script>

{#snippet portRowContent()}
  <div class="port-row" class:is-driver-bypassed={driverBypassed}>
    <div class="port-anchor">
      {#if showDriverPowerToggle}
        <button
          type="button"
          class="driver-power-toggle"
          aria-pressed={driverBypassed}
          aria-label={driverPowerHelp}
          title={driverPowerHelp}
          onmousedowncapture={handleDriverPowerMouseDownCapture}
          onclick={handleDriverPowerClick}
          onpointerdown={handleDriverPowerPointerDown}
        >
          <IconSvg name="power" class="driver-power-icon {driverBypassed ? 'is-dimmed' : ''}" />
        </button>
      {/if}
      <ParamPort
        {portId}
        {portType}
        {nodeId}
        {paramName}
        state={portState}
        {signalName}
        {attachedDriverKind}
        {timelineDriven}
        showSignalName={false}
        onPointerDown={onPortPointerDown}
        onDoubleClick={onPortDoubleClick}
        driverBypassed={driverBypassed}
        {disabled}
      />
    </div>
    {#if showModeButton && isConnected}
      <ModeButton
        icon={modeButtonIcon}
        connected={isConnected}
        {disabled}
        onclick={handleModeClick}
        ariaLabel={isConnected
          ? 'Parameter connected. Click to cycle mode.'
          : 'Parameter mode. Click when connected.'}
      />
    {/if}
    {#if portState === 'audio-connected' && signalName && !driverBypassed}
      <div class="signal">
        <span class="name">{signalName}</span>
        <div class="peak" role="img" aria-label="Input signal level">
          <div class="fill" style="width: {Math.max(0, Math.min(100, liveValue * 100))}%"></div>
        </div>
      </div>
    {/if}
  </div>
{/snippet}

<ParamCell
  connected={isConnected}
  {label}
  class={className}
  supportsAudio={supportsAudio}
  supportsAnimation={supportsAnimation}
  {inlineControl}
  {timelineDriven}
  leftBottom={showPort && !inlineControl ? portRowContent : undefined}
>
  {#snippet control()}
    {@render children?.()}
  {/snippet}
</ParamCell>

<style>
  :global(.left-column .bottom .port-anchor) {
    position: relative;
    display: inline-flex;
    flex-shrink: 0;
  }

  :global(.left-column .bottom .port-row.is-driver-bypassed .mode-button) {
    opacity: var(--opacity-disabled);
  }

  :global(.left-column .bottom .port-row.is-driver-bypassed .signal) {
    opacity: var(--opacity-disabled);
  }

  :global(.left-column .bottom .driver-power-toggle) {
    position: absolute;
    bottom: calc(100% + var(--pd-2xs));
    left: 50%;
    transform: translateX(-50%);
    z-index: 1;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin: 0;
    padding: var(--port-type-padding-vertical) var(--port-type-padding-horizontal);
    border: none;
    background: transparent;
    color: var(--param-label-color);
    cursor: default;
    font-size: var(--text-xl);
    line-height: 1;
    height: var(--size-md);
    white-space: nowrap;

    &:focus {
      outline: none;
    }

    &:focus-visible {
      outline: 2px solid var(--color-blue-90);
      outline-offset: var(--pd-2xs);
    }

    :global(.driver-power-icon) {
      display: inline-flex;
    }

    :global(.driver-power-icon svg) {
      width: 1.2em;
      height: 1.2em;
      min-width: 0;
      min-height: 0;
    }

    :global(.driver-power-icon.is-dimmed svg) {
      color: var(--color-blue-110);
    }
  }
</style>
