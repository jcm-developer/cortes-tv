<script lang="ts">
  /** Renders the full-screen detail of `detailTarget`: status, rating, watched date, synopsis, cast and similar titles. */
  import Icon from './Icon.svelte';
  import Carousel from './Carousel.svelte';
  import PosterCard from './PosterCard.svelte';
  import StarRating from './StarRating.svelte';
  import { getDetail, recommendationsFor, img, ImageSize, TmdbError } from '../lib/tmdb';
  import type { MediaDetail, MediaSummary, TitleStatus, WatchProvider } from '../lib/types';
  import { detailTarget, closeDetail, showToast } from '../lib/ui';
  import { appData, setStatus, setRating, setWatchedAt, removeTitle, restoreTitle } from '../lib/store';
  import { formatRuntime, formatVote, mediaTypeLabel, todayDate } from '../lib/format';

  const target = $derived($detailTarget);

  let detail = $state<MediaDetail | null>(null);
  let similar = $state<MediaSummary[]>([]);
  let loading = $state(false);
  let error = $state<string | null>(null);
  let scroller = $state<HTMLDivElement>();

  $effect(() => {
    const t = target;
    if (!t) return;
    detail = null;
    similar = [];
    error = null;
    loading = true;
    scroller?.scrollTo({ top: 0 });
    const controller = new AbortController();
    getDetail(t.mediaType, t.id, controller.signal)
      .then((d) => (detail = d))
      .catch((e) => {
        if ((e as Error)?.name === 'AbortError') return;
        error = e instanceof TmdbError ? e.message : 'No se pudo cargar el detalle.';
      })
      .finally(() => (loading = false));
    recommendationsFor(t.mediaType, t.id, controller.signal)
      .then((r) => (similar = r.slice(0, 15)))
      .catch(() => {});
    return () => controller.abort();
  });

  const view = $derived(detail ?? target?.preview ?? null);
  const key = $derived(target ? `${target.mediaType}:${target.id}` : '');
  const stored = $derived(key ? $appData.titles[key] : undefined);

  const backdrop = $derived(
    img(view?.backdropPath, ImageSize.backdropLarge) ?? img(view?.posterPath, ImageSize.posterLarge),
  );
  const poster = $derived(img(view?.posterPath, ImageSize.poster));
  const providers = $derived(detail?.providers ?? null);
  const providerGroups = $derived<{ label: string; items: WatchProvider[] }[]>(
    providers
      ? [
          { label: 'Suscripción', items: providers.flatrate },
          { label: 'Alquiler', items: providers.rent },
          { label: 'Compra', items: providers.buy },
        ].filter((g) => g.items.length > 0)
      : [],
  );

  function summaryOf(): MediaSummary | null {
    if (!view) return null;
    return {
      id: view.id, mediaType: view.mediaType, title: view.title,
      posterPath: view.posterPath, backdropPath: view.backdropPath,
      year: view.year, voteAverage: view.voteAverage, genreIds: view.genreIds,
    };
  }
  function choose(status: TitleStatus) {
    const s = summaryOf();
    if (!s || stored?.status === status) return;
    setStatus(s, status);
    showToast(status === 'pending' ? 'Añadido a Pendientes' : 'Marcado como visto');
  }
  function onRemove() {
    if (!stored) return;
    const snapshot = stored;
    removeTitle(key);
    showToast('Quitado de tu biblioteca', { label: 'Deshacer', run: () => restoreTitle(snapshot) });
  }
  function onWatched(e: Event) {
    setWatchedAt(key, (e.target as HTMLInputElement).value || null);
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
    </div>

    <div bind:this={scroller} class="h-full overflow-y-auto no-scrollbar overscroll-contain pb-[calc(env(safe-area-inset-bottom,0px)+4rem)]">
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
            <h1 class="text-3xl sm:text-4xl font-bold tracking-tight selectable [text-shadow:0_2px_20px_rgba(0,0,0,0.55)]">{view?.title ?? '\u2014'}</h1>
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
        <div class="grid grid-cols-2 gap-2.5">
          <button
            class="inline-flex items-center justify-center gap-2 min-h-12 rounded-xl font-semibold transition-all duration-150 ease-apple active:scale-[0.97]
                   {stored?.status === 'pending' ? 'bg-accent text-white shadow-[0_4px_14px_hsl(var(--accent)/0.35)]' : 'bg-black/[0.05] dark:bg-white/[0.08] text-content'}"
            aria-pressed={stored?.status === 'pending'}
            onclick={() => choose('pending')}
          >
            <Icon name={stored?.status === 'pending' ? 'bookmark-fill' : 'bookmark'} size={20} />Pendiente
          </button>
          <button
            class="inline-flex items-center justify-center gap-2 min-h-12 rounded-xl font-semibold transition-all duration-150 ease-apple active:scale-[0.97]
                   {stored?.status === 'watched' ? 'bg-green-600 text-white shadow-[0_4px_14px_rgba(22,163,74,0.35)]' : 'bg-black/[0.05] dark:bg-white/[0.08] text-content'}"
            aria-pressed={stored?.status === 'watched'}
            onclick={() => choose('watched')}
          >
            <Icon name={stored?.status === 'watched' ? 'check-circle-fill' : 'check-circle'} size={20} />Vista
          </button>
        </div>

        {#if stored?.status === 'watched'}
          <section class="mt-5 animate-fade-in">
            <h2 class="text-[11px] font-medium uppercase tracking-wide text-muted mb-2">Tu valoración</h2>
            <div class="flex flex-col gap-3">
              <StarRating value={stored.rating} onChange={(v) => setRating(key, v)} showLabel />
              <label class="inline-flex items-center gap-2 self-start rounded-full bg-black/[0.05] dark:bg-white/[0.08] px-3.5 py-2">
                <span class="text-sm text-muted">Vista el</span>
                <input type="date" value={stored.watchedAt ?? ''} oninput={onWatched} max={todayDate()} class="bg-transparent border-none outline-none text-content [color-scheme:light] dark:[color-scheme:dark]" />
              </label>
            </div>
          </section>
        {/if}

        {#if stored}
          <button class="mt-3 text-sm font-medium text-red-500 active:opacity-60" onclick={onRemove}>Quitar de la biblioteca</button>
        {/if}

        {#if error}<p class="text-red-500 text-[15px] mt-4">{error}</p>{/if}

        {#if detail?.tagline}
          <p class="mt-6 text-lg font-medium italic tracking-tight selectable">{detail.tagline}</p>
        {/if}

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

        <!-- Where to watch -->
        {#if providerGroups.length > 0}
          <section class="mt-6">
            <h2 class="text-[11px] font-medium uppercase tracking-wide text-muted mb-1">Dónde verlo</h2>
            {#each providerGroups as g (g.label)}
              <p class="text-[13px] text-muted mb-2 mt-2">{g.label}</p>
              <div class="flex flex-wrap gap-2.5">
                {#each g.items as p (p.providerId)}
                  <div class="h-12 w-12 rounded-xl overflow-hidden bg-black/5 dark:bg-white/10 grid place-items-center text-[10px] text-center p-1 shadow-poster" title={p.providerName}>
                    {#if p.logoPath}<img src={img(p.logoPath, ImageSize.logo)} alt={p.providerName} class="h-full w-full object-cover" />{:else}<span>{p.providerName}</span>{/if}
                  </div>
                {/each}
              </div>
            {/each}
            {#if providers?.link}
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

        {#if similar.length > 0}
          <Carousel title="Si te gusta esto" class="mt-8 animate-fade-up">
            {#each similar as item (item.mediaType + item.id)}
              <PosterCard {item} width={112} />
            {/each}
          </Carousel>
        {/if}

        {#if loading && !detail}
          <div class="text-center py-6 text-sm text-muted">Cargando detalles…</div>
        {/if}
      </div>
    </div>
  </div>
{/if}
