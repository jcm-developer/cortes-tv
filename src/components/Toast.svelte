<script lang="ts">
  /** Renders the current toast from the `toast` store, with its optional action button. */
  import { toast, hideToast } from '../lib/ui';

  function runAction() {
    $toast?.action?.run();
    hideToast();
  }
</script>

{#if $toast}
  <div
    class="glass-bar fixed left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3
           bottom-[calc(env(safe-area-inset-bottom,0px)+5.75rem)] sm:bottom-[calc(env(safe-area-inset-bottom,0px)+1.25rem)]
           rounded-full pl-5 {$toast.action ? 'pr-2' : 'pr-5'} py-2 min-h-11 text-sm font-medium max-w-[92vw] shadow-sheet animate-fade-up"
    role="status"
    aria-live="polite"
  >
    <span class="py-1">{$toast.message}</span>
    {#if $toast.action}
      <button class="shrink-0 rounded-full px-3.5 min-h-9 font-semibold text-accent hover:bg-accent/10 active:scale-95 transition-transform" onclick={runAction}>
        {$toast.action.label}
      </button>
    {/if}
  </div>
{/if}
