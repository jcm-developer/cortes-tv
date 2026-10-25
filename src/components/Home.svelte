<script lang="ts">
  /** Renders the Home tab: recommendations, the user's pending titles and TMDB discovery rows, or a setup hint without an API key. */
  import DiscoverRow from './DiscoverRow.svelte';
  import ForYouRow from './ForYouRow.svelte';
  import Carousel from './Carousel.svelte';
  import PosterCard from './PosterCard.svelte';
  import MissingKey from './MissingKey.svelte';
  import { pendingTitles, toSummary } from '../lib/store';
  import { hasApiKey, trending, topRatedMovies, topRatedTv, classicMovies, popularTv, nowPlaying } from '../lib/tmdb';
  import type { MediaSummary } from '../lib/types';
  import { openLibrary } from '../lib/ui';

  const discover: { title: string; loader: (s?: AbortSignal) => Promise<MediaSummary[]> }[] = [
    { title: 'Tendencias', loader: trending },
    { title: 'En cartelera', loader: nowPlaying },
    { title: 'Películas mejor valoradas', loader: topRatedMovies },
    { title: 'Series mejor valoradas', loader: topRatedTv },
    { title: 'Series populares', loader: popularTv },
    { title: 'Clásicos', loader: classicMovies },
  ];
</script>

<div class="animate-fade-in">
  <h1 class="sr-only">Inicio</h1>

  {#if !hasApiKey()}
    <MissingKey />
  {:else}
    <ForYouRow />

    {#if $pendingTitles.length > 0}
      <Carousel title="Tus pendientes" onSeeAll={() => openLibrary('pending')}>
        {#each $pendingTitles.slice(0, 20) as t (t.key)}
          <PosterCard item={toSummary(t)} />
        {/each}
      </Carousel>
    {/if}

    {#each discover as d (d.title)}
      <DiscoverRow title={d.title} loader={d.loader} />
    {/each}
  {/if}
</div>
