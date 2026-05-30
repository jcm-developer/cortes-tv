<script lang="ts">
  import { img, ImageSize } from '../lib/tmdb';
  import type { MediaSummary } from '../lib/types';
  import Icon from './Icon.svelte';

  interface Props {
    item: MediaSummary;
    /** ancho de la tarjeta en px; 0 = fluido (rellena la celda del grid) */
    width?: number;
    onOpen?: (item: MediaSummary) => void;
    onAdd?: (item: MediaSummary) => void;
    showAdd?: boolean;
    cornerIcon?: 'plus' | 'ellipsis';
    rating?: number | null;
  }
  let {
    item,
    width = 132,
    onOpen,
    onAdd,
    showAdd = true,
    cornerIcon = 'plus',
    rating = null,
  }: Props = $props();

  const poster = $derived(img(item.posterPath, ImageSize.poster));
  const cssWidth = $derived(width ? `${width}px` : '100%');
  let loaded = $state(false);
</script>

<div class="group flex flex-col" style={`width:${cssWidth}`}>
  <div class="relative">
    <button
      class="relative block w-full aspect-[2/3] overflow-hidden rounded-2xl bg-black/5 dark:bg-white/5
             shadow-poster ring-1 ring-black/5 dark:ring-white/10
             transition-transform duration-200 ease-apple hover:scale-[1.03] active:scale-[0.97]"
      onclick={() => onOpen?.(item)}
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
      {#if rating}
        <span class="absolute right-2 bottom-2 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold text-yellow-300 bg-black/50 backdrop-blur-md">
          <Icon name="star-fill" size={11} />{rating}
        </span>
      {/if}
    </button>

    {#if showAdd}
      <button
        class="absolute top-2 right-2 grid h-8 w-8 place-items-center rounded-full text-white
               bg-black/45 backdrop-blur-md border border-white/15
               transition-transform duration-150 ease-apple active:scale-90 hover:bg-accent"
        onclick={() => onAdd?.(item)}
        aria-label={cornerIcon === 'plus' ? 'Añadir a una lista' : 'Opciones'}
      >
        <Icon name={cornerIcon} size={19} />
      </button>
    {/if}
  </div>

  <div class="pt-2 px-0.5">
    <p class="text-[13px] font-medium leading-tight line-clamp-2">{item.title}</p>
    {#if item.year}<p class="mt-0.5 text-xs text-muted">{item.year}</p>{/if}
  </div>
</div>
