<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';

  /**
   * Renders a horizontal row with a heading, an optional "see all" action and, on devices with a
   * pointer, scroll buttons in the heading. On touch it bleeds to the screen edges; with a mouse
   * it stays inside the page column and fades out on the sides that can still scroll.
   *
   * @param title - The heading.
   * @param onSeeAll - Shows a "Ver todo" action that calls it.
   * @param class - Classes of the `<section>`; sets the vertical margin.
   * @param children - The items.
   */
  interface Props {
    title?: string;
    onSeeAll?: () => void;
    class?: string;
    children: Snippet;
  }
  let { title, onSeeAll, class: className = 'mb-8 animate-fade-up', children }: Props = $props();

  let track = $state<HTMLDivElement>();
  let canLeft = $state(false);
  let canRight = $state(false);

  function update() {
    const el = track;
    if (!el) return;
    canLeft = el.scrollLeft > 4;
    canRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
  }
  function scroll(dir: 1 | -1) {
    track?.scrollBy({ left: dir * track.clientWidth * 0.8, behavior: 'smooth' });
  }

  $effect(() => {
    update();
  });
</script>

<svelte:window onresize={update} />

<section class={className}>
  {#if title || onSeeAll}
    <header class="flex items-center justify-between gap-3 mb-3">
      {#if title}<h2 class="section-title truncate">{title}</h2>{/if}
      <div class="flex shrink-0 items-center gap-2">
        {#if onSeeAll}
          <button type="button" class="text-[15px] font-medium text-accent active:opacity-60" onclick={onSeeAll}>Ver todo</button>
        {/if}
        <div class="hidden [@media(hover:hover)]:flex gap-1.5">
          <button type="button" class="glass-btn glass-btn--sm glass-btn--icon" onclick={() => scroll(-1)} disabled={!canLeft} aria-label="Anteriores">
            <Icon name="chevron-left" size={18} />
          </button>
          <button type="button" class="glass-btn glass-btn--sm glass-btn--icon" onclick={() => scroll(1)} disabled={!canRight} aria-label="Siguientes">
            <Icon name="chevron-right" size={18} />
          </button>
        </div>
      </div>
    </header>
  {/if}

  <div
    bind:this={track}
    onscroll={update}
    class="h-scroll gap-3 sm:gap-4"
    data-more-left={canLeft || undefined}
    data-more-right={canRight || undefined}
  >
    {@render children()}
  </div>
</section>
