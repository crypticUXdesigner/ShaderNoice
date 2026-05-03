<script lang="ts">
  /**
   * Modal that lists keyboard shortcuts. Surfaces F5 (document and surface shortcuts in-app).
   */
  import { ModalDialog, ShortcutRow } from '../ui';
  import type { ShortcutKeys } from '../ui/shortcut/shortcutTypes';
  import { altOptionKeycapLabel } from '../../../utils/platformKeys';

  interface Props {
    open?: boolean;
    onClose?: () => void;
  }

  let { open = false, onClose }: Props = $props();

  const chord = (...parts: string[]): ShortcutKeys => ({ parts, joiner: ' + ' });
  const either = (...parts: string[]): ShortcutKeys => ({ parts, joiner: ' / ' });

  const groups: Array<{
    title: string;
    description?: string;
    shortcuts: Array<{ action: string; keys: ShortcutKeys }>;
  }> = $derived.by(() => {
    const altLabel = altOptionKeycapLabel();
    return [
      {
        title: 'View',
        shortcuts: [
          { action: 'View: Node', keys: ['1'] },
          { action: 'View: Split', keys: ['2'] },
          { action: 'View: Shader', keys: ['3'] },
          { action: 'Library', keys: ['Tab'] },
          { action: 'UI', keys: ['<'] },
          { action: 'Fullscreen', keys: ['F'] },
        ],
      },
      {
        title: 'Playback',
        shortcuts: [{ action: 'Play/Pause', keys: ['Space'] }],
      },
      {
        title: 'Tools',
        shortcuts: [
          { action: 'Tool: Cursor', keys: ['V'] },
          { action: 'Tool: Hand', keys: either('H', 'Hold Space') },
          { action: 'Tool: Select', keys: ['S'] },
        { action: 'Tool: Add', keys: ['A'] },
        { action: 'Tool: Patch', keys: ['P'] },
      ],
    },
      {
        title: 'Node editor',
        shortcuts: [
          { action: 'Delete selection', keys: either('Delete', 'Backspace') },
          { action: 'Copy selection', keys: chord('Ctrl/Cmd', 'C') },
          { action: 'Paste', keys: chord('Ctrl/Cmd', 'V') },
          { action: 'Duplicate selection', keys: chord('Ctrl/Cmd', 'D') },
          { action: 'Pan (hold)', keys: ['Space'] },
          { action: 'Add node (empty canvas)', keys: chord(altLabel, 'Click') },
        ],
      },
      {
        title: 'Parameters',
        shortcuts: [
          { action: 'Fine control', keys: chord('Shift', 'Drag') },
          { action: 'Coarse control', keys: chord('Ctrl/Cmd', 'Drag') },
        ],
      },
    ];
  });
</script>

<ModalDialog
  open={open}
  onClose={onClose}
  class="keyboard-shortcuts-modal"
  title="Shortcuts"
  primaryLabel="Done"
  primaryVariant="secondary"
  onPrimary={() => onClose?.()}
  bodyClass="keyboard-shortcuts-body"
>
  <div class="shortcuts-groups">
    {#each groups as group (group.title)}
      <section class="group">
        <h3 class="group-title">{group.title}</h3>

        <dl class="shortcuts-list">
          {#each group.shortcuts as s (s.action)}
            <ShortcutRow action={s.action} keys={s.keys} />
          {/each}
        </dl>
      </section>
    {/each}
  </div>
</ModalDialog>

<style>
  :global(.keyboard-shortcuts-body) {
    min-width: 280px;
  }

  .shortcuts-groups {
    display: grid;
    gap: var(--pd-md);
  }

  .group {
    display: grid;
    gap: var(--pd-xs);
    margin-bottom: var(--pd-md);
  }

  .group-title {
    margin: 0 0 var(--pd-xs) 0;
    font-size: var(--text-xs);
    color: var(--print-highlight);
  }

  .shortcuts-list {
    display: grid;
    /* fixed action column + snug shortcut column */
    grid-template-columns: var(--shortcut-action-col-width, 160px) auto;
    align-items: center;
    gap: var(--pd-xs) var(--pd-md);
    margin: 0;
    font-size: var(--text-sm);
  }
</style>
