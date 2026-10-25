<script lang="ts">
  import { img, ImageSize } from '../lib/tmdb';
  import type { MediaSummary } from '../lib/types';
  import { appData, summaryKey } from '../lib/store';
  import { openDetail, openTitleSheet } from '../lib/ui';
  import { mediaTypeLabel } from '../lib/format';
  import Icon from './Icon.svelte';

  /**
   * Renders a title poster with its name and year, the user's rating and a corner button that
   * opens the title sheet. Content layer: no glass.
   *
   * @param item - The title.
   * @param fill - Whether the card fills its grid cell instead of the fixed row width.
   * @param caption - A small line under the year, such as why it is recommended.
   */
  interface Props {
    item: MediaSummary;
    fill?: boolean;
    caption?: string;
  }
  let { item, fill = false, caption }: Props = $props();

  const poster = $derived(img(item.posterPath, ImageSize.poster));
  const stored = $derived($appData.titles[summaryKey(item)]);
  let loaded = $state(false);

  const actionLabel = $derived(
    stored?.status === 'watched' ? 'Vista: cambiar' : stored ? 'Pendiente: cambiar' : 'Añadir a tu biblioteca',
  );
</script>

<div class="flex flex-col {fill ? 'w-full' : 'w-[8.25rem] sm:w-[9.5rem]'}">
  <div class="relative">
    <button
      type="button"
      class="relative block w-full aspect-[2/3] overflow-hidden rounded-xl bg-fill shadow-poster
             transition-transform duration-300 ease-apple hover:scale-[1.03]"
      onclick={() => openDetail({ mediaType: item.mediaType, id: item.id, preview: item })}
      aria-label={`Abrir ${item.title}`}
    >
      {#if poster}
        <img
          src={poster}
          alt=""
          loading="lazy"
          decoding="async"
          class="h-full w-full object-cover transition-opacity duration-300 {loaded ? 'opacity-100' : 'opacity-0'}"
          onload={() => (loaded = true)}
        />
        {#if !loaded}<div class="skeleton absolute inset-0"></div>{/if}
      {:else}
        <div class="grid h-full w-full place-items-center text-muted">
          <Icon name={item.mediaType === 'tv' ? 'tv' : 'film'} size={28} />
        </div>
      {/if}
      {#if stored?.rating}
        <span class="absolute left-1.5 bottom-1.5 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold text-white bg-black/60">
          <Icon name="star-fill" size={11} />{stored.rating}
        </span>
      {/if}
    </button>

    <!-- Solid fills, not glass: posters are content and a row would stack dozens of blurs. -->
    <button
      type="button"
      class="absolute top-1.5 right-1.5 grid h-8 w-8 place-items-center rounded-full text-white
             transition-transform duration-200 ease-apple active:scale-110
             {stored?.status === 'watched' ? 'bg-success' : stored ? 'bg-accent' : 'bg-black/55'}"
      onclick={() => openTitleSheet(item)}
      aria-label={actionLabel}
    >
      <Icon name={stored?.status === 'watched' ? 'check' : stored ? 'bookmark-fill' : 'plus'} size={stored ? 16 : 19} />
    </button>
  </div>

  <div class="pt-2">
    <p class="text-[13px] font-medium leading-tight line-clamp-2">{item.title}</p>
    <p class="mt-0.5 text-xs text-muted">{[item.year, mediaTypeLabel(item.mediaType)].filter(Boolean).join(' · ')}</p>
    {#if caption}<p class="mt-0.5 text-[11px] text-muted leading-tight line-clamp-2">{caption}</p>{/if}
  </div>
</div>
