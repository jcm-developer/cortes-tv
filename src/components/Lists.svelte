<script lang="ts">
  import Icon from './Icon.svelte';
  import PosterCard from './PosterCard.svelte';
  import Select from './Select.svelte';
  import Sheet from './Sheet.svelte';
  import { img, ImageSize, getGenreMap } from '../lib/tmdb';
  import {
    lists,
    listCounts,
    getTitle,
    createList,
    renameList,
    deleteList,
    removeFromList,
    moveToList,
  } from '../lib/store';
  import { openDetail, showToast } from '../lib/ui';
  import type { MediaSummary, MediaType, StoredTitle } from '../lib/types';

  let openListId = $state<string | null>(null);
  const openList = $derived($lists.find((l) => l.id === openListId) ?? null);

  // --- Géneros (para filtros) ----------------------------------------------
  let genreMap = $state<Record<number, string>>({});
  $effect(() => {
    getGenreMap().then((m) => (genreMap = m)).catch(() => {});
  });

  // --- Crear lista ----------------------------------------------------------
  let creating = $state(false);
  let newName = $state('');
  function onCreate() {
    const n = newName.trim();
    if (!n) return;
    createList(n);
    newName = '';
    creating = false;
    showToast(`Lista "${n}" creada`);
  }

  // --- Filtros / orden ------------------------------------------------------
  type SortKey = 'added' | 'rating' | 'year' | 'title' | 'vote';
  let filterType = $state<'all' | MediaType>('all');
  let filterGenre = $state<number | 'all'>('all');
  let sortKey = $state<SortKey>('added');
  function resetFilters() {
    filterType = 'all';
    filterGenre = 'all';
    sortKey = 'added';
  }

  const listTitles = $derived<StoredTitle[]>(
    openList ? openList.itemKeys.map((k) => getTitle(k)).filter((t): t is StoredTitle => !!t) : [],
  );

  const availableGenres = $derived(() => {
    const ids = new Set<number>();
    for (const t of listTitles) for (const g of t.genreIds) ids.add(g);
    return [...ids]
      .map((id) => ({ id, name: genreMap[id] }))
      .filter((g) => g.name)
      .sort((a, b) => a.name!.localeCompare(b.name!));
  });

  const visibleTitles = $derived.by(() => {
    let arr = listTitles.slice();
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
        arr.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }
    return arr;
  });

  function toSummary(t: StoredTitle): MediaSummary {
    return {
      id: t.id,
      mediaType: t.mediaType,
      title: t.title,
      posterPath: t.posterPath,
      backdropPath: t.backdropPath,
      year: t.year,
      voteAverage: t.voteAverage,
      genreIds: t.genreIds,
    };
  }
  function open(item: MediaSummary) {
    openDetail({ mediaType: item.mediaType, id: item.id, preview: item });
  }

  // --- Acciones por elemento ------------------------------------------------
  let actionTarget = $state<StoredTitle | null>(null);
  function openActions(item: MediaSummary) {
    actionTarget = getTitle(`${item.mediaType}:${item.id}`) ?? null;
  }
  function doRemove() {
    if (!actionTarget || !openList) return;
    removeFromList(actionTarget.key, openList.id);
    showToast('Quitado de la lista');
    actionTarget = null;
  }
  function doMove(toId: string) {
    if (!actionTarget || !openList) return;
    moveToList(actionTarget.key, openList.id, toId);
    const dest = $lists.find((l) => l.id === toId)?.name ?? '';
    showToast(`Movido a "${dest}"`);
    actionTarget = null;
  }

  // --- Renombrar / eliminar lista -------------------------------------------
  let manage = $state(false);
  let renameValue = $state('');
  function startManage() {
    if (!openList) return;
    renameValue = openList.name;
    manage = true;
  }
  function confirmRename() {
    if (!openList) return;
    renameList(openList.id, renameValue);
    manage = false;
    showToast('Lista renombrada');
  }
  function confirmDelete() {
    if (!openList || openList.predefined) return;
    const name = openList.name;
    deleteList(openList.id);
    openListId = null;
    manage = false;
    showToast(`Lista "${name}" eliminada`);
  }

  function miniPoster(t: StoredTitle | undefined): string | null {
    return img(t?.posterPath, ImageSize.posterSmall);
  }
</script>

{#if !openList}
  <!-- ===================== OVERVIEW ===================== -->
  <div class="animate-fade-in pt-3 sm:pt-6">
    <header class="mb-5">
      <h1 class="text-2xl font-bold tracking-tight">Listas</h1>
      <p class="mt-1.5 text-[15px] text-muted">Crea y organiza tus propias listas de películas y series.</p>
    </header>

    <ul class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
      {#each $lists as l (l.id)}
        <li>
          <button
            class="glass w-full text-left p-4 !rounded-3xl flex flex-col gap-3 animate-fade-up
                   transition-transform duration-200 ease-apple hover:scale-[1.02] active:scale-[0.98]"
            onclick={() => { resetFilters(); openListId = l.id; }}
          >
            <div class="relative h-20">
              {#each l.itemKeys.slice(0, 3).map((k) => getTitle(k)).filter(Boolean) as t, i (t!.key)}
                <div
                  class="absolute top-0 w-14 aspect-[2/3] rounded-lg overflow-hidden shadow-poster ring-1 ring-black/5 dark:ring-white/10 bg-black/5 dark:bg-white/5"
                  style={`left:${i * 1.6}rem;transform:rotate(${(i - 1) * 3}deg)`}
                >
                  {#if miniPoster(t)}
                    <img src={miniPoster(t)} alt="" loading="lazy" class="h-full w-full object-cover" />
                  {:else}
                    <div class="grid h-full w-full place-items-center text-muted"><Icon name="film" size={18} /></div>
                  {/if}
                </div>
              {/each}
              {#if l.itemKeys.length === 0}
                <div class="grid h-full w-14 place-items-center rounded-lg border border-dashed border-black/15 dark:border-white/15 text-muted">
                  <Icon name="plus" size={20} />
                </div>
              {/if}
            </div>
            <div>
              <p class="font-semibold text-[15px] tracking-tight">{l.name}</p>
              <p class="text-[13px] text-muted">
                {$listCounts[l.id] ?? 0} {($listCounts[l.id] ?? 0) === 1 ? 'título' : 'títulos'}
                {#if l.predefined}<span class="mx-1">·</span>fija{/if}
              </p>
            </div>
          </button>
        </li>
      {/each}

      <li>
        {#if creating}
          <form class="glass w-full p-4 !rounded-3xl flex flex-col gap-3 justify-center min-h-[12rem]" onsubmit={(e) => { e.preventDefault(); onCreate(); }}>
            <!-- svelte-ignore a11y_autofocus -->
            <input class="field" bind:value={newName} placeholder="Nombre" maxlength="40" autofocus />
            <div class="flex gap-2">
              <button type="button" class="btn-glass flex-1 !px-0" onclick={() => { creating = false; newName = ''; }}>Cancelar</button>
              <button type="submit" class="btn-primary flex-1 !px-0" disabled={!newName.trim()}>Crear</button>
            </div>
          </form>
        {:else}
          <button class="w-full min-h-[12rem] rounded-3xl border border-dashed border-black/15 dark:border-white/15 flex flex-col items-center justify-center gap-2 text-muted transition-transform duration-200 ease-apple hover:scale-[1.02] active:scale-[0.98]" onclick={() => (creating = true)}>
            <span class="grid h-14 w-14 place-items-center rounded-full bg-accent/10 text-accent"><Icon name="plus" size={26} /></span>
            <span class="font-semibold text-[15px]">Nueva lista</span>
          </button>
        {/if}
      </li>
    </ul>
  </div>
{:else}
  <!-- ===================== DETALLE DE LISTA ===================== -->
  <div class="animate-fade-in pt-3 sm:pt-6">
    <div class="flex items-center gap-2 mb-1">
      <button class="grid h-11 w-11 place-items-center rounded-full -ml-2 text-content active:scale-90 transition-transform" onclick={() => (openListId = null)} aria-label="Volver">
        <Icon name="chevron-left" size={26} />
      </button>
      <div class="flex-1 min-w-0">
        <h1 class="text-2xl font-bold tracking-tight truncate">{openList.name}</h1>
        <p class="text-[13px] text-muted">{visibleTitles.length} de {listTitles.length} títulos</p>
      </div>
      <button class="grid h-11 w-11 place-items-center rounded-full text-muted hover:text-content active:scale-90 transition-transform" onclick={startManage} aria-label="Gestionar lista">
        <Icon name="ellipsis" size={22} />
      </button>
    </div>

    <!-- Filtros -->
    <div class="h-scroll items-center gap-2 py-3">
      <button class="chip" class:is-active={filterType === 'all'} onclick={() => (filterType = 'all')}>Todo</button>
      <button class="chip" class:is-active={filterType === 'movie'} onclick={() => (filterType = 'movie')}><Icon name="film" size={15} />Películas</button>
      <button class="chip" class:is-active={filterType === 'tv'} onclick={() => (filterType = 'tv')}><Icon name="tv" size={15} />Series</button>
      <span class="h-5 w-px bg-black/10 dark:bg-white/10 shrink-0"></span>
      <Select
        bind:value={sortKey}
        ariaLabel="Ordenar por"
        options={[
          { value: 'added', label: 'Recientes' },
          { value: 'rating', label: 'Mi nota' },
          { value: 'vote', label: 'Nota TMDB' },
          { value: 'year', label: 'Año' },
          { value: 'title', label: 'Título A-Z' },
        ]}
      />
      {#if availableGenres().length > 0}
        <Select
          bind:value={filterGenre}
          ariaLabel="Filtrar por género"
          options={[
            { value: 'all', label: 'Todos los géneros' },
            ...availableGenres().map((g) => ({ value: g.id, label: g.name })),
          ]}
        />
      {/if}
    </div>

    {#if listTitles.length === 0}
      <div class="flex flex-col items-center gap-2.5 py-16 text-center text-muted">
        <Icon name="film" size={40} />
        <p class="text-lg font-semibold text-content">Lista vacía</p>
        <p>Añade títulos desde Inicio o desde el detalle.</p>
      </div>
    {:else if visibleTitles.length === 0}
      <div class="flex flex-col items-center gap-3.5 py-16 text-center">
        <p class="text-muted">Ningún título coincide con los filtros.</p>
        <button class="btn-glass" onclick={resetFilters}>Quitar filtros</button>
      </div>
    {:else}
      <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-x-3 gap-y-5 pt-1">
        {#each visibleTitles as t (t.key)}
          <PosterCard item={toSummary(t)} width={0} rating={t.rating} cornerIcon="ellipsis" onOpen={open} onAdd={openActions} />
        {/each}
      </div>
    {/if}
  </div>
{/if}

<!-- Acciones de un elemento -->
<Sheet open={!!actionTarget} title={actionTarget?.title} onClose={() => (actionTarget = null)}>
  {#if actionTarget && openList}
    <p class="text-[11px] font-medium uppercase tracking-wide text-muted mb-2">Mover a</p>
    <ul class="flex flex-col gap-0.5 mb-4">
      {#each $lists.filter((l) => l.id !== openList!.id) as l (l.id)}
        <li>
          <button class="flex w-full items-center gap-3 min-h-[50px] px-2 rounded-xl text-content hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors active:scale-[0.99]" onclick={() => doMove(l.id)}>
            <Icon name="arrow-right" size={18} /><span class="font-medium">{l.name}</span>
          </button>
        </li>
      {/each}
    </ul>
    <button class="btn-danger w-full" onclick={doRemove}>
      <Icon name="trash" size={18} /> Quitar de “{openList.name}”
    </button>
  {/if}
</Sheet>

<!-- Gestionar lista -->
<Sheet open={manage} title="Gestionar lista" onClose={() => (manage = false)}>
  {#if openList}
    {#if openList.predefined}
      <p class="text-[15px] text-muted leading-relaxed">Esta es una lista fija; puedes ver su contenido pero no renombrarla ni eliminarla.</p>
    {:else}
      <label class="flex flex-col gap-1.5 mb-4">
        <span class="text-[11px] font-medium uppercase tracking-wide text-muted">Nombre</span>
        <input class="field" bind:value={renameValue} maxlength="40" />
      </label>
      <button class="btn-primary w-full mb-2.5" onclick={confirmRename}>Guardar nombre</button>
      <button class="btn-danger w-full" onclick={confirmDelete}>
        <Icon name="trash" size={18} /> Eliminar lista
      </button>
    {/if}
  {/if}
</Sheet>
