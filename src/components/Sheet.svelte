<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';

  /**
   * Renders a modal glass sheet: floating at the bottom on phones, centred on wider screens.
   * Closes on Escape, on the close button and on a backdrop press.
   *
   * @param open - Whether the sheet is shown.
   * @param title - The sheet heading, also its accessible name.
   * @param hideTitle - Whether the heading is left out because the content draws its own.
   * @param onClose - Called when the user dismisses the sheet.
   * @param children - The sheet content.
   */
  interface Props {
    open: boolean;
    title?: string;
    hideTitle?: boolean;
    onClose: () => void;
    children: Snippet;
  }
  let { open, title, hideTitle = false, onClose, children }: Props = $props();

  function onKey(e: KeyboardEvent) {
    if (open && e.key === 'Escape') onClose();
  }
</script>

<svelte:window onkeydown={onKey} />

{#if open}
  <div
    class="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/35 animate-fade-in
           px-2 pb-[calc(var(--safe-bottom)+0.5rem)] pt-[calc(var(--safe-top)+1.5rem)] sm:p-6"
    role="presentation"
    onclick={(e) => e.target === e.currentTarget && onClose()}
  >
    <div
      class="glass-sheet w-full sm:max-w-md max-h-full overflow-y-auto overscroll-contain no-scrollbar p-5 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title ?? 'Diálogo'}
    >
      <div class="flex items-start justify-between gap-3 {hideTitle ? 'absolute top-4 right-4 z-10' : 'mb-5'}">
        {#if title && !hideTitle}
          <h2 class="text-[1.375rem] font-bold tracking-tight pt-1">{title}</h2>
        {/if}
        <button type="button" class="glass-btn glass-btn--plain glass-btn--sm glass-btn--icon shrink-0" onclick={onClose} aria-label="Cerrar">
          <Icon name="close" size={18} />
        </button>
      </div>
      {@render children()}
    </div>
  </div>
{/if}
