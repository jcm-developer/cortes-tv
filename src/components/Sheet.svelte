<script lang="ts">
  import type { Snippet } from 'svelte';
  import { fade } from 'svelte/transition';
  import { cubicIn } from 'svelte/easing';
  import Icon from './Icon.svelte';

  /**
   * Renders a modal glass sheet: attached to the bottom edge on phones, where it can be dragged
   * down to close, and centred on desktop. Closes on Escape, on the close button and on a
   * backdrop press.
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

  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const phone = () => matchMedia('(max-width: 767px)').matches;

  /** Exit: slides down on phones, fades and shrinks on desktop. */
  function sheetOut(_node: Element) {
    const down = phone();
    return {
      duration: reducedMotion() ? 0 : down ? 260 : 180,
      easing: cubicIn,
      css: (t: number) => (down ? `transform: translateY(${(1 - t) * 100}%)` : `opacity: ${t}; transform: scale(${0.96 + 0.04 * t})`),
    };
  }

  // Drag to dismiss, from the grabber and the heading only, so the content still scrolls.
  let dragY = $state(0);
  let dragging = $state(false);
  let startY = 0;
  let startT = 0;

  function onPointerDown(e: PointerEvent) {
    if (!phone() || (e.target as Element).closest('button')) return;
    dragging = true;
    startY = e.clientY;
    startT = e.timeStamp;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: PointerEvent) {
    if (dragging) dragY = Math.max(0, e.clientY - startY);
  }
  function onPointerUp(e: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    const velocity = dragY / Math.max(1, e.timeStamp - startT);
    if (dragY > 120 || (dragY > 24 && velocity > 0.6)) onClose();
    else dragY = 0;
  }
  // A sheet that opens again starts in place.
  $effect(() => {
    if (open) dragY = 0;
  });

  function onKey(e: KeyboardEvent) {
    if (open && e.key === 'Escape') onClose();
  }
</script>

<svelte:window onkeydown={onKey} />

{#if open}
  <div
    class="fixed inset-0 z-[150] flex items-end md:items-center justify-center bg-black/35 animate-fade-in
           pt-[calc(var(--safe-top)+2.5rem)] md:p-6"
    role="presentation"
    onclick={(e) => e.target === e.currentTarget && onClose()}
    out:fade={{ duration: reducedMotion() ? 0 : 220 }}
  >
    <div
      class="glass-sheet glass-sheet--bottom flex flex-col w-full md:max-w-md max-h-full"
      style:translate={dragY ? `0 ${dragY}px` : undefined}
      style:transition={dragging ? 'none' : 'translate 300ms var(--glass-easing-smooth)'}
      role="dialog"
      aria-modal="true"
      aria-label={title ?? 'Diálogo'}
      out:sheetOut
    >
      <div
        class="relative shrink-0 touch-none px-5 md:px-6 pt-2 md:pt-6 {hideTitle ? '' : 'pb-4'}"
        onpointerdown={onPointerDown}
        onpointermove={onPointerMove}
        onpointerup={onPointerUp}
        onpointercancel={onPointerUp}
        role="presentation"
      >
        <span class="mx-auto mb-3 block h-[5px] w-9 rounded-full bg-content/25 md:hidden" aria-hidden="true"></span>
        <div class="flex items-start justify-between gap-3 {hideTitle ? 'absolute top-5 md:top-4 right-4 z-10' : ''}">
          {#if title && !hideTitle}
            <h2 class="text-[1.375rem] font-bold tracking-tight pt-1">{title}</h2>
          {/if}
          <button type="button" class="glass-btn glass-btn--plain glass-btn--sm glass-btn--icon shrink-0" onclick={onClose} aria-label="Cerrar">
            <Icon name="close" size={18} />
          </button>
        </div>
      </div>
      <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain no-scrollbar px-5 md:px-6 pb-[calc(var(--safe-bottom)+1.25rem)] md:pb-6 {hideTitle ? 'pt-2 md:pt-0' : ''}">
        {@render children()}
      </div>
    </div>
  </div>
{/if}
