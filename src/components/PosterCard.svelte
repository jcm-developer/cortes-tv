<script lang="ts">
  import { img, ImageSize } from '../lib/tmdb';
  import type { MediaSummary } from '../lib/types';
  import { appData, summaryKey } from '../lib/store';
  import { openDetail, openTitleSheet } from '../lib/ui';
  import Icon from './Icon.svelte';

  /**
   * Renders a title poster with its name and year, its library status and a corner button that
   * opens the title sheet.
   *
   * @param item - The title.
   * @param width - The card width in pixels; 0 fills the grid cell.
   * @param showAction - Whether the corner button is shown.
   * @param caption - A small line under the year, such as why it is recommended.
   */
  interface Props {
    item: MediaSummary;
    width?: number;
    showAction?: boolean;
    caption?: string;
  }
  let { item, width = 132, showAction = true, caption }: Props = $props();

  const poster = $derived(img(item.posterPath, ImageSize.poster));
  const cssWidth = $derived(width ? `${width}px` : '100%');
  const stored = $derived($appData.titles[summaryKey(item)]);
  let loaded = $state(false);

  const actionLabel = $derived(
    stored?.status === 'watched' ? 'Vista: cambiar' : stored ? 'Pendiente: cambiar' : 'Añadir a tu biblioteca',
  );
</script>

<div class="group flex flex-col" style={`width:${cssWidth}`}>
  <div class="relative">
    <button
      class="relative block w-full aspect-[2/3] overflow-hidden rounded-2xl bg-black/5 dark:bg-white/5
             shadow-poster ring-1 ring-black/5 dark:ring-white/10
             transition-transform duration-200 ease-apple hover:scale-[1.03] active:scale-[0.97]
             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      onclick={() => openDetail({ mediaType: item.mediaType, id: item.id, preview: item })}
      aria-label={`Abrir ${item.title}`}
    >
      {#if poster}
        <img
          src={poster}
          alt={item.title}
          loading="lazy"
          decoding="async"
          class="h-full w-full object-cover transition-opacity duration-300 {loaded ? 'opacity-100' : 'opacity-0'}"
          onload={() => (loaded = true)}
        />
        {#if !loaded}<div class="skeleton absolute inset-0"></div>{/if}
      {:else}
        <div class="grid h-full w-full place-items-center text-muted bg-gradient-to-br from-black/5 to-black/10 dark:from-white/5 dark:to-white/10">
          <Icon name={item.mediaType === 'tv' ? 'tv' : 'film'} size={28} />
        </div>
      {/if}

      <span class="absolute left-2 bottom-2 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white bg-black/45 backdrop-blur-md">
        {item.mediaType === 'tv' ? 'Serie' : 'Película'}
      </span>
      {#if stored?.rating}
        <span class="absolute right-2 bottom-2 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold text-yellow-300 bg-black/50 backdrop-blur-md">
          <Icon name="star-fill" size={11} />{stored.rating}
        </span>
      {/if}
    </button>

    {#if showAction}
      <button
        class="absolute top-2 right-2 grid h-8 w-8 place-items-center rounded-full text-white border
               transition-transform duration-150 ease-apple active:scale-90
               {stored?.status === 'watched'
                 ? 'bg-green-600 border-green-500/40'
                 : stored
                   ? 'bg-accent border-accent/40'
                   : 'bg-black/45 backdrop-blur-md border-white/15 hover:bg-accent'}"
        onclick={() => openTitleSheet(item)}
        aria-label={actionLabel}
      >
        <Icon name={stored?.status === 'watched' ? 'check' : stored ? 'bookmark-fill' : 'plus'} size={stored ? 16 : 19} />
      </button>
    {/if}
  </div>

  <div class="pt-2 px-0.5">
    <p class="text-[13px] font-medium leading-tight line-clamp-2">{item.title}</p>
    {#if item.year}<p class="mt-0.5 text-xs text-muted">{item.year}</p>{/if}
    {#if caption}<p class="mt-0.5 text-[11px] text-muted leading-tight line-clamp-2">{caption}</p>{/if}
  </div>
</div>
