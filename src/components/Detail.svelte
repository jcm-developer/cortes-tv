<script lang="ts">
  import Icon from './Icon.svelte';
  import Carousel from './Carousel.svelte';
  import StarRating from './StarRating.svelte';
  import { getDetail, img, ImageSize, TmdbError } from '../lib/tmdb';
  import type { MediaDetail, MediaSummary } from '../lib/types';
  import { detailTarget, closeDetail, openAddSheet, showToast } from '../lib/ui';
  import { appData, getTitle, listsContaining, setRating, setWatchedAt } from '../lib/store';
  import { formatRuntime, formatVote, mediaTypeLabel, todayDate } from '../lib/format';

  const target = $derived($detailTarget);

  let detail = $state<MediaDetail | null>(null);
  let loading = $state(false);
  let error = $state<string | null>(null);
  let controller: AbortController | null = null;

  $effect(() => {
    const t = target;
    if (!t) return;
    detail = null;
    error = null;
    loading = true;
    controller?.abort();
    controller = new AbortController();
    getDetail(t.mediaType, t.id, controller.signal)
      .then((d) => (detail = d))
      .catch((e) => {
        if ((e as Error)?.name === 'AbortError') return;
        error = e instanceof TmdbError ? e.message : 'No se pudo cargar el detalle.';
      })
      .finally(() => (loading = false));
  });

  const view = $derived(detail ?? target?.preview ?? null);
  const key = $derived(target ? `${target.mediaType}:${target.id}` : '');
  const stored = $derived($appData && key ? getTitle(key) : undefined);
  const inLists = $derived($appData && key ? listsContaining(key) : []);
  const inListNames = $derived($appData.lists.filter((l) => inLists.includes(l.id)).map((l) => l.name));

  const backdrop = $derived(
    img(view?.backdropPath, ImageSize.backdropLarge) ?? img(view?.posterPath, ImageSize.posterLarge),
  );
  const poster = $derived(img(view?.posterPath, ImageSize.poster));
  const providers = $derived(detail?.providers ?? null);

  function summaryOf(): MediaSummary | null {
    if (!view) return null;
    return {
      id: view.id, mediaType: view.mediaType, title: view.title,
      posterPath: view.posterPath, backdropPath: view.backdropPath,
      year: view.year, voteAverage: view.voteAverage, genreIds: view.genreIds,
    };
  }
  function addToList() {
    const s = summaryOf();
    if (s) openAddSheet(s);
  }

  function onRate(v: number | null) {
    if (!stored) { showToast('Añade el título a una lista para valorarlo'); return; }
    setRating(key, v);
  }
  function onWatched(e: Event) {
    if (!stored) return;
    setWatchedAt(key, (e.target as HTMLInputElement).value || null);
  }
  function markWatchedToday() {
    if (!stored) { showToast('Añade el título a una lista primero'); return; }
    setWatchedAt(key, todayDate());
  }

  function metaLine(): string {
    const parts: string[] = [];
    if (view?.year) parts.push(view.year);
    if (view) parts.push(mediaTypeLabel(view.mediaType));
    if (detail?.runtime) { const r = formatRuntime(detail.runtime); if (r) parts.push(r); }
    if (detail?.seasons) parts.push(`${detail.seasons} ${detail.seasons === 1 ? 'temporada' : 'temporadas'}`);
    return parts.join('  ·  ');
  }
</script>

{#if target}
  <div class="fixed inset-0 z-[120] bg-bg animate-fade-in" role="dialog" aria-modal="true" aria-label={view?.title ?? 'Detalle'}>
    <!-- Cabecera flotante -->
    <div class="absolute top-safe inset-x-3 sm:inset-x-4 z-10 flex justify-between pointer-events-none">
      <button class="pointer-events-auto grid h-10 w-10 place-items-center rounded-full text-white bg-black/40 backdrop-blur-xl border border-white/15 active:scale-90 transition-transform" onclick={closeDetail} aria-label="Cerrar">
        <Icon name="chevron-left" size={24} />
      </button>
      <button class="pointer-events-auto grid h-10 w-10 place-items-center rounded-full text-white bg-black/40 backdrop-blur-xl border border-white/15 active:scale-90 transition-transform" onclick={addToList} aria-label="Añadir a una lista">
        <Icon name="plus" size={24} />
      </button>
    </div>

    <div class="h-full overflow-y-auto no-scrollbar overscroll-contain pb-16">
      <!-- Backdrop -->
      <div class="relative min-h-[56vh] flex items-end">
        {#if backdrop}
          <img class="absolute inset-0 h-full w-full object-cover" src={backdrop} alt="" decoding="async" />
        {/if}
        <div class="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-bg"></div>
        <div class="relative mx-auto w-full max-w-3xl flex items-end gap-4 p-4 sm:p-6">
          {#if poster}
            <img class="w-24 sm:w-32 shrink-0 aspect-[2/3] object-cover rounded-2xl shadow-poster ring-1 ring-white/10" src={poster} alt={view?.title} />
          {/if}
          <div class="flex-1 min-w-0 pb-1 text-white">
            <h1 class="text-3xl sm:text-4xl font-bold tracking-tight selectable [text-shadow:0_2px_20px_rgba(0,0,0,0.55)]">{view?.title ?? '—'}</h1>
            <p class="mt-1.5 text-sm font-medium text-white/80">{metaLine()}</p>
            <div class="mt-2.5 flex flex-wrap gap-1.5">
              {#if formatVote(view?.voteAverage ?? null)}
                <span class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold text-yellow-300 bg-black/40 backdrop-blur-md">
                  <Icon name="star-fill" size={13} />{formatVote(view!.voteAverage)}
                </span>
              {/if}
              {#each detail?.genres?.slice(0, 3) ?? [] as g (g.id)}
                <span class="rounded-full px-2.5 py-1 text-xs font-medium text-white/90 bg-white/15 backdrop-blur-md">{g.name}</span>
              {/each}
            </div>
          </div>
        </div>
      </div>

      <div class="mx-auto w-full max-w-3xl px-4 sm:px-6">
        {#if inListNames.length > 0}
          <div class="inline-flex items-center gap-1.5 text-accent text-sm font-medium mb-3">
            <Icon name="check" size={16} /><span>En {inListNames.join(', ')}</span>
          </div>
        {/if}

        <button class="btn-primary w-full mb-4" onclick={addToList}>
          <Icon name="plus" size={20} />{inListNames.length > 0 ? 'Gestionar listas' : 'Añadir a una lista'}
        </button>

        {#if error}<p class="text-red-500 text-[15px] mb-3">{error}</p>{/if}

        <!-- Valoración personal -->
        <section class="mt-6">
          <h2 class="text-[11px] font-medium uppercase tracking-wide text-muted mb-3">Tu valoración</h2>
          <div class="flex flex-col gap-3.5">
            <StarRating value={stored?.rating ?? null} onChange={onRate} />
            <div class="flex items-center gap-2.5">
              <label class="inline-flex items-center gap-2 rounded-full bg-black/[0.05] dark:bg-white/[0.08] px-3.5 py-2">
                <span class="text-sm text-muted">Visto el</span>
                <input type="date" value={stored?.watchedAt ?? ''} oninput={onWatched} disabled={!stored} max={todayDate()} class="bg-transparent border-none outline-none text-content disabled:opacity-50 [color-scheme:light] dark:[color-scheme:dark]" />
              </label>
              {#if !stored?.watchedAt}
                <button class="btn-glass !min-h-[38px] !px-4 text-sm" onclick={markWatchedToday}>Hoy</button>
              {/if}
            </div>
          </div>
        </section>

        <!-- Sinopsis -->
        {#if view?.overview || loading}
          <section class="mt-6">
            <h2 class="text-[11px] font-medium uppercase tracking-wide text-muted mb-3">Sinopsis</h2>
            {#if loading && !view?.overview}
              <div class="flex flex-col gap-2">
                <span class="skeleton h-3.5 rounded-md"></span>
                <span class="skeleton h-3.5 rounded-md"></span>
                <span class="skeleton h-3.5 w-1/2 rounded-md"></span>
              </div>
            {:else}
              <p class="text-[15px] leading-relaxed text-muted selectable">{view?.overview || 'Sin descripción disponible.'}</p>
            {/if}
          </section>
        {/if}

        <!-- Dónde verlo -->
        {#if providers && (providers.flatrate.length || providers.rent.length || providers.buy.length)}
          <section class="mt-6">
            <h2 class="text-[11px] font-medium uppercase tracking-wide text-muted mb-3">Dónde verlo</h2>
            {#if providers.flatrate.length}
              <p class="text-[13px] text-muted mb-2">Suscripción</p>
              <div class="flex flex-wrap gap-2.5 mb-2">
                {#each providers.flatrate as p (p.providerId)}
                  <div class="h-12 w-12 rounded-xl overflow-hidden bg-black/5 dark:bg-white/10 grid place-items-center text-[10px] text-center p-1 shadow-poster" title={p.providerName}>
                    {#if p.logoPath}<img src={img(p.logoPath, ImageSize.logo)} alt={p.providerName} class="h-full w-full object-cover" />{:else}<span>{p.providerName}</span>{/if}
                  </div>
                {/each}
              </div>
            {/if}
            {#if providers.rent.length}
              <p class="text-[13px] text-muted mb-2 mt-2">Alquiler</p>
              <div class="flex flex-wrap gap-2.5">
                {#each providers.rent as p (p.providerId)}
                  <div class="h-12 w-12 rounded-xl overflow-hidden bg-black/5 dark:bg-white/10 grid place-items-center text-[10px] text-center p-1 shadow-poster" title={p.providerName}>
                    {#if p.logoPath}<img src={img(p.logoPath, ImageSize.logo)} alt={p.providerName} class="h-full w-full object-cover" />{:else}<span>{p.providerName}</span>{/if}
                  </div>
                {/each}
              </div>
            {/if}
            {#if providers.link}
              <a class="inline-flex items-center gap-1.5 mt-3.5 text-accent text-[15px] font-medium selectable" href={providers.link} target="_blank" rel="noopener">
                Ver opciones en JustWatch / TMDB <Icon name="arrow-right" size={15} />
              </a>
            {/if}
          </section>
        {/if}

        <!-- Reparto -->
        {#if detail?.cast?.length}
          <section class="mt-6">
            <h2 class="text-[11px] font-medium uppercase tracking-wide text-muted mb-3">Reparto principal</h2>
            <Carousel arrowTop="top-[39px]" class="">
              {#each detail.cast as c (c.id)}
                <div class="w-[78px]">
                  <div class="h-[78px] w-[78px] rounded-full overflow-hidden bg-black/5 dark:bg-white/10 shadow-poster">
                    {#if c.profilePath}
                      <img src={img(c.profilePath, ImageSize.profile)} alt={c.name} loading="lazy" class="h-full w-full object-cover" />
                    {:else}
                      <div class="grid h-full w-full place-items-center text-2xl font-bold text-muted">{c.name.slice(0, 1)}</div>
                    {/if}
                  </div>
                  <p class="mt-2 text-[13px] font-medium leading-tight">{c.name}</p>
                  {#if c.character}<p class="text-xs text-muted leading-tight mt-0.5">{c.character}</p>{/if}
                </div>
              {/each}
            </Carousel>
          </section>
        {/if}

        {#if loading && !detail}
          <div class="text-center py-6 text-sm text-muted">Cargando detalles…</div>
        {/if}
      </div>
    </div>
  </div>
{/if}
