<script lang="ts">
  import DiscoverRow from './DiscoverRow.svelte';
  import Icon from './Icon.svelte';
  import {
    hasApiKey,
    trending,
    topRatedMovies,
    topRatedTv,
    classicMovies,
    popularTv,
    nowPlaying,
  } from '../lib/tmdb';
  import type { MediaSummary } from '../lib/types';
  import { activeTab } from '../lib/ui';

  const discover: { title: string; subtitle?: string; loader: (s?: AbortSignal) => Promise<MediaSummary[]> }[] = [
    { title: 'Tendencias esta semana', subtitle: 'vía TMDB', loader: trending },
    { title: 'Películas mejor valoradas', loader: topRatedMovies },
    { title: 'Series mejor valoradas', loader: topRatedTv },
    { title: 'Clásicos imprescindibles', loader: classicMovies },
    { title: 'En cartelera', loader: nowPlaying },
    { title: 'Series populares', loader: popularTv },
  ];
</script>

<div class="animate-fade-in">
  {#if !hasApiKey()}
    <div class="glass mb-2 p-5 !rounded-2xl border-yellow-400/30 bg-yellow-400/[0.07]">
      <p class="text-lg font-semibold">Falta la API key de TMDB</p>
      <p class="mt-1 text-[15px] text-muted leading-relaxed">
        Define <code class="rounded bg-black/10 dark:bg-white/10 px-1.5 py-0.5 text-[0.85em]">PUBLIC_TMDB_API_KEY</code>
        en un archivo <code class="rounded bg-black/10 dark:bg-white/10 px-1.5 py-0.5 text-[0.85em]">.env</code> y recompila.
      </p>
    </div>
  {:else}
    {#each discover as d (d.title)}
      <DiscoverRow title={d.title} subtitle={d.subtitle} loader={d.loader} />
    {/each}

    <div class="mt-8 flex items-center justify-center gap-2 text-muted">
      <Icon name="search" size={18} />
      <span class="text-[15px]">¿Buscas algo concreto? Usa la pestaña <button class="font-semibold text-accent" onclick={() => activeTab.set('search')}>Buscar</button>.</span>
    </div>
  {/if}
</div>
