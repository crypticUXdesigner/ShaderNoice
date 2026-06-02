<script lang="ts">
  import { fade } from 'svelte/transition';
  import { portal } from '../../../actions/portal';
  import { popoverReveal, readPopoverRevealParams } from './popoverRevealTransition';

  let reducedMotion = $state(false);
  $effect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotion = mq.matches;
    const handler = (): void => {
      reducedMotion = mq.matches;
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  });

  const revealParams = $derived(() => readPopoverRevealParams(reducedMotion));

  const backdropFadeMs = $derived(() => revealParams.duration ?? 165);

  interface Props {
    open?: boolean;
    onClose?: () => void;
    children?: import('svelte').Snippet<[]>;
    /** CSS class applied to the `.content.frame` element (legacy). */
    class?: string;
    /** CSS class applied to the `.content.frame` element. Prefer this over `class`. */
    contentClass?: string;
    /** When false, clicking the dimmed backdrop does not call `onClose`. */
    backdropDismisses?: boolean;
    /** When false, Escape does not call `onClose`. */
    escapeDismisses?: boolean;
  }

  let {
    open = false,
    onClose,
    children,
    class: className = '',
    contentClass = '',
    backdropDismisses = true,
    escapeDismisses = true,
  }: Props = $props();

  let contentEl = $state<HTMLElement | null>(null);
  let savedFocus: HTMLElement | null = null;

  function getFocusableElements(el: HTMLElement): HTMLElement[] {
    const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    return Array.from(el.querySelectorAll<HTMLElement>(selector)).filter(
      (node) => !node.hasAttribute('disabled') && node.offsetParent !== null
    );
  }

  $effect(() => {
    if (!open) return;
    savedFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      savedFocus?.focus();
    };
  });

  $effect(() => {
    if (open && contentEl) {
      const focusable = getFocusableElements(contentEl);
      if (focusable.length > 0) {
        focusable[0].focus();
      }
    }
  });

  function handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && open && escapeDismisses && onClose) {
      onClose();
      return;
    }
    if (
      e.key !== 'Tab' ||
      !open ||
      !contentEl ||
      !contentEl.contains(document.activeElement as Node)
    ) {
      return;
    }
    const focusable = getFocusableElements(contentEl);
    if (focusable.length === 0) return;
    const active = document.activeElement as HTMLElement | null;
    const idx = active ? focusable.indexOf(active) : -1;
    if (e.shiftKey) {
      if (idx <= 0) {
        e.preventDefault();
        focusable[focusable.length - 1].focus();
      }
    } else {
      if (idx === -1 || idx >= focusable.length - 1) {
        e.preventDefault();
        focusable[0].focus();
      }
    }
  }

  $effect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  });
</script>

{#if open}
  <div
    class="modal-backdrop"
    role="dialog"
    aria-modal="true"
    onclick={(e) => e.target === e.currentTarget && backdropDismisses && onClose?.()}
    use:portal
    transition:fade={() => ({ duration: backdropFadeMs })}
  >
    <div
      bind:this={contentEl}
      class="content frame {contentClass || ''} {className || ''}"
      transition:popoverReveal={() => revealParams}
      onclick={(e) => e.stopPropagation()}
    >
      {@render children?.()}
    </div>
  </div>
{/if}

<style>
  @keyframes modal-backdrop-sheen-drift-a {
    0%,
    100% {
      transform: translate3d(-3.5%, -2.5%, 0) scale(0.97);
      filter: brightness(var(--modal-backdrop-sheen-brightness-min));
      opacity: var(--modal-backdrop-sheen-opacity-min);
    }
    50% {
      transform: translate3d(4.5%, 3.5%, 0) scale(1.05);
      filter: brightness(var(--modal-backdrop-sheen-brightness-max));
      opacity: var(--modal-backdrop-sheen-opacity-max);
    }
  }

  @keyframes modal-backdrop-sheen-drift-b {
    0%,
    100% {
      transform: translate3d(3%, 2%, 0) scale(1.03);
      filter: brightness(var(--modal-backdrop-sheen-brightness-max));
      opacity: var(--modal-backdrop-sheen-opacity-max);
    }
    50% {
      transform: translate3d(-4%, -3%, 0) scale(0.96);
      filter: brightness(var(--modal-backdrop-sheen-brightness-min));
      opacity: var(--modal-backdrop-sheen-opacity-min);
    }
  }

  /* Modal styles */
  .modal-backdrop {
    /* Layout */
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    isolation: isolate;
    overflow: hidden;

    /* Visual */
    background: var(--search-dialog-overlay);
    -webkit-backdrop-filter: blur(6px);
    backdrop-filter: blur(6px);

    /* Other */
    z-index: 9998;
    pointer-events: auto;

    &::before,
    &::after {
      content: '';
      position: absolute;
      inset: -35%;
      pointer-events: none;
      z-index: 0;
      mix-blend-mode: hard-light;
      will-change: transform, filter, opacity;
    }

    /* Primary matte highlight — upper-left, slow drift */
    &::before {
      background: radial-gradient(
        ellipse 52% 46% at 34% 30%,
        var(--modal-backdrop-sheen-core) 0%,
        var(--modal-backdrop-sheen-mid) 34%,
        var(--modal-backdrop-sheen-fade) 56%,
        transparent 74%
      );
      animation: modal-backdrop-sheen-drift-a var(--modal-backdrop-sheen-duration) ease-in-out infinite;
    }

    /* Secondary highlight — lower-right, offset phase */
    &::after {
      background: radial-gradient(
        ellipse 48% 40% at 66% 70%,
        var(--modal-backdrop-sheen-core) 0%,
        var(--modal-backdrop-sheen-mid) 38%,
        var(--modal-backdrop-sheen-fade) 58%,
        transparent 76%
      );
      animation: modal-backdrop-sheen-drift-b var(--modal-backdrop-sheen-duration-secondary) ease-in-out infinite;
    }

    .content {
      /* Layout */
      position: relative;
      display: flex;
      flex-direction: column;

      /* Box model: from layer .frame; overrides for modal */
      max-width: 90vw; /* one-off */
      max-height: 90vh; /* one-off */

      /* Other */
      z-index: 1;
      pointer-events: auto;
    }
  }

  @media (prefers-reduced-transparency: reduce) {
    .modal-backdrop {
      -webkit-backdrop-filter: none;
      backdrop-filter: none;
    }
  }
</style>
