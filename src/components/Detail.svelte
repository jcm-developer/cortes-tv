<script lang="ts">
  /** Renders the full-screen detail of `detailTarget`, always in the dark scheme: status, rating, synopsis, providers, cast and similar titles. */
  import Icon from './Icon.svelte';
  import Carousel from './Carousel.svelte';
  import PosterCard from './PosterCard.svelte';
  import StarRating from './StarRating.svelte';
  import { getDetail, recommendationsFor, img, ImageSize, TmdbError } from '../lib/tmdb';
  import type { MediaDetail, MediaSummary, TitleStatus, WatchProvider } from '../lib/types';
  import { detailTarget, closeDetail, showToast } from '../lib/ui';
  import { appData, setStatus, setRating, removeTitle, restoreTitle } from '../lib/store';
  import { formatRuntime, formatVote, mediaTypeLabel } from '../lib/format';

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
  // Phones show the portrait poster as the hero; wider screens the landscape backdrop.
  const heroPortrait = $derived(img(view?.posterPath, ImageSize.posterLarge) ?? backdrop);
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

  function metaLine(): string {
    const parts: string[] = [];
    if (view?.year) parts.push(view.year);
    if (view) parts.push(mediaTypeLabel(view.mediaType));
    if (detail?.runtime) { const r = formatRuntime(detail.runtime); if (r) parts.push(r); }
    if (detail?.seasons) parts.push(`${detail.seasons} ${detail.seasons === 1 ? 'temporada' : 'temporadas'}`);
    return parts.join(' · ');
  }
</script>

{#if target}
  <div class="dark fixed inset-0 z-[120] bg-bg text-content animate-fade-in" role="dialog" aria-modal="true" aria-label={view?.title ?? 'Detalle'}>
    <button
      type="button"
      class="glass-btn glass-btn--icon fixed top-[calc(var(--safe-top)+0.75rem)] left-4 z-20"
      onclick={closeDetail}
      aria-label="Volver"
    >
      <Icon name="chevron-left" size={22} />
    </button>

    <div bind:this={scroller} class="h-full overflow-y-auto overscroll-contain no-scrollbar pb-[calc(var(--safe-bottom)+3rem)]">
      <!-- Hero -->
      <div class="relative flex items-end h-[78svh] sm:h-[70svh] min-h-[26rem] max-h-[46rem]">
        {#if heroPortrait || backdrop}
          <picture>
            {#if backdrop}<source media="(min-width: 640px)" srcset={backdrop} />{/if}
            <img class="absolute inset-0 h-full w-full object-cover object-top" src={heroPortrait ?? backdrop} alt="" decoding="async" />
          </picture>
        {/if}
        <div class="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/50 to-transparent"></div>
        <div class="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black via-black/70 to-transparent"></div>

        <div class="page-x relative mx-auto w-full max-w-4xl">
          <h1 class="text-[2rem] sm:text-5xl font-bold tracking-tight leading-[1.1] selectable">{view?.title ?? ''}</h1>
          <p class="mt-2 text-[15px] font-medium text-muted">
            {#if formatVote(view?.voteAverage ?? null)}
              <span class="inline-flex items-center gap-1 text-content"><Icon name="star-fill" size={13} />{formatVote(view!.voteAverage)}</span> ·
            {/if}
            {metaLine()}
          </p>
          {#if detail?.genres?.length}
            <p class="mt-1 text-[15px] text-muted">{detail.genres.slice(0, 3).map((g) => g.name).join(', ')}</p>
          {/if}

          <div class="mt-5 grid grid-cols-2 gap-2.5 max-w-md">
            <button
              type="button"
              class="glass-btn min-h-12 {stored?.status === 'pending' ? 'glass-btn--prominent' : ''}"
              aria-pressed={stored?.status === 'pending'}
              onclick={() => choose('pending')}
            >
              <Icon name={stored?.status === 'pending' ? 'bookmark-fill' : 'bookmark'} size={20} />Pendiente
            </button>
            <button
              type="button"
              class="glass-btn min-h-12 {stored?.status === 'watched' ? 'glass-btn--success' : ''}"
              aria-pressed={stored?.status === 'watched'}
              onclick={() => choose('watched')}
            >
              <Icon name={stored?.status === 'watched' ? 'check-circle-fill' : 'check-circle'} size={20} />Vista
            </button>
          </div>
        </div>
      </div>

      <div class="page-x mx-auto w-full max-w-4xl">
        {#if stored?.status === 'watched'}
          <section class="mt-6 animate-fade-in">
            <h2 class="section-title mb-2">Tu valoración</h2>
            <StarRating value={stored.rating} onChange={(v) => setRating(key, v)} showLabel />
          </section>
        {/if}

        {#if stored}
          <button type="button" class="mt-4 text-[15px] font-medium text-danger active:opacity-60" onclick={onRemove}>Quitar de la biblioteca</button>
        {/if}

        {#if error}<p class="mt-4 text-[15px] text-danger">{error}</p>{/if}

        {#if detail?.tagline}
          <p class="mt-7 text-lg font-semibold tracking-tight selectable">{detail.tagline}</p>
        {/if}

        {#if view?.overview || loading}
          <section class="mt-4">
            {#if loading && !view?.overview}
              <div class="flex flex-col gap-2">
                <span class="skeleton h-3.5 rounded-md"></span>
                <span class="skeleton h-3.5 rounded-md"></span>
                <span class="skeleton h-3.5 w-1/2 rounded-md"></span>
              </div>
            {:else}
              <p class="text-base leading-relaxed text-muted selectable max-w-prose">{view?.overview || 'Sin descripción disponible.'}</p>
            {/if}
          </section>
        {/if}

        {#if providerGroups.length > 0}
          <section class="mt-8">
            <h2 class="section-title">Dónde verlo</h2>
            {#each providerGroups as g (g.label)}
              <p class="mt-3 mb-2 text-[13px] font-medium text-muted">{g.label}</p>
              <div class="flex flex-wrap gap-2.5">
                {#each g.items as p (p.providerId)}
                  <div class="h-12 w-12 rounded-xl overflow-hidden bg-fill grid place-items-center text-[10px] text-center p-1" title={p.providerName}>
                    {#if p.logoPath}<img src={img(p.logoPath, ImageSize.logo)} alt={p.providerName} class="h-full w-full object-cover" />{:else}<span>{p.providerName}</span>{/if}
                  </div>
                {/each}
              </div>
            {/each}
            {#if providers?.link}
              <a class="inline-flex items-center gap-1.5 mt-4 text-accent text-[15px] font-medium" href={providers.link} target="_blank" rel="noopener">
                Ver opciones en JustWatch / TMDB <Icon name="arrow-right" size={15} />
              </a>
            {/if}
          </section>
        {/if}

        {#if detail?.cast?.length}
          <section class="mt-8">
            <h2 class="section-title mb-3">Reparto</h2>
            <Carousel class="">
              {#each detail.cast as c (c.id)}
                <div class="w-[5.5rem]">
                  <div class="h-[5.5rem] w-[5.5rem] rounded-full overflow-hidden bg-fill">
                    {#if c.profilePath}
                      <img src={img(c.profilePath, ImageSize.profile)} alt="" loading="lazy" class="h-full w-full object-cover" />
                    {:else}
                      <div class="grid h-full w-full place-items-center text-2xl font-bold text-muted">{c.name.slice(0, 1)}</div>
                    {/if}
                  </div>
                  <p class="mt-2 text-[13px] font-medium leading-tight text-center">{c.name}</p>
                  {#if c.character}<p class="mt-0.5 text-xs text-muted leading-tight text-center line-clamp-2">{c.character}</p>{/if}
                </div>
              {/each}
            </Carousel>
          </section>
        {/if}

        {#if similar.length > 0}
          <Carousel title="Si te gusta esto" class="mt-8 animate-fade-up">
            {#each similar as item (item.mediaType + item.id)}
              <PosterCard {item} />
            {/each}
          </Carousel>
        {/if}
      </div>
    </div>
  </div>
{/if}
