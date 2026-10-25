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
    <div class="flex items-center gap-3.5 mb-5">
      <div class="w-14 shrink-0 aspect-[2/3] rounded-lg overflow-hidden bg-black/5 dark:bg-white/10 shadow-poster">
        {#if poster}<img src={poster} alt="" class="h-full w-full object-cover" />{/if}
      </div>
      <div class="min-w-0">
        <h2 class="text-xl font-semibold tracking-tight leading-tight line-clamp-2">{target.title}</h2>
        <p class="mt-0.5 text-sm text-muted">
          {[target.year, mediaTypeLabel(target.mediaType)].filter(Boolean).join(' · ')}
        </p>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-2.5">
      <button
        class="flex flex-col items-center gap-1 rounded-2xl py-3.5 font-semibold transition-all duration-150 ease-apple active:scale-[0.97]
               {stored?.status === 'pending' ? 'bg-accent text-white shadow-[0_4px_14px_hsl(var(--accent)/0.35)]' : 'bg-black/[0.05] dark:bg-white/[0.08] text-content'}"
        aria-pressed={stored?.status === 'pending'}
        onclick={() => choose('pending')}
      >
        <Icon name={stored?.status === 'pending' ? 'bookmark-fill' : 'bookmark'} size={24} />
        Pendiente
      </button>
      <button
        class="flex flex-col items-center gap-1 rounded-2xl py-3.5 font-semibold transition-all duration-150 ease-apple active:scale-[0.97]
               {stored?.status === 'watched' ? 'bg-green-600 text-white shadow-[0_4px_14px_rgba(22,163,74,0.35)]' : 'bg-black/[0.05] dark:bg-white/[0.08] text-content'}"
        aria-pressed={stored?.status === 'watched'}
        onclick={() => choose('watched')}
      >
        <Icon name={stored?.status === 'watched' ? 'check-circle-fill' : 'check-circle'} size={24} />
        Vista
      </button>
    </div>

    {#if stored?.status === 'watched'}
      <div class="mt-5 animate-fade-in">
        <p class="text-[11px] font-medium uppercase tracking-wide text-muted mb-1.5">Tu valoración</p>
        <StarRating value={stored.rating} onChange={(v) => setRating(key, v)} size={34} showLabel />
      </div>
    {/if}

    <div class="mt-6 flex flex-col gap-2.5">
      {#if stored?.status === 'watched'}
        <button class="btn-primary w-full" onclick={closeTitleSheet}>Listo</button>
      {/if}
      {#if stored}
        <button class="btn-danger w-full" onclick={onRemove}>
          <Icon name="trash" size={18} /> Quitar de la biblioteca
        </button>
      {/if}
    </div>
  {/if}
</Sheet>
