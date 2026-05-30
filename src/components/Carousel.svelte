<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';

  interface Props {
    title?: string;
    subtitle?: string;
    onSeeAll?: () => void;
    /** Posición vertical de las flechas (clase Tailwind top-*). Por defecto centradas sobre un póster. */
    arrowTop?: string;
    /** Clases del contenedor <section>. Permite anular el margen al anidar el carrusel. */
    class?: string;
    children: Snippet;
  }
  let { title, subtitle, onSeeAll, arrowTop = 'top-[6rem]', class: className = 'my-7 animate-fade-up', children }: Props = $props();

  let track = $state<HTMLDivElement>();
  let canLeft = $state(false);
  let canRight = $state(false);

  function update() {
    const el = track;
    if (!el) return;
    canLeft = el.scrollLeft > 4;
    canRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
  }
  function scroll(dir: 1 | -1) {
    track?.scrollBy({ left: dir * (track.clientWidth * 0.85), behavior: 'smooth' });
  }

  // Recalcula al montar y cuando cambie el contenido/tamaño.
  $effect(() => {
    update();
  });
</script>

<svelte:window onresize={update} />

<section class={className}>
  {#if title}
    <header class="flex items-baseline justify-between gap-3 mb-3">
      <div class="flex items-baseline gap-2 min-w-0">
        <h2 class="text-2xl font-semibold tracking-tight truncate">{title}</h2>
        {#if subtitle}<span class="text-xs text-muted shrink-0">{subtitle}</span>{/if}
      </div>
      {#if onSeeAll}
        <button class="shrink-0 text-[15px] font-medium text-accent active:opacity-60" onclick={onSeeAll}>
          Ver todo
        </button>
      {/if}
    </header>
  {/if}

  <div class="relative group">
    <div
      bind:this={track}
      onscroll={update}
      class="h-scroll gap-3.5 pb-1"
    >
      {@render children()}
    </div>

    <!-- Flechas de scroll (solo PC, aparecen al pasar el ratón) -->
    {#if canLeft}
      <button
        class="hidden sm:grid place-items-center absolute left-0 {arrowTop} -translate-y-1/2 z-10 h-10 w-10 rounded-full
               bg-white/80 dark:bg-neutral-800/80 backdrop-blur-xl border border-black/10 dark:border-white/15 shadow-glass
               text-content opacity-0 group-hover:opacity-100 transition-all duration-200 ease-apple hover:scale-105 active:scale-95"
        onclick={() => scroll(-1)}
        aria-label="Desplazar a la izquierda"
      >
        <Icon name="chevron-left" size={22} />
      </button>
    {/if}
    {#if canRight}
      <button
        class="hidden sm:grid place-items-center absolute right-0 {arrowTop} -translate-y-1/2 z-10 h-10 w-10 rounded-full
               bg-white/80 dark:bg-neutral-800/80 backdrop-blur-xl border border-black/10 dark:border-white/15 shadow-glass
               text-content opacity-0 group-hover:opacity-100 transition-all duration-200 ease-apple hover:scale-105 active:scale-95"
        onclick={() => scroll(1)}
        aria-label="Desplazar a la derecha"
      >
        <Icon name="chevron-right" size={22} />
      </button>
    {/if}
  </div>
</section>
