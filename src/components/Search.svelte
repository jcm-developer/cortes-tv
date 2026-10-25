<script lang="ts">
  /** Renders the Search tab: debounced TMDB multi search; each result opens the title sheet. */
  import PosterCard from './PosterCard.svelte';
  import Icon from './Icon.svelte';
  import PageHeader from './PageHeader.svelte';
  import MissingKey from './MissingKey.svelte';
  import { searchMulti, hasApiKey, TmdbError } from '../lib/tmdb';
  import type { MediaSummary } from '../lib/types';

  let query = $state('');
  let results = $state<MediaSummary[]>([]);
  let searching = $state(false);
  let searchError = $state<string | null>(null);
  let searched = $state(false);
  let debounce: ReturnType<typeof setTimeout> | null = null;
  let controller: AbortController | null = null;
  let inputEl: HTMLInputElement;
  const grid = 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-x-3 gap-y-5 sm:gap-x-4';

  // Autofocus with a mouse only: on touch it would open the keyboard on every visit.
  $effect(() => {
    if (matchMedia('(pointer: fine)').matches) inputEl?.focus();
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
</script>

<div class="animate-fade-in">
  <PageHeader title="Buscar" />

  <!-- Sticky glass pill: chrome over the results that scroll under it -->
  <div class="sticky top-[calc(var(--topbar-top)+var(--topbar-h)+0.5rem)] z-30">
    <div class="glass-search" role="search">
      <Icon name="search" size={19} />
      <input
        bind:this={inputEl}
        class="glass-search__input"
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
      />
      {#if query}
        <button type="button" class="glass-btn glass-btn--plain glass-btn--sm glass-btn--icon" onclick={clearSearch} aria-label="Limpiar búsqueda">
          <Icon name="close" size={16} />
        </button>
      {/if}
    </div>
  </div>

  {#if !hasApiKey()}
    <div class="mt-5"><MissingKey /></div>
  {/if}

  <section class="mt-6">
    {#if searching}
      <div class={grid}>
        {#each Array(8) as _, i (i)}
          <div class="skeleton aspect-[2/3] rounded-xl"></div>
        {/each}
      </div>
    {:else if searchError}
      <div class="flex flex-col items-center gap-4 py-12 text-center">
        <p class="text-muted">{searchError}</p>
        <button type="button" class="glass-btn" onclick={runSearch}>Reintentar</button>
      </div>
    {:else if results.length > 0}
      <div class={grid}>
        {#each results as item (item.mediaType + item.id)}
          <PosterCard {item} fill />
        {/each}
      </div>
    {:else if searched}
      <p class="py-12 text-center text-muted">Sin resultados para “{query.trim()}”.</p>
    {:else if hasApiKey()}
      <div class="flex flex-col items-center gap-2 py-16 text-center text-muted">
        <Icon name="search" size={40} />
        <p class="mt-1 text-lg font-semibold text-content">Busca cualquier título</p>
        <p class="max-w-xs">Encuentra películas, series y documentales, y guárdalos como pendientes o vistos.</p>
      </div>
    {/if}
  </section>
</div>
