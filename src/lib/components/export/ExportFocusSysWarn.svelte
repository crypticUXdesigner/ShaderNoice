<script lang="ts">
  /**
   * Animated sys-warn advisory for video export progress (tab-focus rule).
   * Animation starts when `active` is true — after the native save picker closes.
   */
  import SysWarnAnimated from '../ui/display/SysWarnAnimated.svelte';
  import {
    buildExportFocusLines,
    buildExportSysWarnTypingSequence,
    EXPORT_FOCUS_ARIA_LABEL,
    EXPORT_FOCUS_MESSAGES,
    exportFocusStatusLabel,
    pickExportFocusMessage,
  } from '../ui/display/exportSysWarnScript';

  interface Props {
    /** When true, run the typewriter sequence (orchestrator sets this after save destination is picked). */
    active?: boolean;
    progressPercent?: number;
    id?: string;
    class?: string;
  }

  let { active = false, progressPercent = 0, id, class: className = '' }: Props = $props();

  let reduceMotion = $state(false);
  let focusMessage = $state<string | undefined>(undefined);

  const settledStatusLabel = $derived(exportFocusStatusLabel(progressPercent));

  $effect.pre(() => {
    if (focusMessage === undefined && typeof window !== 'undefined') {
      focusMessage = pickExportFocusMessage();
    }
  });

  $effect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduceMotion = mq.matches;
    const handler = (): void => {
      reduceMotion = mq.matches;
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  });
</script>

<SysWarnAnimated
  {id}
  class={className}
  text={focusMessage ?? EXPORT_FOCUS_MESSAGES[0]}
  {active}
  {reduceMotion}
  channel="export"
  buildTypingSequence={buildExportSysWarnTypingSequence}
  buildStaticLines={buildExportFocusLines}
  {settledStatusLabel}
  ariaLabel={EXPORT_FOCUS_ARIA_LABEL}
/>
