<script lang="ts">
  /** Renders the Library tab: Pending and Watched segments, a text filter and a filter sheet (type, sort, genre). */
  import Icon from './Icon.svelte';
  import PosterCard from './PosterCard.svelte';
  import Sheet from './Sheet.svelte';
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
  let filtersOpen = $state(false);

  function resetFilters() {
    query = '';
    filterType = 'all';
    filterGenre = 'all';
    sortKey = 'recent';
  }
  function resetSheetFilters() {
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
  /** Settings changed in the filter sheet, for the badge on its button; sort counts too. */
  const sheetFilterCount = $derived(
    Number(filterType !== 'all') + Number(filterGenre !== 'all') + Number(sortKey !== 'recent'),
  );
  const filtersActive = $derived(!!query.trim() || filterType !== 'all' || filterGenre !== 'all');
  const types: { value: 'all' | MediaType; label: string }[] = [
    { value: 'all', label: 'Todo' },
    { value: 'movie', label: 'Películas' },
    { value: 'tv', label: 'Series' },
  ];
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
    <div class="glass-search mt-4 mb-3 max-w-xl" role="search">
      <Icon name="search" size={19} />
      <input
        class="glass-search__input"
        type="search"
        inputmode="search"
        placeholder={$librarySegment === 'pending' ? 'Buscar en pendientes' : 'Buscar en vistas'}
        bind:value={query}
        enterkeyhint="search"
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
        aria-label="Buscar en la biblioteca"
      />
      {#if query}
        <button type="button" class="glass-btn glass-btn--plain glass-btn--sm glass-btn--icon" onclick={() => (query = '')} aria-label="Limpiar búsqueda">
          <Icon name="close" size={16} />
        </button>
      {/if}
      <!-- Flat inside the pill (no glass on glass); accent while filters are set -->
      <button
        type="button"
        class="glass-btn glass-btn--plain glass-btn--sm glass-btn--icon {sheetFilterCount ? 'glass-btn--prominent' : ''}"
        onclick={() => (filtersOpen = true)}
        aria-label={sheetFilterCount ? `Filtros, ${sheetFilterCount} activos` : 'Filtros'}
        aria-haspopup="dialog"
      >
        <Icon name="sliders" size={18} />
        {#if sheetFilterCount}
          <span class="absolute -top-1 -right-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-content px-1 text-[11px] font-bold text-bg tabular-nums" aria-hidden="true">{sheetFilterCount}</span>
        {/if}
      </button>
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

<Sheet open={filtersOpen} title="Filtros" onClose={() => (filtersOpen = false)}>
  <div class="flex flex-col gap-6">
    <section>
      <p class="group-label">Tipo</p>
      <div class="glass-segmented glass-segmented--plain w-full" role="radiogroup" aria-label="Tipo">
        <span class="glass-indicator" style="--count: {types.length}; --index: {Math.max(0, types.findIndex((t) => t.value === filterType))}" aria-hidden="true"></span>
        {#each types as t (t.value)}
          <button type="button" class="glass-segmented__option" role="radio" aria-checked={filterType === t.value} onclick={() => (filterType = t.value)}>
            {t.label}
          </button>
        {/each}
      </div>
    </section>

    <section>
      <p class="group-label">Ordenar por</p>
      <div class="group-list" role="radiogroup" aria-label="Ordenar por">
        {#each sortOptions as o (o.value)}
          <button
            type="button"
            class="flex items-center justify-between gap-3 min-h-11 px-3.5 text-left font-medium active:bg-fill"
            role="radio"
            aria-checked={sortKey === o.value}
            onclick={() => (sortKey = o.value)}
          >
            {o.label}
            {#if sortKey === o.value}<span class="text-accent"><Icon name="check" size={18} /></span>{/if}
          </button>
        {/each}
      </div>
    </section>

    {#if availableGenres.length > 0}
      <section>
        <p class="group-label">Género</p>
        <div class="flex flex-wrap gap-2">
          <button type="button" class="chip" aria-pressed={filterGenre === 'all'} onclick={() => (filterGenre = 'all')}>Todos</button>
          {#each availableGenres as g (g.id)}
            <button type="button" class="chip" aria-pressed={filterGenre === g.id} onclick={() => (filterGenre = g.id)}>{g.name}</button>
          {/each}
        </div>
      </section>
    {/if}

    <div class="grid grid-cols-2 gap-2.5">
      <button type="button" class="glass-btn glass-btn--plain" onclick={resetSheetFilters} disabled={!sheetFilterCount}>Restablecer</button>
      <button type="button" class="glass-btn glass-btn--plain glass-btn--prominent" onclick={() => (filtersOpen = false)}>
        Ver {visibleTitles.length} {visibleTitles.length === 1 ? 'título' : 'títulos'}
      </button>
    </div>
  </div>
</Sheet>
