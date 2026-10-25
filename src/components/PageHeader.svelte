<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';
  import { settingsOpen } from '../lib/ui';

  /**
   * Renders the top of a tab: a large title (or custom content such as the logo), an optional
   * subtitle and the settings button.
   *
   * @param title - The large title.
   * @param subtitle - A muted line under the title.
   * @param children - Replaces the title, such as the wordmark on Home.
   */
  interface Props {
    title?: string;
    subtitle?: string;
    children?: Snippet;
  }
  let { title, subtitle, children }: Props = $props();
</script>

<header class="flex items-center justify-between gap-4 min-h-12 mb-5">
  <div class="min-w-0">
    {#if children}
      {@render children()}
    {:else}
      <h1 class="large-title truncate">{title}</h1>
    {/if}
    {#if subtitle}<p class="mt-0.5 text-[15px] text-muted">{subtitle}</p>{/if}
  </div>
  <button type="button" class="glass-btn glass-btn--icon shrink-0" onclick={() => settingsOpen.set(true)} aria-label="Ajustes">
    <Icon name="sliders" size={21} />
  </button>
</header>
