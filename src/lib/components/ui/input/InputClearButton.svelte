<script lang="ts">
  import { Button } from '../button';
  import { IconSvg } from '../icon';

  type ClearSize = 'xs' | 'sm' | 'md';

  interface Props {
    hidden?: boolean;
    disabled?: boolean;
    label?: string;
    size?: ClearSize;
    onClear: () => void;
  }

  let { hidden = false, disabled = false, label = 'Clear search', size = 'sm', onClear }: Props = $props();
</script>

<Button
  variant="ghost"
  size="sm"
  mode="icon-only"
  title={label}
  aria-label={label}
  class="input-clear {hidden ? 'is-hidden' : ''}"
  style={`--input-clear-size: var(--size-${size})`}
  onclick={onClear}
  type="button"
  {disabled}
>
  <IconSvg name="circle-x" variant="filled" />
</Button>
