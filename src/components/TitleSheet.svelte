<script lang="ts">
  /** Renders the bottom sheet that sets a title's status and rating, or removes it. */
  import Sheet from './Sheet.svelte';
  import Icon from './Icon.svelte';
  import StarRating from './StarRating.svelte';
  import { titleSheetTarget, closeTitleSheet, showToast } from '../lib/ui';
  import {
    appData,
    summaryKey,
    setStatus,
    setRating,
    removeTitle,
    restoreTitle,
  } from '../lib/store';
  import { img, ImageSize } from '../lib/tmdb';
  import { mediaTypeLabel } from '../lib/format';
  import type { TitleStatus } from '../lib/types';

  const target = $derived($titleSheetTarget);
  const key = $derived(target ? summaryKey(target) : '');
  const stored = $derived(key ? $appData.titles[key] : undefined);
  const poster = $derived(img(target?.posterPath, ImageSize.posterSmall));

  function choose(status: TitleStatus) {
    if (!target || stored?.status === status) return;
    setStatus(target, status);
    if (status === 'pending') {
      showToast('Añadido a Pendientes');
      closeTitleSheet();
    }
  }
  function onRemove() {
    if (!stored) return;
    const snapshot = stored;
    removeTitle(key);
    closeTitleSheet();
    showToast('Quitado de tu biblioteca', { label: 'Deshacer', run: () => restoreTitle(snapshot) });
  }
</script>

<Sheet open={!!target} onClose={closeTitleSheet} title={target?.title ?? 'Título'} hideTitle>
  {#if target}
    <div class="flex items-center gap-3.5 mb-5 pr-12">
      <div class="w-14 shrink-0 aspect-[2/3] rounded-lg overflow-hidden bg-fill">
        {#if poster}<img src={poster} alt="" class="h-full w-full object-cover" />{/if}
      </div>
      <div class="min-w-0">
        <h2 class="text-xl font-bold tracking-tight leading-tight line-clamp-2">{target.title}</h2>
        <p class="mt-0.5 text-sm text-muted">
          {[target.year, mediaTypeLabel(target.mediaType)].filter(Boolean).join(' · ')}
        </p>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-2.5">
      <button
        type="button"
        class="glass-btn glass-btn--plain min-h-14 {stored?.status === 'pending' ? 'glass-btn--prominent' : ''}"
        aria-pressed={stored?.status === 'pending'}
        onclick={() => choose('pending')}
      >
        <Icon name={stored?.status === 'pending' ? 'bookmark-fill' : 'bookmark'} size={20} />Pendiente
      </button>
      <button
        type="button"
        class="glass-btn glass-btn--plain min-h-14 {stored?.status === 'watched' ? 'glass-btn--success' : ''}"
        aria-pressed={stored?.status === 'watched'}
        onclick={() => choose('watched')}
      >
        <Icon name={stored?.status === 'watched' ? 'check-circle-fill' : 'check-circle'} size={20} />Vista
      </button>
    </div>

    {#if stored?.status === 'watched'}
      <div class="mt-5 flex flex-col items-center animate-fade-in">
        <StarRating value={stored.rating} onChange={(v) => setRating(key, v)} size={34} showLabel />
      </div>
    {/if}

    {#if stored}
      <div class="mt-5 flex flex-col gap-2.5">
        {#if stored.status === 'watched'}
          <button type="button" class="glass-btn glass-btn--plain glass-btn--prominent w-full" onclick={closeTitleSheet}>Listo</button>
        {/if}
        <button type="button" class="glass-btn glass-btn--plain glass-btn--danger w-full" onclick={onRemove}>
          <Icon name="trash" size={18} /> Quitar de la biblioteca
        </button>
      </div>
    {/if}
  {/if}
</Sheet>
