<script lang="ts">
  /** Renders the current toast from the `toast` store, with its optional action button. */
  import { toast, hideToast } from '../lib/ui';

  function runAction() {
    $toast?.action?.run();
    hideToast();
  }
</script>

{#if $toast}
  <!-- Above the tab bar, which sits under every screen except the detail view -->
  <div
    class="glass-toast fixed left-1/2 -translate-x-1/2 z-[200] bottom-[calc(var(--tabbar-bottom)+4.75rem)] {$toast.action ? '' : 'pr-5'}"
    role="status"
    aria-live="polite"
  >
    <span class="py-1">{$toast.message}</span>
    {#if $toast.action}
      <button type="button" class="glass-btn glass-btn--plain glass-btn--sm shrink-0 text-accent" onclick={runAction}>
        {$toast.action.label}
      </button>
    {/if}
  </div>
{/if}
