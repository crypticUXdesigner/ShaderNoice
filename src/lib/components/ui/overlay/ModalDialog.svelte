<script lang="ts">
  import { Button, IconSvg, Modal } from '../';
  import type { ButtonVariant } from '../button';

  interface Props {
    open?: boolean;
    onClose?: () => void;
    /** Optional CSS class applied to the Modal content element (`.content.frame`). */
    class?: string;
    /** Size preset for the modal frame. */
    variant?: 'default' | 'confirm' | 'list';

    title: string;
    /** Optional id for aria-labelledby / testing hooks. */
    titleId?: string;

    /** When false, hide the top-right close button (Escape/backdrop still close via Modal). */
    showHeaderClose?: boolean;

    secondaryLabel?: string;
    onSecondary?: () => void;
    secondaryVariant?: ButtonVariant;

    primaryLabel?: string;
    onPrimary?: () => void;
    primaryVariant?: ButtonVariant;

    /** Optional topbar rendered inside the body above content. */
    bodyTopbar?: import('svelte').Snippet<[]>;
    /** Controls which element scrolls within the dialog body. */
    bodyScroll?: 'body' | 'content';

    /** Main body content. */
    children?: import('svelte').Snippet<[]>;
    /** Optional footer override. If provided, replaces the default action buttons. */
    footer?: import('svelte').Snippet<[]>;

    /** Optional CSS class applied to the scrollable elevated body surface. */
    bodyClass?: string;
  }

  let {
    open = false,
    onClose,
    class: className = '',
    variant = 'default',
    title,
    titleId,
    showHeaderClose = true,
    secondaryLabel,
    onSecondary,
    secondaryVariant = 'ghost',
    primaryLabel,
    onPrimary,
    primaryVariant = 'primary',
    bodyTopbar,
    bodyScroll = 'body',
    children,
    footer,
    bodyClass = '',
  }: Props = $props();
</script>

<Modal
  {open}
  onClose={onClose}
  contentClass={`modal-dialog modal-dialog--${variant} ${className || ''}`}
>
  <div class="modal-dialog-shell">
    <header class="modal-dialog-header">
      <h2 id={titleId} class="modal-dialog-title">{title}</h2>
      {#if showHeaderClose}
        <Button
          variant="ghost"
          size="sm"
          mode="both"
          iconPosition="trailing"
          class="modal-dialog-close-btn"
          onclick={() => onClose?.()}
          aria-label="Close dialog"
        >
          Close
          <IconSvg name="x" variant="line" />
        </Button>
      {/if}
    </header>

    <div class="modal-dialog-main">
      <div
        class="modal-dialog-body frame-elevated {bodyClass}"
        class:scrollbar-styled={bodyScroll === 'body'}
        class:modal-dialog-body--content-scroll={bodyScroll === 'content'}
      >
        {#if bodyTopbar}
          <div class="modal-dialog-topbar">
            {@render bodyTopbar()}
          </div>
        {/if}

        {#if bodyScroll === 'content'}
          <div class="modal-dialog-scroll scrollbar-styled">
            {@render children?.()}
          </div>
        {:else}
          {@render children?.()}
        {/if}
      </div>
    </div>

    {#if footer}
      <footer class="modal-dialog-footer">
        {@render footer()}
      </footer>
    {:else if secondaryLabel || primaryLabel}
      <footer class="modal-dialog-footer">
        <div class="modal-dialog-actions">
          {#if secondaryLabel}
            <Button variant={secondaryVariant} size="md" onclick={onSecondary ?? onClose}>
              {secondaryLabel}
            </Button>
          {/if}
          {#if primaryLabel}
            <Button variant={primaryVariant} size="md" onclick={onPrimary}>
              {primaryLabel}
            </Button>
          {/if}
        </div>
      </footer>
    {/if}
  </div>
</Modal>

<style>
  /* Modal content element is created by `Modal` (portal) so must be global. */
  :global(.content.frame.modal-dialog) {
    /* Match VideoExportDialog modal frame baseline */
    width: min(480px, 94vw);
    min-width: min(360px, 94vw);
    height: min(600px, 90vh);

    display: flex;
    flex-direction: column;
    min-height: 0;
    padding: 0;
  }

  :global(.content.frame.modal-dialog.modal-dialog--confirm) {
    width: min(400px, 94vw);
    min-width: min(320px, 94vw);
    height: auto;
    max-height: min(260px, 86vh);
  }

  :global(.content.frame.modal-dialog.modal-dialog--list) {
    width: min(400px, 94vw);
    min-width: min(320px, 94vw);
    height: min(600px, 90vh);
  }

  .modal-dialog-shell {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }

  .modal-dialog-header {
    position: relative;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--pd-md);
    min-height: var(--size-sm);
    padding: var(--pd-xs) var(--pd-xs) var(--pd-xs) var(--pd-md);
    margin-bottom: var(--pd-md);
    background: transparent;
  }

  .modal-dialog-title {
    margin: 0;
    flex: 1;
    min-width: 0;
    font-size: var(--text-sm);
    font-weight: 500;
    line-height: 1;
    color: var(--color-blue-100);
    letter-spacing: 0;
  }

  :global(.modal-dialog-close-btn.button) {
    border-radius: calc(var(--radius-md) - var(--pd-xs));
  }

  .modal-dialog-main {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .modal-dialog-body {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: auto;
    width: 100%;
    box-sizing: border-box;
    border-radius: var(--frame-elevated-radius);
    padding: var(--pd-xl);
    gap: var(--pd-md);
  }

  .modal-dialog-body--content-scroll {
    overflow: hidden;
    padding: 0;
    gap: 0;
  }

  .modal-dialog-topbar {
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    min-height: 0;
    padding: var(--pd-md) var(--pd-xl);
  }

  .modal-dialog-scroll {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: auto;
    width: 100%;
    box-sizing: border-box;
    padding: var(--pd-xl);
    gap: var(--pd-md);
  }

  .modal-dialog-footer {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    min-height: 0;
    padding: var(--pd-lg) var(--pd-md) var(--pd-md) var(--pd-md);
    background: transparent;
  }

  .modal-dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--pd-md);
  }
</style>

