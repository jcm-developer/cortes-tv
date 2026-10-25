<script lang="ts">
  /** Renders the Library tab: Pending and Watched segments with text, type, genre and sort filters. */
  import Icon from './Icon.svelte';
  import PosterCard from './PosterCard.svelte';
  import Select from './Select.svelte';
  import PageHeader from './PageHeader.svelte';
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

<div class="animate-fade-in">
  <PageHeader
    title="Biblioteca"
    subtitle={`${$pendingTitles.length} pendientes · ${$watchedTitles.length} vistas${average ? ` · nota media ${average}` : ''}`}
  />

  <div class="glass-segmented w-full max-w-sm" role="radiogroup" aria-label="Estado">
    <span class="glass-indicator" style="--count: 2; --index: {$librarySegment === 'pending' ? 0 : 1}" aria-hidden="true"></span>
    <button type="button" class="glass-segmented__option" role="radio" aria-checked={$librarySegment === 'pending'} onclick={() => switchTo('pending')}>
      Pendientes <span class="tabular-nums opacity-60">{$pendingTitles.length}</span>
    </button>
    <button type="button" class="glass-segmented__option" role="radio" aria-checked={$librarySegment === 'watched'} onclick={() => switchTo('watched')}>
      Vistas <span class="tabular-nums opacity-60">{$watchedTitles.length}</span>
    </button>
  </div>

  {#if segmentTitles.length > 0}
    <div class="mt-4 flex items-center gap-2.5 h-11 px-3.5 rounded-xl bg-fill text-muted max-w-xl">
      <Icon name="search" size={18} />
      <input
        type="search"
        placeholder={$librarySegment === 'pending' ? 'Buscar en pendientes' : 'Buscar en vistas'}
        bind:value={query}
        enterkeyhint="search"
        autocomplete="off"
        spellcheck="false"
        aria-label="Buscar en la biblioteca"
        class="flex-1 min-w-0 bg-transparent border-none outline-none text-content placeholder:text-muted"
      />
      {#if query}
        <button type="button" class="grid h-7 w-7 place-items-center rounded-full bg-fill text-content" onclick={() => (query = '')} aria-label="Limpiar búsqueda">
          <Icon name="close" size={15} />
        </button>
      {/if}
    </div>

    <div class="h-scroll items-center gap-2 py-3">
      <button type="button" class="chip" aria-pressed={filterType === 'all'} onclick={() => (filterType = 'all')}>Todo</button>
      <button type="button" class="chip" aria-pressed={filterType === 'movie'} onclick={() => (filterType = 'movie')}>Películas</button>
      <button type="button" class="chip" aria-pressed={filterType === 'tv'} onclick={() => (filterType = 'tv')}>Series</button>
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
    <div class="flex flex-col items-center gap-2 py-16 text-center text-muted">
      <Icon name={$librarySegment === 'pending' ? 'bookmark' : 'check-circle'} size={40} />
      <p class="mt-1 text-lg font-semibold text-content">
        {$librarySegment === 'pending' ? 'Nada pendiente' : 'Aún no has marcado nada como visto'}
      </p>
      <p class="max-w-xs">
        {$librarySegment === 'pending'
          ? 'Pulsa + en cualquier póster para guardarlo y verlo más tarde.'
          : 'Marca títulos como vistos y valóralos para recibir recomendaciones.'}
      </p>
      <button type="button" class="glass-btn mt-3" onclick={() => activeTab.set('search')}>
        <Icon name="search" size={18} /> Buscar títulos
      </button>
    </div>
  {:else if visibleTitles.length === 0}
    <div class="flex flex-col items-center gap-4 py-16 text-center">
      <p class="text-muted">Ningún título coincide con los filtros.</p>
      <button type="button" class="glass-btn" onclick={resetFilters}>Quitar filtros</button>
    </div>
  {:else}
    {#if filtersActive}
      <p class="text-[13px] text-muted mb-2">{visibleTitles.length} de {segmentTitles.length}</p>
    {/if}
    <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-x-3 gap-y-5 sm:gap-x-4 pt-1">
      {#each visibleTitles as t (t.key)}
        <PosterCard item={toSummary(t)} fill />
      {/each}
    </div>
  {/if}
</div>
