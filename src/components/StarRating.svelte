<script lang="ts">
  import Icon from './Icon.svelte';
  /**
   * Renders five stars for a 1 to 5 rating; pressing the current value clears it.
   *
   * @param value - The rating, or null when unrated.
   * @param onChange - Called with the new rating, or null when cleared.
   * @param size - The star size, in pixels.
   * @param showLabel - Whether a word for the rating ("Buena", "Obra maestra") follows the stars.
   */
  interface Props {
    value: number | null;
    onChange: (v: number | null) => void;
    size?: number;
    showLabel?: boolean;
  }
  let { value, onChange, size = 30, showLabel = false }: Props = $props();

  const LABELS = ['Mala', 'Regular', 'Buena', 'Muy buena', 'Obra maestra'];

  function set(n: number) {
    onChange(value === n ? null : n);
  }
</script>

<div class="inline-flex items-center gap-3 flex-wrap">
  <div class="inline-flex gap-0.5" role="group" aria-label="Tu valoración">
    {#each [1, 2, 3, 4, 5] as n (n)}
      <button
        class="p-1 rounded-lg transition-transform duration-150 ease-apple active:scale-125
               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50
               {value !== null && n <= value ? 'text-yellow-400' : 'text-muted/50'}"
        onclick={() => set(n)}
        aria-label={`${n} de 5`}
        aria-pressed={value === n}
      >
        <Icon name={value !== null && n <= value ? 'star-fill' : 'star'} {size} />
      </button>
    {/each}
  </div>
  {#if showLabel}
    <span class="text-sm font-medium text-muted">{value ? LABELS[value - 1] : 'Sin valorar'}</span>
  {/if}
</div>
