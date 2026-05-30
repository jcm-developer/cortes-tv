<script lang="ts">
  import { toast } from '../lib/ui';
</script>

{#if $toast}
  <div
    class="glass-bar fixed left-1/2 -translate-x-1/2 bottom-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] z-[200]
           rounded-full px-5 py-3 text-sm font-medium max-w-[90vw] text-center shadow-sheet animate-fade-up"
    role="status"
    aria-live="polite"
  >
    {$toast}
  </div>
{/if}
