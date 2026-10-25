<script lang="ts">
  /** Renders the Library tab: Pending and Watched segments with text, type, genre and sort filters. */
  import Icon from './Icon.svelte';
  import PosterCard from './PosterCard.svelte';
  import Select from './Select.svelte';
  import { getGenreMap } from '../lib/tmdb';
  import { pendingTitles, watchedTitles, toSummary } from '../lib/store';
  import { activeTab, librarySegment } from '../lib/ui';
  import type { MediaType, StoredTitle, TitleStatus } from '../lib/types';

  let genreMap = $state<Record<number, string>>({});
  $effect(() => {
    getGenreMap().then((m) => (genreMap = m)).catch(() => {});
  });

  type SortKey = 'recent' | 'rating' | 'vote' | 'year' | 'title';
  let query = $state('');
  let filterType = $state<'all' | MediaType>('all');
  let filterGenre = $state<number | 'all'>('all');
  let sortKey = $state<SortKey>('recent');

  function resetFilters() {
    query = '';
    filterType = 'all';
    filterGenre = 'all';
    sortKey = 'recent';
  }
  function switchTo(s: TitleStatus) {
    if ($librarySegment === s) return;
    librarySegment.set(s);
    if (s === 'pending' && sortKey === 'rating') sortKey = 'recent';
    filterGenre = 'all';
  }

  const segmentTitles = $derived<StoredTitle[]>($librarySegment === 'pending' ? $pendingTitles : $watchedTitles);

  const availableGenres = $derived.by(() => {
    const ids = new Set<number>();
    for (const t of segmentTitles) for (const g of t.genreIds) ids.add(g);
    return [...ids]
      .map((id) => ({ id, name: genreMap[id] }))
      .filter((g): g is { id: number; name: string } => !!g.name)
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  /** Lowercases and strips accents so "pelicula" finds "Película". */
  function fold(s: string): string {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  const visibleTitles = $derived.by(() => {
    let arr = segmentTitles.slice();
    const q = fold(query.trim());
    if (q) arr = arr.filter((t) => fold(t.title).includes(q));
    if (filterType !== 'all') arr = arr.filter((t) => t.mediaType === filterType);
    if (filterGenre !== 'all') arr = arr.filter((t) => t.genreIds.includes(filterGenre as number));
    switch (sortKey) {
      case 'rating':
        arr.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
        break;
      case 'vote':
        arr.sort((a, b) => (b.voteAverage ?? -1) - (a.voteAverage ?? -1));
        break;
      case 'year':
        arr.sort((a, b) => (b.year ?? '').localeCompare(a.year ?? ''));
        break;
      case 'title':
        arr.sort((a, b) => a.title.localeCompare(b.title, 'es'));
        break;
    }
    return arr;
  });

  const sortOptions = $derived<{ value: SortKey; label: string }[]>(
    $librarySegment === 'pending'
      ? [
          { value: 'recent', label: 'Añadidas recientemente' },
          { value: 'vote', label: 'Nota TMDB' },
          { value: 'year', label: 'Año' },
          { value: 'title', label: 'Título A-Z' },
        ]
      : [
          { value: 'recent', label: 'Vistas recientemente' },
          { value: 'rating', label: 'Mi nota' },
          { value: 'vote', label: 'Nota TMDB' },
          { value: 'year', label: 'Año' },
          { value: 'title', label: 'Título A-Z' },
        ],
  );

  const average = $derived.by(() => {
    const rated = $watchedTitles.filter((t) => t.rating);
    if (!rated.length) return null;
    return (rated.reduce((s, t) => s + (t.rating ?? 0), 0) / rated.length).toFixed(1);
  });
  const filtersActive = $derived(!!query.trim() || filterType !== 'all' || filterGenre !== 'all');
</script>

<div class="animate-fade-in pt-3 sm:pt-6">
  <header class="mb-4 flex items-end justify-between gap-3">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">Biblioteca</h1>
      <p class="mt-1 text-[15px] text-muted">
        {$pendingTitles.length} pendientes · {$watchedTitles.length} vistas{#if average}<span> · nota media {average}</span>{/if}
      </p>
    </div>
  </header>

  <div class="segmented mb-3 max-w-md" role="group" aria-label="Estado">
    <span class="segmented__thumb" style={`width: calc(50% - 0.25rem); transform: translateX(${$librarySegment === 'pending' ? 0 : 100}%)`} aria-hidden="true"></span>
    <button aria-pressed={$librarySegment === 'pending'} onclick={() => switchTo('pending')}>
      <Icon name="bookmark" size={16} />Pendientes
      <span class="tabular-nums text-xs opacity-70">{$pendingTitles.length}</span>
    </button>
    <button aria-pressed={$librarySegment === 'watched'} onclick={() => switchTo('watched')}>
      <Icon name="check-circle" size={16} />Vistas
      <span class="tabular-nums text-xs opacity-70">{$watchedTitles.length}</span>
    </button>
  </div>

  {#if segmentTitles.length > 0}
    <div class="flex items-center gap-2.5 h-11 px-3.5 rounded-xl bg-black/[0.05] dark:bg-white/[0.08] text-muted">
      <Icon name="search" size={18} />
      <input
        type="search"
        placeholder={$librarySegment === 'pending' ? 'Buscar en pendientes' : 'Buscar en vistas'}
        bind:value={query}
        enterkeyhint="search"
        autocomplete="off"
        spellcheck="false"
        aria-label="Buscar en la biblioteca"
        class="flex-1 min-w-0 bg-transparent border-none outline-none text-content placeholder:text-muted/70"
      />
      {#if query}
        <button class="grid h-7 w-7 place-items-center rounded-full bg-black/[0.06] dark:bg-white/10 active:scale-90 transition-transform" onclick={() => (query = '')} aria-label="Limpiar búsqueda">
          <Icon name="close" size={16} />
        </button>
      {/if}
    </div>

    <div class="h-scroll items-center gap-2 py-3">
      <button class="chip" class:is-active={filterType === 'all'} onclick={() => (filterType = 'all')}>Todo</button>
      <button class="chip" class:is-active={filterType === 'movie'} onclick={() => (filterType = 'movie')}><Icon name="film" size={15} />Películas</button>
      <button class="chip" class:is-active={filterType === 'tv'} onclick={() => (filterType = 'tv')}><Icon name="tv" size={15} />Series</button>
      <span class="h-5 w-px bg-black/10 dark:bg-white/10 shrink-0"></span>
      <Select bind:value={sortKey} ariaLabel="Ordenar por" options={sortOptions} />
      {#if availableGenres.length > 0}
        <Select
          bind:value={filterGenre}
          ariaLabel="Filtrar por género"
          options={[{ value: 'all', label: 'Todos los géneros' }, ...availableGenres.map((g) => ({ value: g.id, label: g.name }))]}
        />
      {/if}
    </div>
  {/if}

  {#if segmentTitles.length === 0}
    <div class="flex flex-col items-center gap-2.5 py-16 text-center text-muted">
      <Icon name={$librarySegment === 'pending' ? 'bookmark' : 'check-circle'} size={40} />
      <p class="text-lg font-semibold text-content">
        {$librarySegment === 'pending' ? 'Nada pendiente' : 'Aún no has marcado nada como visto'}
      </p>
      <p class="max-w-xs">
        {$librarySegment === 'pending'
          ? 'Pulsa + en cualquier póster para guardarlo y verlo más tarde.'
          : 'Marca títulos como vistos y valóralos para recibir recomendaciones.'}
      </p>
      <button class="btn-glass mt-2" onclick={() => activeTab.set('search')}>
        <Icon name="search" size={18} /> Buscar títulos
      </button>
    </div>
  {:else if visibleTitles.length === 0}
    <div class="flex flex-col items-center gap-3.5 py-16 text-center">
      <p class="text-muted">Ningún título coincide con los filtros.</p>
      <button class="btn-glass" onclick={resetFilters}>Quitar filtros</button>
    </div>
  {:else}
    {#if filtersActive}
      <p class="text-[13px] text-muted mb-2">{visibleTitles.length} de {segmentTitles.length}</p>
    {/if}
    <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-x-3 gap-y-5 pt-1">
      {#each visibleTitles as t (t.key)}
        <PosterCard item={toSummary(t)} width={0} />
      {/each}
    </div>
  {/if}
</div>
