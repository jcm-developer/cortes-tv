<script lang="ts">
  import Carousel from './Carousel.svelte';
  import PosterCard from './PosterCard.svelte';
  import { TmdbError } from '../lib/tmdb';
  import type { MediaSummary } from '../lib/types';

  /**
   * Loads one TMDB discovery row and shows it as a carousel of posters.
   *
   * @param title - The row heading.
   * @param loader - Fetches the titles; receives a signal that aborts on unmount.
   */
  interface Props {
    title: string;
    loader: (signal?: AbortSignal) => Promise<MediaSummary[]>;
  }
  let { title, loader }: Props = $props();

  let items = $state<MediaSummary[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  $effect(() => {
    const controller = new AbortController();
    loading = true;
    error = null;
    loader(controller.signal)
      .then((r) => (items = r))
      .catch((e) => {
        if ((e as Error)?.name === 'AbortError') return;
        error = e instanceof TmdbError ? e.message : 'No se pudo cargar.';
      })
      .finally(() => (loading = false));
    return () => controller.abort();
  });
</script>

{#if loading}
  <Carousel {title}>
    {#each Array(6) as _, i (i)}
      <div class="w-[8.25rem] sm:w-[9.5rem]"><div class="skeleton aspect-[2/3] rounded-xl"></div></div>
    {/each}
  </Carousel>
{:else if error}
  <!-- Silent: one failing row must not break Home -->
{:else if items.length > 0}
  <Carousel {title}>
    {#each items as item (item.mediaType + item.id)}
      <PosterCard {item} />
    {/each}
  </Carousel>
{/if}
