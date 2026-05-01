<script lang="ts">
  /**
   * Full-viewport branding overlay until the user dismisses it (after the app is ready).
   * Logo: place `public/ShaderNoice-logo.png` (optional; hidden if missing or broken).
   */
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { IconSvg } from '../icon';

  interface Props {
    /** When true, initial load finished — user can dismiss. */
    ready: boolean;
    onDismiss: () => void;
    titleShader?: string;
    titleNoice?: string;
    /** `font-weight` for the “Shader” segment (number or CSS value). */
    titleShaderWeight?: number | string;
    /** `font-weight` for the “Noice” segment (number or CSS value). */
    titleNoiceWeight?: number | string;
    subtitle?: string;
    /**
     * Optional legacy single-image logo. If omitted, the splash uses the layered
     * mask-based logo from `public/app-logo/`.
     *
     * Resolved against site base, e.g. `/ShaderNoice/ShaderNoice-logo.png`
     */
    logoSrc?: string;
  }

  let {
    ready,
    onDismiss,
    titleShader = 'Shader',
    titleNoice = 'Noice',
    titleShaderWeight = 400,
    titleNoiceWeight = 900,
    subtitle = 'Fries GPUs for breakfast.',
    logoSrc,
  }: Props = $props();

  let logoFailed = $state(false);

  const baseUrl = import.meta.env.BASE_URL;
  const layeredLogo = {
    layer1: `${baseUrl}app-logo/layer1-badge.webp`,
    shapeMask: `${baseUrl}app-logo/shape-mask.webp`,
    patternMask: `${baseUrl}app-logo/pattern-mask.webp`,
    layer3: `${baseUrl}app-logo/layer3-content.webp`,
  } as const;

  function prefersReducedMotion(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  let reduceMotion = $state(prefersReducedMotion());

  onMount(() => {
    reduceMotion = prefersReducedMotion();
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (): void => {
      reduceMotion = mq.matches;
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  });

  /** Shorter when reduced motion; never 0 or the dismiss feels like a hard cut. */
  const fadeDuration = $derived(reduceMotion ? 160 : 280);

  function handleActivate(): void {
    if (!ready) return;
    onDismiss();
  }

  /** Escape dismisses without moving focus onto the overlay (no focus steal on open). */
  $effect(() => {
    if (typeof window === 'undefined' || !ready) return;
    function onGlobalKeydown(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        e.preventDefault();
        onDismiss();
      }
    }
    window.addEventListener('keydown', onGlobalKeydown);
    return () => window.removeEventListener('keydown', onGlobalKeydown);
  });
</script>

<div
  id="app-splash-root"
  class="app-splash"
  class:app-splash--ready={ready}
  role={ready ? 'dialog' : 'status'}
  aria-modal={ready ? 'true' : undefined}
  aria-busy={!ready}
  aria-labelledby="app-splash-title"
  aria-describedby="app-splash-desc"
  transition:fade={{ duration: fadeDuration, easing: cubicOut }}
  onclick={handleActivate}
>
  <div class="app-splash__inner">
    {#if logoSrc && !logoFailed}
      <img
        src={logoSrc}
        alt=""
        class="app-splash__logo"
        width="40"
        height="40"
        onerror={() => {
          logoFailed = true;
        }}
      />
    {:else if !logoSrc}
      <div
        class="app-splash__logo-stack"
        aria-hidden="true"
        style:--app-splash-layer1-url={`url("${layeredLogo.layer1}")`}
        style:--app-splash-shape-mask-url={`url("${layeredLogo.shapeMask}")`}
        style:--app-splash-pattern-mask-url={`url("${layeredLogo.patternMask}")`}
        style:--app-splash-layer3-url={`url("${layeredLogo.layer3}")`}
      >
        <div class="app-splash__logo-layer app-splash__logo-layer--badge"></div>

        <div class="app-splash__logo-layer app-splash__logo-layer--shape-clip">
          <div class="app-splash__logo-pattern"></div>
        </div>

        <div class="app-splash__logo-layer app-splash__logo-layer--shape-clip">
          <div class="app-splash__logo-pattern-mask">
            <div class="app-splash__logo-content"></div>
          </div>
        </div>
      </div>
    {/if}
    <h1 id="app-splash-title" class="app-splash__title">
      <span
        class="app-splash__title-part app-splash__title-part--shader"
        style:font-weight={titleShaderWeight}>{titleShader}</span><span
        class="app-splash__title-part app-splash__title-part--noice"
        style:font-weight={titleNoiceWeight}>{titleNoice}</span>
    </h1>
    <p id="app-splash-desc" class="app-splash__subtitle app-splash__subtitle--warn">
      <span class="app-splash__warn-icon-wrap" aria-hidden="true">
        <IconSvg name="flame" variant="filled" class="app-splash__warn-icon" />
      </span>
      <span class="app-splash__subtitle-text">{subtitle}</span>
    </p>
    <p class="app-splash__hint" aria-live="polite">
      {#if ready}
        Click anywhere…
      {:else}
        Loading…
      {/if}
    </p>
    <span
      class="app-splash__compat"
      role="note"
      aria-label="Best in Chrome or Chromium-based browsers. Video export uses WebCodecs (VideoEncoder and AudioEncoder), so other browsers may be limited."
      title="Video export uses WebCodecs; other browsers may be limited."
    >
      <span class="app-splash__compat-icon" aria-hidden="true">
        <IconSvg name="google-chrome-logo" variant="filled" />
      </span>
      Best in Chrome/Chromium
    </span>
  </div>
</div>

<style>
  .app-splash {
    position: fixed;
    inset: 0;
    z-index: 1100;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    padding: var(--pd-2xl);
    font-family: var(--font-sans);
    background: var(--layout-bg);
    color: var(--print-default);
    pointer-events: auto;
    cursor: wait;
    outline: none;
  }

  .app-splash--ready {
    cursor: pointer;
  }

  .app-splash--ready:focus-visible {
    box-shadow: inset 0 0 0 2px var(--color-blue-90);
  }

  .app-splash__inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding-bottom: 3.7%;
    gap: var(--pd-xs);
    max-width: min(100%, 28rem);
    pointer-events: none;
  }

  /* So clicks anywhere on the overlay hit the root handler (pointer-events is not inherited). */
  .app-splash__inner * {
    pointer-events: none;
  }

  /**
   * Slow CCW drift: each half-revolution uses a different ease so speed is non-linear
   * but the loop stays seamless at 0°/360°.
   */
  @keyframes app-splash-logo-ccw {
    0% {
      transform: rotate(0deg);
      animation-timing-function: cubic-bezier(0.22, 0.61, 0.36, 1);
    }
    50% {
      transform: rotate(-180deg);
      animation-timing-function: cubic-bezier(0.64, 0, 0.78, 0.39);
    }
    100% {
      transform: rotate(-360deg);
    }
  }

  /** Pulses halo strength only (paired with rotate on the same element). */
  @keyframes app-splash-logo-glow {
    0%,
    100% {
      filter: drop-shadow(0 0 7px color-mix(in srgb, var(--color-violet-90) 22%, transparent))
        drop-shadow(0 0 16px color-mix(in srgb, var(--print-light) 10%, transparent))
        drop-shadow(0 0 32px color-mix(in srgb, var(--print-light) 5%, transparent));
    }
    50% {
      filter: drop-shadow(0 0 14px color-mix(in srgb, var(--color-purple-110) 42%, transparent))
        drop-shadow(0 0 28px color-mix(in srgb, var(--print-light) 18%, transparent))
        drop-shadow(0 0 48px color-mix(in srgb, var(--color-red-orange-110) 9%, transparent));
    }
  }

  .app-splash__logo {
    width: 120px;
    height: 120px;
    object-fit: contain;
    border-radius: var(--radius-md);
    flex-shrink: 0;
    transform-origin: center center;
    animation:
      app-splash-logo-ccw 42s infinite,
      app-splash-logo-glow 31s ease-in-out infinite;
    margin-bottom: var(--pd-lg);
    /* drop-shadow follows non-transparent pixels (works with PNG alpha); box-shadow does not */
    filter: drop-shadow(0 0 7px color-mix(in srgb, var(--print-light) 22%, transparent))
      drop-shadow(0 0 16px color-mix(in srgb, var(--print-light) 10%, transparent))
      drop-shadow(0 0 32px color-mix(in srgb, var(--print-light) 5%, transparent));
  }

  @keyframes app-splash-layer-rotate-a {
    0% {
      transform: rotate(0deg);
      animation-timing-function: cubic-bezier(0.22, 0.61, 0.36, 1);
    }
    50% {
      transform: rotate(-180deg);
      animation-timing-function: cubic-bezier(0.64, 0, 0.78, 0.39);
    }
    100% {
      transform: rotate(-360deg);
    }
  }

  @keyframes app-splash-layer-rotate-b {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  @keyframes app-splash-layer-pattern-mask-breathe {
    0% {
      transform: rotate(0deg) scale(1);
    }
    25% {
      transform: rotate(90deg) scale(0.93);
    }
    50% {
      transform: rotate(180deg) scale(0.987);
    }
    75% {
      transform: rotate(270deg) scale(0.897);
    }
    100% {
      transform: rotate(360deg) scale(1);
    }
  }

  @keyframes app-splash-layer-rotate-c {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(-360deg);
    }
  }

  @keyframes app-splash-layer-content-breathe {
    0% {
      transform: rotate(0deg) scale(1);
    }
    20% {
      transform: rotate(-72deg) scale(1.017);
    }
    50% {
      transform: rotate(-180deg) scale(1.007);
    }
    80% {
      transform: rotate(-288deg) scale(1.023);
    }
    100% {
      transform: rotate(-360deg) scale(1);
    }
  }

  .app-splash__logo-stack {
    width: 120px;
    height: 120px;
    position: relative;
    margin-bottom: var(--pd-lg);
    border-radius: var(--radius-md);
    filter: drop-shadow(0 0 7px color-mix(in srgb, var(--color-violet-90) 22%, transparent))
      drop-shadow(0 0 16px color-mix(in srgb, var(--print-light) 10%, transparent))
      drop-shadow(0 0 32px color-mix(in srgb, var(--print-light) 5%, transparent));
  }

  .app-splash__logo-layer {
    position: absolute;
    inset: 0;
    transform-origin: center center;
  }

  .app-splash__logo-layer--badge {
    background-image: var(--app-splash-layer1-url);
    background-repeat: no-repeat;
    background-size: contain;
    background-position: center;
    animation: app-splash-layer-rotate-a 42s infinite;
  }

  .app-splash__logo-layer--shape-clip {
    /* Shape mask rotates with the same "A" layer motion */
    -webkit-mask-image: var(--app-splash-shape-mask-url);
    mask-image: var(--app-splash-shape-mask-url);
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
    -webkit-mask-size: contain;
    mask-size: contain;
    -webkit-mask-position: center;
    mask-position: center;
    animation: app-splash-layer-rotate-a 42s infinite;
  }

  .app-splash__logo-pattern {
    position: absolute;
    inset: 0;
    transform-origin: center center;
    animation: app-splash-layer-pattern-mask-breathe 37s linear infinite;

    /* Display the pattern by using it as a mask over a solid fill */
    background: color-mix(in srgb, var(--print-light) 70%, transparent);
    -webkit-mask-image: var(--app-splash-pattern-mask-url);
    mask-image: var(--app-splash-pattern-mask-url);
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
    -webkit-mask-size: contain;
    mask-size: contain;
    -webkit-mask-position: center;
    mask-position: center;
  }

  .app-splash__logo-pattern-mask {
    position: absolute;
    inset: 0;
    transform-origin: center center;
    animation: app-splash-layer-pattern-mask-breathe 37s linear infinite;

    /* Layer 3 is visible only through the pattern mask */
    -webkit-mask-image: var(--app-splash-pattern-mask-url);
    mask-image: var(--app-splash-pattern-mask-url);
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
    -webkit-mask-size: contain;
    mask-size: contain;
    -webkit-mask-position: center;
    mask-position: center;
    mask-mode: luminance
  }

  .app-splash__logo-content {
    position: absolute;
    inset: 0;
    transform-origin: center center;
    animation: app-splash-layer-content-breathe 33s linear infinite;
    background-image: var(--app-splash-layer3-url);
    background-repeat: no-repeat;
    background-size: contain;
    background-position: center;
  }

  @media (prefers-reduced-motion: reduce) {
    .app-splash__logo {
      animation: none;
      filter: drop-shadow(0 0 10px color-mix(in srgb, var(--print-light) 30%, transparent))
        drop-shadow(0 0 22px color-mix(in srgb, var(--print-light) 14%, transparent))
        drop-shadow(0 0 40px color-mix(in srgb, var(--print-light) 6%, transparent));
    }

    .app-splash__logo-stack {
      filter: drop-shadow(0 0 10px color-mix(in srgb, var(--print-light) 30%, transparent))
        drop-shadow(0 0 22px color-mix(in srgb, var(--print-light) 14%, transparent))
        drop-shadow(0 0 40px color-mix(in srgb, var(--print-light) 6%, transparent));
    }

    .app-splash__logo-layer--badge,
    .app-splash__logo-layer--shape-clip,
    .app-splash__logo-pattern,
    .app-splash__logo-pattern-mask,
    .app-splash__logo-content {
      animation: none;
    }
  }

  .app-splash__title {
    margin: 0;
    font-size: var(--text-3xl);
    color: var(--print-light);
    letter-spacing: -0.03em;
    line-height: 1.15;
  }

  .app-splash__title-part {
    letter-spacing: inherit;
  }

  .app-splash__subtitle {
    margin: 0;
    font-size: var(--text-xs);
    font-weight: 400;
    line-height: 1;
    font-family: var(--font-mono);
  }

  .app-splash__subtitle--warn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--pd-sm);
    max-width: 100%;
    box-sizing: border-box;
    color: var(--color-red-orange-100);
    text-align: left;
  }

  .app-splash__warn-icon-wrap {
    display: inline-flex;
    flex-shrink: 0;
    color: var(--color-red-orange-90);
    font-size: 20px;
  }

  .app-splash__subtitle-text {
    flex: 1;
    min-width: 0;
  }

  .app-splash__hint {
    margin: 0;
    margin-top: var(--pd-2xl);
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--print-normal);
    line-height: 1.4;
  }

  .app-splash__compat {
    position: absolute;
    left: 50%;
    bottom: var(--pd-xl);
    transform: translateX(-50%);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--pd-md);
    border-radius: 999px;
    font-size: var(--text-sm);
    line-height: 1;
    font-weight: 300;
    font-family: var(--font-mono);
    color: var(--color-yellow-gray-100);
    user-select: none;
    pointer-events: none;
  }

  .app-splash__compat-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    opacity: 0.9;
  }

</style>
