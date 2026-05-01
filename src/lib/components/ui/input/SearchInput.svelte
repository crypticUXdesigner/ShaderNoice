<script lang="ts">
  import Input from './Input.svelte';
  import InputClearButton from './InputClearButton.svelte';
  import { IconSvg } from '../icon';

  interface Props {
    value?: string;
    placeholder?: string;
    ariaLabel: string;
    disabled?: boolean;
    size?: 'sm' | 'md';
    variant?: 'primary' | 'secondary' | 'ghost' | 'nudge';
    clearLabel?: string;
    onEnter?: () => void;
    /**
     * Called after SearchInput updates `value` (input, clear, escape).
     * For user-typing, `e` is the original input event. For clear/escape, `e` is null.
     */
    onInput?: (value: string, e: Event | null) => void;
    class?: string;
    /** When clearing, keep focus on the input. Defaults to true. */
    keepFocusOnClear?: boolean;
    [key: string]: unknown;
  }

  let {
    value = $bindable(''),
    placeholder = '',
    ariaLabel,
    disabled = false,
    size = 'sm',
    variant = 'primary',
    clearLabel = 'Clear search',
    onEnter,
    onInput,
    class: className = '',
    keepFocusOnClear = true,
    ...restProps
  }: Props = $props();

  let rootEl = $state<HTMLDivElement | null>(null);

  const hasValue = $derived(value.trim() !== '');

  function focusInput(): void {
    rootEl?.querySelector<HTMLInputElement>('input')?.focus();
  }

  function setValue(next: string, e: Event | null): void {
    value = next;
    onInput?.(next, e);
  }

  function clear(e: Event | null): void {
    setValue('', e);
    if (keepFocusOnClear) focusInput();
  }

  function handleInput(e: Event): void {
    const next = (e.currentTarget as HTMLInputElement).value;
    setValue(next, e);
  }

  function handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      if (!hasValue) return; // let parent handle close
      e.preventDefault();
      e.stopPropagation();
      clear(null);
      return;
    }

    if (e.key === 'Enter' && onEnter) {
      e.preventDefault();
      e.stopPropagation();
      onEnter();
    }
  }
</script>

{#snippet leadingIcon()}
  <IconSvg name="search" variant="line" />
{/snippet}

{#snippet trailingClear()}
  <InputClearButton hidden={!hasValue} onClear={() => clear(null)} label={clearLabel} disabled={disabled} />
{/snippet}

<div class="search-input" bind:this={rootEl}>
  <Input
    {variant}
    {size}
    type="search"
    value={value}
    {placeholder}
    {disabled}
    class={className}
    leading={leadingIcon}
    trailing={trailingClear}
    aria-label={ariaLabel}
    oninput={handleInput}
    onkeydown={handleKeydown}
    {...restProps}
  />
</div>

<style>
  /* Hide native "clear" control for type=search (we provide our own). */
  .search-input :global(input[type='search']::-webkit-search-cancel-button),
  .search-input :global(input[type='search']::-webkit-search-decoration),
  .search-input :global(input[type='search']::-webkit-search-results-button),
  .search-input :global(input[type='search']::-webkit-search-results-decoration) {
    -webkit-appearance: none;
    appearance: none;
    display: none;
  }
</style>

