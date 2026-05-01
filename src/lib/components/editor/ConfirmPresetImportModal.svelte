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
  title="Import preset"
  secondaryLabel="Not now"
  onSecondary={onClose}
  secondaryVariant="ghost"
  primaryLabel="Continue"
  onPrimary={onConfirm}
  primaryVariant="primary"
  class="confirm-preset-import-modal"
  bodyClass="confirm-preset-import-body"
>
  <p>Import preset? This will replace the current graph and clear undo history.</p>
</ModalDialog>

<style>
  :global(.confirm-preset-import-body) {
    min-width: 280px;
  }

  p {
    margin: 0;
  }
</style>
