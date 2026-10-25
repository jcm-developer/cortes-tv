<script lang="ts">
  /** Renders the "Para ti" row on Home: personal recommendations, or a hint when nothing is watched yet. */
  import { untrack } from 'svelte';
  import Carousel from './Carousel.svelte';
  import PosterCard from './PosterCard.svelte';
  import Icon from './Icon.svelte';
  import { appData, watchedTitles } from '../lib/store';
  import { recommend, type Recommendation } from '../lib/recommend';
  import { openLibrary } from '../lib/ui';

  let items = $state<Recommendation[]>([]);
  let loading = $state(false);

  // Recompute when the watched titles or their ratings change; the module caches by signature.
  const watchedSig = $derived($watchedTitles.map((t) => `${t.key}=${t.rating}`).join(','));

  $effect(() => {
    void watchedSig;
    // Read the rest without tracking it: pending changes are filtered in `visible`, and
    // tracking `items` would rerun this effect on its own result.
    const titles = untrack(() => Object.values($appData.titles));
    if (!titles.some((t) => t.status === 'watched')) {
      items = [];
      return;
    }
    const controller = new AbortController();
    loading = untrack(() => items.length === 0);
    recommend(titles, controller.signal)
      .then((r) => (items = r))
      .catch(() => {})
      .finally(() => (loading = false));
    return () => controller.abort();
  });

  // Titles saved after the computation leave the row at once.
  const visible = $derived(items.filter((r) => !$appData.titles[`${r.item.mediaType}:${r.item.id}`]));
</script>

{#if $watchedTitles.length === 0}
  <section class="my-7 animate-fade-up">
    <div class="glass !rounded-3xl p-5 flex items-start gap-4">
      <span class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
        <Icon name="sparkles" size={22} />
      </span>
      <div>
        <p class="text-lg font-semibold tracking-tight">Recomendaciones para ti</p>
        <p class="mt-1 text-[15px] text-muted leading-relaxed">
          Marca como vistas las películas y series que ya conoces y valóralas con estrellas: aquí
          aparecerán títulos elegidos según tus gustos.
        </p>
        <button class="mt-3 text-[15px] font-semibold text-accent active:opacity-60" onclick={() => openLibrary('watched')}>
          Ir a Vistas
        </button>
      </div>
    </div>
  </section>
{:else if loading}
  <Carousel title="Para ti">
    {#each Array(6) as _, i (i)}
      <div style="width:132px"><div class="skeleton aspect-[2/3] rounded-2xl"></div></div>
    {/each}
  </Carousel>
{:else if visible.length > 0}
  <Carousel title="Para ti" subtitle="según lo que has visto">
    {#each visible as r (r.item.mediaType + r.item.id)}
      <PosterCard item={r.item} caption={r.reason} />
    {/each}
  </Carousel>
{/if}
