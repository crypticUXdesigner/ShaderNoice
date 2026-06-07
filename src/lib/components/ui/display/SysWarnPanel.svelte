<script lang="ts">
  import type { SysWarnDisplayLine, SysWarnLineVariant, SysWarnMenuAction } from './appSplashSysWarnScript';

  interface Props {
    lines: SysWarnDisplayLine[];
    statusLabel: string;
    ariaLabel: string;
    channel?: string;
    headerReady?: boolean;
    isTyping?: boolean;
    typingDone?: boolean;
    settled?: boolean;
    isLive?: boolean;
    /** Blink status + prompt while the splash waits for user input. */
    awaitUserInput?: boolean;
    activePrefix?: string;
    activeText?: string;
    activeVariant?: SysWarnLineVariant;
    activeMenuAction?: SysWarnDisplayLine['menuAction'];
    selectedMenuAction?: SysWarnMenuAction | null;
    showCursor?: boolean;
    /** Blinking cursor on the last completed line while awaiting user input. */
    showIdleCursor?: boolean;
    /** Parent overlay outro — disable chrome motion so group fade stays aligned. */
    dismissing?: boolean;
    /** Header accent tag (default WARN); use HINT for guide hooks. */
    tagLabel?: string;
    /** Footer command rows (interactive — not aria-hidden). */
    footer?: import('svelte').Snippet;
    /** Fade in footer after auth / follow-up typing settles. */
    commandsReady?: boolean;
    onMenuSignIn?: () => void;
    onMenuGuest?: () => void;
    menuBootstrapping?: boolean;
    id?: string;
    class?: string;
  }

  let {
    lines,
    statusLabel,
    ariaLabel,
    channel = 'system',
    headerReady = true,
    isTyping = false,
    typingDone = true,
    settled = true,
    isLive = false,
    awaitUserInput = false,
    activePrefix = '',
    activeText = '',
    activeVariant = 'boot',
    activeMenuAction = undefined,
    selectedMenuAction = null,
    showCursor = false,
    showIdleCursor = false,
    dismissing = false,
    tagLabel = 'WARN',
    footer,
    commandsReady = false,
    onMenuSignIn,
    onMenuGuest,
    menuBootstrapping = false,
    id,
    class: className = '',
  }: Props = $props();

  function handleMenuAction(
    action: NonNullable<import('./appSplashSysWarnScript').SysWarnDisplayLine['menuAction']>,
    e: MouseEvent,
  ): void {
    e.stopPropagation();
    if (!commandsReady || menuBootstrapping) return;
    if (action === 'signin') onMenuSignIn?.();
    if (action === 'guest') onMenuGuest?.();
  }

  const lastLineIndex = $derived(Math.max(0, lines.length - 1));
  const hasMenuLines = $derived(lines.some((line) => line.variant === 'menu'));
  const showMenuIdleCursor = $derived(showIdleCursor && hasMenuLines && selectedMenuAction == null);
  const showPromptIdleCursor = $derived(showIdleCursor && !hasMenuLines);
</script>

<div
  class="sys-warn {className}"
  class:sys-warn--live={isLive}
  class:sys-warn--header-ready={headerReady}
  class:sys-warn--typing={isTyping}
  class:sys-warn--done={typingDone}
  class:sys-warn--settled={settled}
  class:sys-warn--dismissing={dismissing}
  class:sys-warn--has-cmd={footer != null}
  class:sys-warn--await-input={awaitUserInput}
  class:sys-warn--idle-cursor={showIdleCursor}
  {id}
  role="note"
  aria-label={ariaLabel}
>
  <div class="sys-warn__chrome" aria-hidden="true">
    <span class="sys-warn__scan"></span>
    <span class="sys-warn__grid"></span>
    <span class="sys-warn__edge"></span>
  </div>

  <span class="sys-warn__corner sys-warn__corner--tl" aria-hidden="true"></span>
  <span class="sys-warn__corner sys-warn__corner--tr" aria-hidden="true"></span>
  <span class="sys-warn__corner sys-warn__corner--bl" aria-hidden="true"></span>
  <span class="sys-warn__corner sys-warn__corner--br" aria-hidden="true"></span>

  <header class="sys-warn__head" aria-hidden="true">
    <div class="sys-warn__head-row">
      <span class="sys-warn__sigil">◈</span>
      <span class="sys-warn__channel-label">SYS</span>
      <span class="sys-warn__channel-sep">/</span>
      <span class="sys-warn__channel">{channel}</span>
      <span class="sys-warn__status">{statusLabel}</span>
    </div>
    <div class="sys-warn__head-accent">
      <span class="sys-warn__tag">{tagLabel}</span>
    </div>
  </header>

  <div class="sys-warn__divider" aria-hidden="true"></div>

  <div class="sys-warn__body" aria-hidden="true">
    {#each lines as line, index (String(index) + line.variant + line.text)}
      {#if line.variant === 'menu' && line.menuAction}
        <button
          type="button"
          class="sys-warn__line sys-warn__line--menu"
          class:sys-warn__line--menu-selected={selectedMenuAction === line.menuAction}
          disabled={!commandsReady || menuBootstrapping}
          onclick={(e) => handleMenuAction(line.menuAction, e)}
        >
          <span class="sys-warn__prefix" aria-hidden="true">{line.prefix}&nbsp;</span>
          <span class="sys-warn__text">{line.text}</span>
        </button>
      {:else}
        <p
          class="sys-warn__line"
          class:sys-warn__line--boot={line.variant === 'boot'}
          class:sys-warn__line--msg={line.variant === 'msg'}
          class:sys-warn__line--prompt={line.variant === 'prompt'}
          class:sys-warn__line--error={line.variant === 'error'}
        >
          <span class="sys-warn__prefix">{line.prefix}&nbsp;</span>
          <span class="sys-warn__text">{line.text}</span>
          {#if showPromptIdleCursor && index === lastLineIndex}
            <span class="sys-warn__cursor" aria-hidden="true">▮</span>
          {/if}
        </p>
      {/if}
    {/each}

    {#if showMenuIdleCursor}
      <p class="sys-warn__line sys-warn__line--menu-idle" aria-hidden="true">
        <span class="sys-warn__prefix" aria-hidden="true">      &nbsp;</span>
        <span class="sys-warn__cursor">▮</span>
      </p>
    {/if}

    {#if isTyping && (activeText.length > 0 || activePrefix.length > 0 || showCursor)}
      {#if activeVariant === 'menu' && activeMenuAction}
        <button
          type="button"
          class="sys-warn__line sys-warn__line--menu"
          class:sys-warn__line--menu-selected={selectedMenuAction === activeMenuAction}
          disabled
        >
          {#if activePrefix}
            <span class="sys-warn__prefix" aria-hidden="true">{activePrefix}&nbsp;</span>
          {/if}
          <span class="sys-warn__text">{activeText}</span>
          {#if showCursor}
            <span class="sys-warn__cursor">▮</span>
          {/if}
        </button>
      {:else}
        <p
          class="sys-warn__line"
          class:sys-warn__line--boot={activeVariant === 'boot'}
          class:sys-warn__line--msg={activeVariant === 'msg'}
          class:sys-warn__line--prompt={activeVariant === 'prompt'}
          class:sys-warn__line--error={activeVariant === 'error'}
        >
          {#if activePrefix}
            <span class="sys-warn__prefix">{activePrefix}&nbsp;</span>
          {/if}
          <span class="sys-warn__text">{activeText}</span>
          {#if showCursor}
            <span class="sys-warn__cursor">▮</span>
          {/if}
        </p>
      {/if}
    {/if}
  </div>

  {#if footer}
    <div
      class="sys-warn__cmd"
      class:sys-warn__cmd--ready={commandsReady}
      aria-live="polite"
    >
      {@render footer()}
    </div>
  {/if}
</div>

<style>
  .sys-warn {
    --sys-warn-corner: 0.72rem;
    --sys-warn-bracket: 2px;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: var(--pd-xs);
    width: 100%;
    max-width: 22rem;
    margin: 0;
    padding: calc(var(--pd-sm) + 2px) var(--pd-md) var(--pd-sm);
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--sys-warn-hud-border) 72%, transparent);
    border-radius: 2px;
    background:
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--sys-warn-hud-frame) 10%, transparent) 0%,
        transparent 18%
      ),
      color-mix(in srgb, var(--sys-warn-hud-bg) 92%, var(--layout-bg));
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, var(--sys-warn-hud-frame) 18%, transparent),
      inset 0 0 0 1px color-mix(in srgb, var(--print-light) 4%, transparent),
      0 0 0 1px color-mix(in srgb, var(--layout-bg) 40%, transparent),
      0 10px 28px color-mix(in srgb, var(--layout-bg) 55%, transparent),
      0 0 24px color-mix(in srgb, var(--sys-warn-hud-frame) 8%, transparent);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    line-height: 1.45;
    text-align: left;
    box-sizing: border-box;
    color: var(--sys-warn-hud-color);
    isolation: isolate;
    transition:
      opacity 280ms ease,
      transform 280ms ease,
      box-shadow var(--motion-effects-normal-duration) ease,
      border-color var(--motion-effects-normal-duration) ease,
      filter var(--motion-effects-normal-duration) ease;
  }

  .sys-warn--has-cmd {
    max-width: 24rem;
  }

  .sys-warn:not(.sys-warn--header-ready):not(.sys-warn--dismissing) {
    opacity: 0;
    transform: translateY(10px);
    height: 0;
    padding: 0;
    border-width: 0;
    overflow: hidden;
    pointer-events: none;
    box-shadow: none;
    background: transparent;
  }

  .sys-warn:not(.sys-warn--header-ready) .sys-warn__body {
    min-height: 0;
  }

  .sys-warn.sys-warn--header-ready {
    transform: translateY(0);
  }

  .sys-warn--live {
    animation: sys-warn-shell-flicker 5.6s steps(1, end) infinite;
  }

  .sys-warn--live.sys-warn--typing {
    animation:
      sys-warn-shell-flicker 5.6s steps(1, end) infinite,
      sys-warn-border-pulse 1.4s ease-in-out infinite;
  }

  .sys-warn--settled {
    animation: none;
    filter: brightness(0.99);
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, var(--sys-warn-hud-frame) 12%, transparent),
      inset 0 0 0 1px color-mix(in srgb, var(--print-light) 3%, transparent),
      0 0 0 1px color-mix(in srgb, var(--layout-bg) 35%, transparent),
      0 8px 20px color-mix(in srgb, var(--layout-bg) 50%, transparent),
      0 0 14px color-mix(in srgb, var(--sys-warn-hud-frame) 5%, transparent);
  }

  .sys-warn--settled .sys-warn__scan {
    opacity: 0.12;
    animation-duration: 7s;
  }

  .sys-warn__chrome {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    overflow: hidden;
    border-radius: inherit;
  }

  .sys-warn__scan {
    position: absolute;
    inset: -120% 0;
    background: linear-gradient(
      to bottom,
      transparent 0%,
      color-mix(in srgb, var(--sys-warn-hud-frame) 6%, transparent) 48%,
      color-mix(in srgb, var(--sys-warn-hud-accent) 12%, transparent) 50%,
      color-mix(in srgb, var(--sys-warn-hud-frame) 6%, transparent) 52%,
      transparent 100%
    );
    opacity: 0.42;
    animation: sys-warn-scan 3.8s linear infinite;
    transition: opacity var(--motion-effects-normal-duration) ease;
  }

  .sys-warn__grid {
    position: absolute;
    inset: 0;
    background:
      repeating-linear-gradient(
        0deg,
        color-mix(in srgb, var(--sys-warn-hud-frame) 5%, transparent) 0,
        color-mix(in srgb, var(--sys-warn-hud-frame) 5%, transparent) 1px,
        transparent 1px,
        transparent 4px
      ),
      repeating-linear-gradient(
        90deg,
        color-mix(in srgb, var(--sys-warn-hud-frame) 3%, transparent) 0,
        color-mix(in srgb, var(--sys-warn-hud-frame) 3%, transparent) 1px,
        transparent 1px,
        transparent 16px
      );
    opacity: 0.22;
    mix-blend-mode: soft-light;
  }

  .sys-warn__edge {
    position: absolute;
    inset: 0 auto auto 0;
    width: 100%;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      color-mix(in srgb, var(--sys-warn-hud-accent) 45%, transparent) 18%,
      color-mix(in srgb, var(--sys-warn-hud-signal) 70%, transparent) 50%,
      color-mix(in srgb, var(--sys-warn-hud-accent) 45%, transparent) 82%,
      transparent 100%
    );
    opacity: 0.55;
  }

  .sys-warn__corner {
    position: absolute;
    width: var(--sys-warn-corner);
    height: var(--sys-warn-corner);
    pointer-events: none;
    z-index: 2;
    opacity: 0.82;
    transition: opacity var(--motion-effects-normal-duration) ease;
  }

  .sys-warn__corner::before,
  .sys-warn__corner::after {
    content: '';
    position: absolute;
    background: var(--sys-warn-hud-frame);
    box-shadow: 0 0 8px color-mix(in srgb, var(--sys-warn-hud-frame) 35%, transparent);
  }

  .sys-warn__corner--tl {
    top: 5px;
    left: 5px;
  }

  .sys-warn__corner--tl::before {
    top: 0;
    left: 0;
    width: var(--sys-warn-corner);
    height: var(--sys-warn-bracket);
  }

  .sys-warn__corner--tl::after {
    top: 0;
    left: 0;
    width: var(--sys-warn-bracket);
    height: var(--sys-warn-corner);
  }

  .sys-warn__corner--tr {
    top: 5px;
    right: 5px;
  }

  .sys-warn__corner--tr::before {
    top: 0;
    right: 0;
    width: var(--sys-warn-corner);
    height: var(--sys-warn-bracket);
  }

  .sys-warn__corner--tr::after {
    top: 0;
    right: 0;
    width: var(--sys-warn-bracket);
    height: var(--sys-warn-corner);
  }

  .sys-warn__corner--bl {
    bottom: 5px;
    left: 5px;
  }

  .sys-warn__corner--bl::before {
    bottom: 0;
    left: 0;
    width: var(--sys-warn-corner);
    height: var(--sys-warn-bracket);
  }

  .sys-warn__corner--bl::after {
    bottom: 0;
    left: 0;
    width: var(--sys-warn-bracket);
    height: var(--sys-warn-corner);
  }

  .sys-warn__corner--br {
    bottom: 5px;
    right: 5px;
  }

  .sys-warn__corner--br::before {
    bottom: 0;
    right: 0;
    width: var(--sys-warn-corner);
    height: var(--sys-warn-bracket);
  }

  .sys-warn__corner--br::after {
    bottom: 0;
    right: 0;
    width: var(--sys-warn-bracket);
    height: var(--sys-warn-corner);
  }

  .sys-warn--settled .sys-warn__corner {
    opacity: 0.58;
  }

  .sys-warn__head,
  .sys-warn__divider,
  .sys-warn__body,
  .sys-warn__cmd {
    position: relative;
    z-index: 1;
  }

  .sys-warn__body {
    display: flex;
    flex-direction: column;
    gap: 0.15em;
    min-height: 6.35em;
  }

  .sys-warn--has-cmd .sys-warn__body {
    min-height: 6.35em;
  }

  .sys-warn__head {
    display: flex;
    flex-direction: column;
    gap: 0.35em;
    opacity: 0;
    transform: translateY(2px);
    transition:
      opacity 180ms ease,
      transform 180ms ease;
  }

  .sys-warn--header-ready .sys-warn__head {
    opacity: 1;
    transform: translateY(0);
  }

  .sys-warn__head-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.28em;
    font-size: var(--text-2xs);
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--sys-warn-hud-signal);
  }

  .sys-warn__sigil {
    color: var(--sys-warn-hud-accent);
    text-shadow: 0 0 10px color-mix(in srgb, var(--sys-warn-hud-accent) 45%, transparent);
    font-size: 0.95em;
    line-height: 1;
  }

  .sys-warn__channel-label {
    color: var(--sys-warn-hud-accent);
  }

  .sys-warn__channel-sep {
    color: var(--sys-warn-hud-muted);
    opacity: 0.55;
  }

  .sys-warn__channel {
    color: var(--sys-warn-hud-color);
    opacity: 0.92;
  }

  .sys-warn__status {
    margin-left: auto;
    font-size: 0.92em;
    letter-spacing: 0.14em;
    color: var(--sys-warn-hud-muted);
    opacity: 0;
  }

  .sys-warn--typing .sys-warn__status,
  .sys-warn--done .sys-warn__status {
    opacity: 0.95;
    color: var(--sys-warn-hud-accent);
  }

  .sys-warn--typing .sys-warn__status {
    animation: sys-warn-status-pulse 900ms ease-in-out infinite;
  }

  .sys-warn--settled .sys-warn__status {
    opacity: 0.62;
    animation: none;
    color: var(--sys-warn-hud-muted);
  }

  .sys-warn--await-input .sys-warn__status {
    opacity: 1;
    color: var(--sys-warn-hud-signal);
    animation: sys-warn-await-blink 1.05s steps(1, end) infinite;
  }

  .sys-warn__head-accent {
    display: flex;
    align-items: center;
  }

  .sys-warn__tag {
    display: inline-flex;
    align-items: center;
    padding: 0.08em 0.45em;
    border: 1px solid color-mix(in srgb, var(--sys-warn-hud-warn) 42%, transparent);
    border-radius: 1px;
    background: color-mix(in srgb, var(--sys-warn-hud-warn) 10%, transparent);
    font-size: 0.78em;
    font-weight: 700;
    letter-spacing: 0.16em;
    color: var(--sys-warn-hud-warn);
    text-shadow: 0 0 10px color-mix(in srgb, var(--sys-warn-hud-warn) 35%, transparent);
  }

  .sys-warn--live.sys-warn--header-ready .sys-warn__tag {
    animation: sys-warn-tag-blink 720ms steps(2, end) 2;
  }

  .sys-warn__divider {
    height: 1px;
    margin: 0.05em 0 0.1em;
    background: linear-gradient(
      90deg,
      color-mix(in srgb, var(--sys-warn-hud-frame) 55%, transparent) 0%,
      color-mix(in srgb, var(--sys-warn-hud-accent) 18%, transparent) 50%,
      transparent 100%
    );
    opacity: 0.75;
  }

  .sys-warn--dismissing,
  .sys-warn--dismissing .sys-warn__scan,
  .sys-warn--dismissing .sys-warn__tag,
  .sys-warn--dismissing .sys-warn__status,
  .sys-warn--dismissing .sys-warn__text,
  .sys-warn--dismissing .sys-warn__cursor {
    animation: none !important;
    transition: none !important;
  }

  .sys-warn--dismissing {
    filter: none;
  }

  .sys-warn__line {
    margin: 0;
    min-height: 1.45em;
    color: var(--sys-warn-hud-muted);
    font-weight: 400;
    letter-spacing: 0.04em;
    word-break: break-word;
  }

  .sys-warn__line--boot {
    font-size: var(--text-2xs);
    color: var(--sys-warn-hud-muted);
    opacity: 0.78;
    letter-spacing: 0.05em;
  }

  .sys-warn__line--boot .sys-warn__text {
    color: var(--sys-warn-hud-color);
    text-shadow: none;
  }

  .sys-warn__line--msg .sys-warn__text {
    color: var(--sys-warn-hud-signal);
    text-shadow:
      0 0 8px color-mix(in srgb, var(--sys-warn-hud-accent) 22%, transparent),
      1px 0 0 color-mix(in srgb, var(--sys-warn-hud-accent) 12%, transparent),
      -1px 0 0 color-mix(in srgb, var(--sys-warn-hud-frame) 16%, transparent);
  }

  .sys-warn__line--prompt {
    min-height: 1.45em;
  }

  .sys-warn__line--prompt .sys-warn__prefix {
    color: var(--sys-warn-hud-warn);
    opacity: 0.92;
  }

  .sys-warn__line--prompt .sys-warn__text {
    color: color-mix(in srgb, var(--sys-warn-hud-warn) 78%, var(--sys-warn-hud-signal));
    text-shadow: 0 0 10px color-mix(in srgb, var(--sys-warn-hud-warn) 28%, transparent);
    letter-spacing: 0.06em;
  }

  button.sys-warn__line--menu {
    display: flex;
    align-items: baseline;
    gap: 0;
    width: 100%;
    margin-block: 0;
    margin-inline: 0;
    padding: 0.06em 0.12em;
    border: none;
    border-radius: 0;
    background: transparent;
    text-align: left;
    box-sizing: border-box;
    cursor: default;
    outline: none;
    color: var(--sys-warn-hud-color);
    opacity: 0.92;
    font: inherit;
    letter-spacing: inherit;
    transition:
      background var(--motion-effects-fast-duration) ease,
      box-shadow var(--motion-effects-fast-duration) ease,
      color var(--motion-effects-fast-duration) ease,
      opacity var(--motion-effects-fast-duration) ease;
  }

  button.sys-warn__line--menu .sys-warn__prefix {
    min-width: 1.35em;
    color: color-mix(in srgb, var(--sys-warn-hud-muted) 72%, transparent);
    opacity: 0.55;
  }

  button.sys-warn__line--menu .sys-warn__text {
    color: var(--sys-warn-hud-signal);
    font-weight: 500;
    letter-spacing: 0.06em;
  }

  button.sys-warn__line--menu.sys-warn__line--menu-selected {
    background: color-mix(in srgb, var(--sys-warn-hud-signal) 14%, transparent);
    box-shadow:
      inset 2px 0 0 var(--sys-warn-hud-signal),
      inset 0 0 0 1px color-mix(in srgb, var(--sys-warn-hud-signal) 22%, transparent);
  }

  button.sys-warn__line--menu.sys-warn__line--menu-selected .sys-warn__prefix {
    position: relative;
    color: transparent;
    opacity: 1;
  }

  button.sys-warn__line--menu.sys-warn__line--menu-selected .sys-warn__prefix::after {
    content: '>';
    position: absolute;
    left: 0;
    top: 0;
    color: var(--sys-warn-hud-signal);
    text-shadow: 0 0 8px color-mix(in srgb, var(--sys-warn-hud-signal) 35%, transparent);
  }

  button.sys-warn__line--menu.sys-warn__line--menu-selected .sys-warn__text {
    color: var(--layout-bg);
    background: var(--sys-warn-hud-signal);
    padding: 0.02em 0.28em 0.04em;
    box-shadow: 0 0 14px color-mix(in srgb, var(--sys-warn-hud-signal) 42%, transparent);
    text-shadow: none;
  }

  .sys-warn__line--prompt + button.sys-warn__line--menu {
    margin-top: var(--pd-md);
  }

  .sys-warn__body > button.sys-warn__line--menu:last-child {
    margin-bottom: var(--pd-md);
  }

  .sys-warn__body > button.sys-warn__line--menu + button.sys-warn__line--menu {
    margin-top: -0.05em;
  }

  .sys-warn__line--menu-idle {
    display: flex;
    align-items: baseline;
    gap: 0;
    min-height: 1.45em;
    margin-top: 0.05em;
    margin-bottom: 0;
    padding: 0.06em 0.12em;
    opacity: 0.92;
  }

  .sys-warn__line--menu-idle .sys-warn__prefix {
    flex: 0 0 auto;
    min-width: 1.35em;
    color: transparent;
    opacity: 0;
    user-select: none;
  }

  button.sys-warn__line--menu:disabled {
    cursor: default;
  }

  button.sys-warn__line--menu:hover:not(:disabled):not(.sys-warn__line--menu-selected) .sys-warn__text {
    color: var(--sys-warn-hud-accent);
    text-shadow: 0 0 8px color-mix(in srgb, var(--sys-warn-hud-accent) 28%, transparent);
  }

  button.sys-warn__line--menu:focus-visible:not(.sys-warn__line--menu-selected) {
    box-shadow: inset 2px 0 0 color-mix(in srgb, var(--sys-warn-hud-accent) 55%, transparent);
  }

  .sys-warn--await-input .sys-warn__line--prompt .sys-warn__text {
    animation: sys-warn-await-blink 1.05s steps(1, end) infinite;
  }

  .sys-warn--typing .sys-warn__line--msg .sys-warn__text {
    animation: sys-warn-text-glitch 2.8s steps(1, end) infinite;
  }

  .sys-warn__line--error {
    margin-top: 0.1em;
    padding-top: 0.25em;
    border-top: 1px solid color-mix(in srgb, var(--sys-warn-hud-warn) 28%, transparent);
  }

  .sys-warn__line--error .sys-warn__prefix {
    color: var(--sys-warn-hud-warn);
    opacity: 1;
  }

  .sys-warn__line--error .sys-warn__text {
    color: color-mix(in srgb, var(--sys-warn-hud-warn) 82%, var(--sys-warn-hud-signal));
    text-shadow: 0 0 8px color-mix(in srgb, var(--sys-warn-hud-warn) 24%, transparent);
  }

  .sys-warn__prefix {
    color: color-mix(in srgb, var(--sys-warn-hud-accent) 48%, var(--sys-warn-hud-muted));
    opacity: 0.76;
    letter-spacing: 0.06em;
  }

  .sys-warn__cursor {
    display: inline-block;
    margin-left: 1px;
    color: var(--sys-warn-hud-accent);
    font-size: 0.88em;
    vertical-align: baseline;
    text-shadow: 0 0 10px color-mix(in srgb, var(--sys-warn-hud-accent) 55%, transparent);
    animation: sys-warn-cursor-blink 760ms steps(1, end) infinite;
  }

  .sys-warn__cmd {
    display: flex;
    flex-direction: column;
    gap: var(--pd-xs);
    min-height: 3.25rem;
    margin-top: 0.15em;
    padding-top: var(--pd-sm);
    border-top: 1px solid color-mix(in srgb, var(--sys-warn-hud-frame) 38%, transparent);
    opacity: 0;
    pointer-events: none;
    transform: translateY(2px);
    transition:
      opacity 220ms ease,
      transform 220ms ease;
  }

  .sys-warn__cmd--ready {
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0);
    animation: sys-warn-cmd-in 260ms ease;
  }

  @keyframes sys-warn-cmd-in {
    0% {
      opacity: 0;
      transform: translateY(4px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes sys-warn-scan {
    0% {
      transform: translateY(-35%);
    }
    100% {
      transform: translateY(35%);
    }
  }

  @keyframes sys-warn-shell-flicker {
    0%,
    100% {
      filter: brightness(1);
    }
    48% {
      filter: brightness(1);
    }
    49% {
      filter: brightness(0.96);
    }
    50% {
      filter: brightness(1.03);
    }
    51% {
      filter: brightness(0.98);
    }
    87% {
      filter: brightness(1);
    }
    88% {
      filter: brightness(0.94);
    }
  }

  @keyframes sys-warn-border-pulse {
    0%,
    100% {
      border-color: color-mix(in srgb, var(--sys-warn-hud-border) 72%, transparent);
      box-shadow:
        inset 0 1px 0 color-mix(in srgb, var(--sys-warn-hud-frame) 18%, transparent),
        inset 0 0 0 1px color-mix(in srgb, var(--print-light) 4%, transparent),
        0 0 0 1px color-mix(in srgb, var(--layout-bg) 40%, transparent),
        0 10px 28px color-mix(in srgb, var(--layout-bg) 55%, transparent),
        0 0 18px color-mix(in srgb, var(--sys-warn-hud-frame) 8%, transparent);
    }
    50% {
      border-color: color-mix(in srgb, var(--sys-warn-hud-accent) 42%, var(--sys-warn-hud-border));
      box-shadow:
        inset 0 1px 0 color-mix(in srgb, var(--sys-warn-hud-signal) 24%, transparent),
        inset 0 0 0 1px color-mix(in srgb, var(--sys-warn-hud-accent) 10%, transparent),
        0 0 0 1px color-mix(in srgb, var(--layout-bg) 35%, transparent),
        0 12px 32px color-mix(in srgb, var(--layout-bg) 58%, transparent),
        0 0 28px color-mix(in srgb, var(--sys-warn-hud-accent) 14%, transparent);
    }
  }

  @keyframes sys-warn-tag-blink {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.2;
    }
  }

  @keyframes sys-warn-status-pulse {
    0%,
    100% {
      opacity: 0.55;
    }
    50% {
      opacity: 1;
    }
  }

  @keyframes sys-warn-await-blink {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.28;
    }
  }

  @keyframes sys-warn-cursor-blink {
    0%,
    45% {
      opacity: 1;
    }
    46%,
    100% {
      opacity: 0;
    }
  }

  @keyframes sys-warn-text-glitch {
    0%,
    100% {
      transform: translateX(0);
    }
    92% {
      transform: translateX(0);
    }
    93% {
      transform: translateX(-1px);
    }
    94% {
      transform: translateX(1px);
    }
    95% {
      transform: translateX(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .sys-warn,
    .sys-warn__scan,
    .sys-warn__tag,
    .sys-warn__status,
    .sys-warn__text,
    .sys-warn__cursor,
    .sys-warn__cmd--ready {
      animation: none;
    }

    .sys-warn:not(.sys-warn--header-ready):not(.sys-warn--dismissing) {
      height: auto;
      padding: calc(var(--pd-sm) + 2px) var(--pd-md) var(--pd-sm);
      border-width: 1px;
      background:
        linear-gradient(
          180deg,
          color-mix(in srgb, var(--sys-warn-hud-frame) 10%, transparent) 0%,
          transparent 18%
        ),
        color-mix(in srgb, var(--sys-warn-hud-bg) 92%, var(--layout-bg));
      box-shadow:
        inset 0 1px 0 color-mix(in srgb, var(--sys-warn-hud-frame) 18%, transparent),
        inset 0 0 0 1px color-mix(in srgb, var(--print-light) 4%, transparent),
        0 0 24px color-mix(in srgb, var(--sys-warn-hud-frame) 8%, transparent);
      opacity: 1;
      transform: none;
      transition: none;
    }

    .sys-warn:not(.sys-warn--header-ready) .sys-warn__body {
      min-height: 6.35em;
    }

    .sys-warn--has-cmd:not(.sys-warn--header-ready) .sys-warn__body {
      min-height: 6.35em;
    }

    .sys-warn__head {
      opacity: 1;
      transform: none;
      transition: none;
    }

    .sys-warn__status {
      opacity: 0.75;
    }
  }
</style>
