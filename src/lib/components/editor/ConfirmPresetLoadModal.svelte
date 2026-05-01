<script lang="ts">
  import { ModalDialog } from '../ui';

  interface Props {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
  }

  let { open, onClose, onConfirm }: Props = $props();
</script>

<ModalDialog
  {open}
  onClose={onClose}
  variant="confirm"
  title="Load preset"
  secondaryLabel="Not now"
  onSecondary={onClose}
  secondaryVariant="ghost"
  primaryLabel="Continue"
  onPrimary={onConfirm}
  primaryVariant="primary"
  class="confirm-preset-load-modal"
  bodyClass="confirm-preset-load-body"
>
  <p>Load preset? This will replace the current graph and clear undo history.</p>
</ModalDialog>

<style>
  :global(.confirm-preset-load-body) {
    min-width: 280px;
  }

  p {
    margin: 0;
  }
</style>
