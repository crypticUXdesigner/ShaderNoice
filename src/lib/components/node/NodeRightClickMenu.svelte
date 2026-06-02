<script lang="ts">

  import { DropdownMenu, type DropdownMenuItem } from '../ui';



  export interface NodeContextMenuShowOptions {

    openAbove?: boolean;

    /** When false, Paste parameter settings is disabled. */

    canPasteParameterConfig?: boolean;

  }



  interface Props {

    onRename?: (nodeId: string, nodeType: string) => void;

    onDuplicate?: (nodeId: string, nodeType: string) => void;

    onReadGuide?: (nodeId: string, nodeType: string) => void;

    onCopyNodeName?: (nodeType: string) => void;

    onCopyParameterConfig?: (nodeId: string, nodeType: string) => void;

    onPasteParameterConfig?: (nodeId: string, nodeType: string) => void;

    /** Reset stored parameters (and signal input modes) to type defaults — same as a newly placed node */

    onResetParameters?: (nodeId: string, nodeType: string) => void;

    onRemove?: (nodeId: string) => void;

  }



  let {

    onRename,

    onDuplicate,

    onReadGuide,

    onCopyNodeName,

    onCopyParameterConfig,

    onPasteParameterConfig,

    onResetParameters,

    onRemove,

  }: Props = $props();



  let dropdownMenuRef: import('../ui/DropdownMenu.svelte').default;



  export function show(

    x: number,

    y: number,

    nodeId: string,

    nodeType: string,

    options?: NodeContextMenuShowOptions

  ): void {

    const canPaste = options?.canPasteParameterConfig ?? false;

    const items: DropdownMenuItem[] = [

      { label: 'Rename', iconName: 'cursor-text', action: () => onRename?.(nodeId, nodeType) },

      { label: 'Duplicate', iconName: 'copy', action: () => onDuplicate?.(nodeId, nodeType) },

      { label: 'Read Guide', iconName: 'book-open-text', action: () => onReadGuide?.(nodeId, nodeType) },

      { label: 'Copy node name', iconName: 'copy', action: () => onCopyNodeName?.(nodeType) },

      {

        label: 'Copy config',

        iconName: 'selection-plus',

        action: () => onCopyParameterConfig?.(nodeId, nodeType),

      },

      {

        label: 'Paste config',

        iconName: 'selection-all',

        disabled: !canPaste,

        action: () => onPasteParameterConfig?.(nodeId, nodeType),

      },

      { type: 'separator' },

      { label: 'Reset', iconName: 'arrow-u-up-left', action: () => onResetParameters?.(nodeId, nodeType) },

      { label: 'Remove', iconName: 'trash', action: () => onRemove?.(nodeId) },

    ];

    dropdownMenuRef?.show(x, y, items, options);

  }



  export function hide(): void {

    dropdownMenuRef?.hide();

  }



  export function isVisible(): boolean {

    return dropdownMenuRef?.isVisible() ?? false;

  }

</script>



<DropdownMenu bind:this={dropdownMenuRef} class="node-right-click-menu" />


