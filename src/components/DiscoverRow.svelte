<script lang="ts">
  import Carousel from './Carousel.svelte';
  import PosterCard from './PosterCard.svelte';
  import { TmdbError } from '../lib/tmdb';
  import type { MediaSummary } from '../lib/types';
  import { openDetail, openAddSheet } from '../lib/ui';

  interface Props {
    title: string;
    subtitle?: string;
    loader: (signal?: AbortSignal) => Promise<MediaSummary[]>;
  }
  let { title, subtitle, loader }: Props = $props();

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

  function open(item: MediaSummary) {
    openDetail({ mediaType: item.mediaType, id: item.id, preview: item });
  }
</script>

{#if loading}
  <Carousel {title} {subtitle}>
    {#each Array(6) as _, i (i)}
      <div style="width:132px"><div class="skeleton aspect-[2/3] rounded-2xl"></div></div>
    {/each}
  </Carousel>
{:else if error}
  <!-- silencioso: una fila que falla no debe romper la Home -->
{:else if items.length > 0}
  <Carousel {title} {subtitle}>
    {#each items as item (item.mediaType + item.id)}
      <PosterCard {item} onOpen={open} onAdd={openAddSheet} />
    {/each}
  </Carousel>
{/if}
