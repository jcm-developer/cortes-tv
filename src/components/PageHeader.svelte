<script lang="ts">
  /**
   * Renders the top of a tab: a large title and an optional subtitle. Settings live in the top bar.
   *
   * @param title - The large title.
   * @param subtitle - A muted line under the title.
   */
  interface Props {
    title: string;
    subtitle?: string;
  }
  let { title, subtitle }: Props = $props();
</script>

<header class="mb-5">
  <h1 class="large-title truncate">{title}</h1>
  {#if subtitle}<p class="mt-0.5 text-[15px] text-muted">{subtitle}</p>{/if}
</header>
