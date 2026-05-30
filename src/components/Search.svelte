<script lang="ts">
  import PosterCard from './PosterCard.svelte';
  import Icon from './Icon.svelte';
  import { searchMulti, hasApiKey, TmdbError } from '../lib/tmdb';
  import type { MediaSummary } from '../lib/types';
  import { openDetail, openAddSheet } from '../lib/ui';

  let query = $state('');
  let results = $state<MediaSummary[]>([]);
  let searching = $state(false);
  let searchError = $state<string | null>(null);
  let searched = $state(false);
  let debounce: ReturnType<typeof setTimeout> | null = null;
  let controller: AbortController | null = null;
  let inputEl: HTMLInputElement;

  $effect(() => {
    inputEl?.focus();
  });

  function onInput() {
    if (debounce) clearTimeout(debounce);
    const q = query.trim();
    if (!q) {
      results = [];
      searching = false;
      searchError = null;
      searched = false;
      controller?.abort();
      return;
    }
    searching = true;
    debounce = setTimeout(runSearch, 350);
  }
  async function runSearch() {
    controller?.abort();
    controller = new AbortController();
    searchError = null;
    try {
      results = await searchMulti(query, controller.signal);
      searched = true;
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      searchError = err instanceof TmdbError ? err.message : 'Error al buscar.';
      results = [];
    } finally {
      searching = false;
    }
  }
  function clearSearch() {
    query = '';
    results = [];
    searchError = null;
    searched = false;
    inputEl?.focus();
  }
  function open(item: MediaSummary) {
    openDetail({ mediaType: item.mediaType, id: item.id, preview: item });
  }
</script>

<div class="animate-fade-in pt-3 sm:pt-6">
  <header class="mb-5">
    <h1 class="text-2xl font-bold tracking-tight">Buscar</h1>
    <p class="mt-1.5 text-[15px] text-muted">Encuentra películas, series y documentales, y añádelos a tus listas.</p>
  </header>

  <div class="glass-bar flex items-center gap-2.5 h-12 px-4 rounded-2xl text-muted">
    <Icon name="search" size={20} />
    <input
      bind:this={inputEl}
      type="search"
      inputmode="search"
      placeholder="Películas, series, documentales…"
      bind:value={query}
      oninput={onInput}
      enterkeyhint="search"
      autocomplete="off"
      autocorrect="off"
      autocapitalize="off"
      spellcheck="false"
      aria-label="Buscar"
      class="flex-1 min-w-0 bg-transparent border-none outline-none text-content placeholder:text-muted/70"
    />
    {#if query}
      <button class="grid h-7 w-7 place-items-center rounded-full bg-black/[0.06] dark:bg-white/10 active:scale-90 transition-transform" onclick={clearSearch} aria-label="Limpiar búsqueda">
        <Icon name="close" size={17} />
      </button>
    {/if}
  </div>

  {#if !hasApiKey()}
    <div class="glass mt-4 p-5 !rounded-2xl border-yellow-400/30 bg-yellow-400/[0.07]">
      <p class="text-lg font-semibold">Falta la API key de TMDB</p>
      <p class="mt-1 text-[15px] text-muted leading-relaxed">
        Define <code class="rounded bg-black/10 dark:bg-white/10 px-1.5 py-0.5 text-[0.85em]">PUBLIC_TMDB_API_KEY</code>
        en un archivo <code class="rounded bg-black/10 dark:bg-white/10 px-1.5 py-0.5 text-[0.85em]">.env</code> y recompila.
      </p>
    </div>
  {/if}

  <section class="mt-5">
    {#if searching}
      <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-x-3 gap-y-5">
        {#each Array(7) as _, i (i)}
          <div class="skeleton aspect-[2/3] rounded-2xl"></div>
        {/each}
      </div>
    {:else if searchError}
      <div class="flex flex-col items-center gap-3.5 py-12 text-center">
        <p class="text-muted">{searchError}</p>
        <button class="btn-glass" onclick={runSearch}>Reintentar</button>
      </div>
    {:else if results.length > 0}
      <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-x-3 gap-y-5">
        {#each results as item (item.mediaType + item.id)}
          <PosterCard {item} width={0} onOpen={open} onAdd={openAddSheet} />
        {/each}
      </div>
    {:else if searched}
      <div class="py-12 text-center text-muted">Sin resultados para “{query.trim()}”.</div>
    {:else if hasApiKey()}
      <div class="flex flex-col items-center gap-2.5 py-16 text-center text-muted">
        <Icon name="search" size={40} />
        <p class="text-lg font-semibold text-content">Busca cualquier título</p>
        <p>Escribe arriba para encontrar películas, series y documentales.</p>
      </div>
    {/if}
  </section>
</div>
