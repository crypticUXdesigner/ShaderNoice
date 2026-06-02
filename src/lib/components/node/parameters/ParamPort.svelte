<script lang="ts">
  import { IconSvg } from '../../ui';
  import { createStrictDoubleClickHandler } from '../../../utils/strictDoubleClick';
  import { getParameterDriverKindMeta } from '../../../../utils/parameterDriverKindMeta';

  const animationDriverIcon = getParameterDriverKindMeta('animation');
  const midiDriverIcon = getParameterDriverKindMeta('midi');
  const audioDriverIcon = getParameterDriverKindMeta('audio');
  export type ParamPortState = 'default' | 'graph-connected' | 'audio-connected';
  export type AttachedDriverKind = 'audio' | 'animation' | 'midi' | null;

  interface Props {
    portId: string;
    portType: string;
    /** For DOM-based hit testing when connecting (elementFromPoint) */
    nodeId?: string;
    paramName?: string;
    state?: ParamPortState;
    signalName?: string;
    /** Primary driver kind attached to this port (audio or animation). */
    attachedDriverKind?: AttachedDriverKind;
    /** When true, indicate the parameter is driven by timeline automation (not a connection). */
    timelineDriven?: boolean;
    /** When false, hide signal name in port (parent may show it elsewhere, e.g. bottom row) */
    showSignalName?: boolean;
    /** Start connection drag from port */
    onPointerDown?: (e: PointerEvent) => void;
    /** Open connection menu (signal picker); strict double-click (MouseEvent). */
    onDoubleClick?: (e: MouseEvent) => void;
    /** Driver bypassed but still connected — dim port chrome. */
    driverBypassed?: boolean;
    disabled?: boolean;
    class?: string;
  }

  let {
    portId,
    portType,
    nodeId = '',
    paramName = '',
    state = 'default',
    signalName = '',
    attachedDriverKind = null,
    timelineDriven = false,
    showSignalName = true,
    onPointerDown,
    onDoubleClick,
    driverBypassed = false,
    disabled = false,
    class: className = ''
  }: Props = $props();

  function getA11yText(opts: { includeInstructions: boolean }) {
    const parts: string[] = [];
    const hasAnimationDriver = attachedDriverKind === 'animation' || timelineDriven;
    const hasAudioDriver = attachedDriverKind === 'audio' || state === 'audio-connected';
    const hasMidiDriver = attachedDriverKind === 'midi';

    if (hasAnimationDriver) {
      parts.push('Animation driver.');
    }

    if (hasMidiDriver) {
      parts.push('MIDI driver.');
    }

    if (hasAudioDriver) {
      parts.push(
        signalName ? `Audio driver: ${signalName}.` : 'Audio driver.'
      );
    } else if (state === 'graph-connected') {
      parts.push('Port connected to graph.');
    } else if (state === 'default' && !hasAnimationDriver && !hasMidiDriver) {
      parts.push('Port not connected.');
    }

    if (opts.includeInstructions) {
      parts.push(
        hasAnimationDriver || hasAudioDriver || hasMidiDriver
          ? 'Double-click to edit driver.'
          : 'Double-click to add driver.'
      );
    }

    return parts.join(' ');
  }

  function getAriaLabel() {
    return getA11yText({ includeInstructions: true });
  }

  function getTooltipText() {
    return getA11yText({ includeInstructions: false });
  }

  function handlePointerDown(e: PointerEvent) {
    if (disabled) return;
    onPointerDown?.(e);
  }

  function handleStrictDoubleClickOpen(e: MouseEvent) {
    if (disabled) return;
    e.stopPropagation();
    onDoubleClick?.(e);
  }

  const strictPortDoubleClick = createStrictDoubleClickHandler((e: MouseEvent) =>
    handleStrictDoubleClickOpen(e)
  );
</script>

<button
  type="button"
  class="param-port {state} type-{portType} {className}"
  class:disabled
  class:is-driver-bypassed={driverBypassed}
  class:driver-kind-audio={attachedDriverKind === 'audio'}
  class:driver-kind-animation={attachedDriverKind === 'animation' || timelineDriven}
  class:driver-kind-midi={attachedDriverKind === 'midi'}
  data-port-id={portId}
  data-port-type={portType}
  data-node-id={nodeId}
  data-param-name={paramName}
  data-state={state}
  onpointerdown={handlePointerDown}
  onclick={strictPortDoubleClick}
  aria-label={getAriaLabel()}
  aria-disabled={disabled}
  title={getTooltipText()}
>
  <span class="port-circle" aria-hidden="true">
    {#if attachedDriverKind === 'animation' || timelineDriven}
      <IconSvg
        name={animationDriverIcon.icon}
        variant={animationDriverIcon.iconVariant ?? 'line'}
        class="port-animation-icon"
      />
    {:else if attachedDriverKind === 'midi'}
      <IconSvg
        name={midiDriverIcon.icon}
        variant={midiDriverIcon.iconVariant ?? 'line'}
        class="port-midi-icon"
      />
    {:else if attachedDriverKind === 'audio' || state === 'audio-connected'}
      <IconSvg
        name={audioDriverIcon.icon}
        variant={audioDriverIcon.iconVariant ?? 'line'}
        class="port-audio-icon"
      />
    {/if}
  </span>
  {#if showSignalName && state === 'audio-connected' && signalName}
    <span class="signal-name">{signalName}</span>
  {/if}
</button>

<style>
  .param-port {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--pd-xs);
    padding: 0;
    width: var(--param-port-circle-size);
    height: var(--param-port-circle-size);
    min-width: var(--param-port-circle-size);
    min-height: var(--param-port-circle-size);
    border: none;
    background: transparent;
    cursor: default;
    font-family: inherit;
    transition: opacity var(--motion-effects-fast-duration) var(--motion-effects-fast-easing);

    &:disabled {
      opacity: var(--opacity-disabled);
      cursor: not-allowed;
    }

    &.is-driver-bypassed:not(:disabled) {
      opacity: var(--opacity-disabled);
    }

    &:focus {
      outline: none;
    }

    &:focus-visible {
      outline: 2px solid var(--color-blue-90);
      outline-offset: 2px;
    }

    --param-port-icon-stroke-width: 1.5;

    .port-circle {
      --port-color: var(--port-color-float);
      --shadow-color: var(--port-color-float);
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: var(--param-port-circle-size);
      height: var(--param-port-circle-size);
      border-radius: 50%;
      background: var(--port-color);
      border: 1px solid rgba(255, 255, 255, 0.3);
      box-shadow: 0 0 2px 6px color-mix(in srgb, var(--shadow-color) 30%, transparent 70%);
      transition:
        background var(--motion-effects-fast-duration) var(--motion-effects-fast-easing),
        box-shadow var(--motion-effects-fast-duration) var(--motion-effects-fast-easing),
        transform var(--motion-effects-fast-duration) var(--motion-effects-fast-easing);

      :global(.port-audio-icon),
      :global(.port-animation-icon),
      :global(.port-midi-icon) {
        width: var(--icon-size-sm);
        height: var(--icon-size-sm);
        color: currentColor;
      }

      :global(.port-audio-icon svg),
      :global(.port-audio-icon svg *),
      :global(.port-animation-icon svg),
      :global(.port-animation-icon svg *),
      :global(.port-midi-icon svg),
      :global(.port-midi-icon svg *) {
        stroke-width: 3;
      }
    }

    &.type-vec2 .port-circle {
      --port-color: var(--port-color-vec2);
      --shadow-color: var(--port-color-vec2);
    }

    &.type-vec3 .port-circle {
      --port-color: var(--port-color-vec3);
      --shadow-color: var(--port-color-vec3);
    }

    &.type-vec4 .port-circle {
      --port-color: var(--port-color-vec4);
      --shadow-color: var(--port-color-vec4);
    }

    &.graph-connected .port-circle,
    &.audio-connected .port-circle {
      --port-color: var(--port-connected-color-float);
    }

    &.graph-connected.type-vec2 .port-circle,
    &.audio-connected.type-vec2 .port-circle {
      --port-color: var(--port-connected-color-vec2);
    }

    &.graph-connected.type-vec3 .port-circle,
    &.audio-connected.type-vec3 .port-circle {
      --port-color: var(--port-connected-color-vec3);
    }

    &.graph-connected.type-vec4 .port-circle,
    &.audio-connected.type-vec4 .port-circle {
      --port-color: var(--port-connected-color-vec4);
    }

    &.driver-kind-audio .port-circle,
    &.driver-kind-audio.graph-connected .port-circle,
    &.driver-kind-audio.audio-connected .port-circle,
    &.driver-kind-audio.type-vec2 .port-circle,
    &.driver-kind-audio.type-vec3 .port-circle,
    &.driver-kind-audio.type-vec4 .port-circle {
      --port-color: var(--driver-kind-audio-port-bg);
      --shadow-color: var(--driver-kind-audio-accent);
      color: var(--driver-kind-audio-port-icon);
      border-color: var(--driver-kind-audio-port-border);
    }

    &.driver-kind-animation .port-circle,
    &.driver-kind-animation.graph-connected .port-circle,
    &.driver-kind-animation.audio-connected .port-circle,
    &.driver-kind-animation.type-vec2 .port-circle,
    &.driver-kind-animation.type-vec3 .port-circle,
    &.driver-kind-animation.type-vec4 .port-circle {
      --port-color: var(--driver-kind-animation-port-bg);
      --shadow-color: var(--driver-kind-animation-accent);
      color: var(--driver-kind-animation-port-icon);
      border-color: var(--driver-kind-animation-port-border);
    }

    &.driver-kind-midi .port-circle,
    &.driver-kind-midi.graph-connected .port-circle,
    &.driver-kind-midi.audio-connected .port-circle,
    &.driver-kind-midi.type-vec2 .port-circle,
    &.driver-kind-midi.type-vec3 .port-circle,
    &.driver-kind-midi.type-vec4 .port-circle {
      --port-color: var(--driver-kind-midi-port-bg);
      --shadow-color: var(--driver-kind-midi-accent);
      color: var(--driver-kind-midi-port-icon);
      border-color: var(--driver-kind-midi-port-border);
    }

    &:not(:disabled):not(.driver-kind-audio):not(.driver-kind-animation):not(.driver-kind-midi):hover
      .port-circle {
      background: var(--port-hover-color);
      transform: scale(1.15);
      box-shadow: 0 0 2px 6px var(--color-teal-gray-40);
    }

    &:not(:disabled).driver-kind-audio:hover .port-circle {
      transform: scale(1.15);
      background: var(--driver-kind-audio-port-bg-hover);
      color: var(--driver-kind-audio-port-icon-hover);
      box-shadow: 0 0 2px 6px var(--driver-kind-audio-accent-glow);
    }

    &:not(:disabled).driver-kind-animation:hover .port-circle {
      transform: scale(1.15);
      background: var(--driver-kind-animation-port-bg-hover);
      color: var(--driver-kind-animation-port-icon-hover);
      box-shadow: 0 0 2px 6px var(--driver-kind-animation-accent-glow);
    }

    &:not(:disabled).driver-kind-midi:hover .port-circle {
      transform: scale(1.15);
      background: var(--driver-kind-midi-port-bg-hover);
      color: var(--driver-kind-midi-port-icon-hover);
      box-shadow: 0 0 2px 6px var(--driver-kind-midi-accent-glow);
    }

    .signal-name {
      font-size: var(--text-xs);
      font-weight: 500;
      color: var(--port-type-text-float);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 80px;
    }
  }
</style>
