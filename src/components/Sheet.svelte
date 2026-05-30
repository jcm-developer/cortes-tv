<script lang="ts">
  import type { Snippet } from 'svelte';
  interface Props {
    open: boolean;
    title?: string;
    onClose: () => void;
    children: Snippet;
  }
  let { open, title, onClose, children }: Props = $props();

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }
</script>

<svelte:window onkeydown={onKey} />

{#if open}
  <div
    class="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-sm animate-fade-in"
    role="presentation"
    onclick={onClose}
  >
    <div
      class="shadow-sheet w-full sm:max-w-md max-h-[88dvh] overflow-y-auto no-scrollbar
             rounded-t-4xl sm:rounded-4xl px-5 sm:px-6 pt-2.5 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)]
             bg-neutral-50/95 dark:bg-neutral-900/95 backdrop-blur-2xl backdrop-saturate-150
             border border-black/10 dark:border-white/10
             animate-slide-up sm:animate-scale-in"
      role="dialog"
      aria-modal="true"
      aria-label={title ?? 'Diálogo'}
      onclick={(e) => e.stopPropagation()}
    >
      <div class="sm:hidden mx-auto mt-1 mb-3 h-1.5 w-10 rounded-full bg-black/15 dark:bg-white/20" aria-hidden="true"></div>
      {#if title}
        <h2 class="text-2xl font-semibold tracking-tight mb-4 mt-1">{title}</h2>
      {/if}
      {@render children()}
    </div>
  </div>
{/if}
