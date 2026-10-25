<script lang="ts">
  import Icon from './Icon.svelte';
  /**
   * Renders five stars for a 1 to 5 rating; pressing the current value clears it.
   *
   * @param value - The rating, or null when unrated.
   * @param onChange - Called with the new rating, or null when cleared.
   * @param size - The star size, in pixels.
   */
  interface Props {
    value: number | null;
    onChange: (v: number | null) => void;
    size?: number;
  }
  let { value, onChange, size = 30 }: Props = $props();

  function set(n: number) {
    onChange(value === n ? null : n);
  }
</script>

<div class="inline-flex gap-1" role="group" aria-label="Tu valoración">
  {#each [1, 2, 3, 4, 5] as n (n)}
    <button
      class="p-1 transition-transform duration-150 ease-apple active:scale-125
             {value !== null && n <= value ? 'text-yellow-400' : 'text-muted/50'}"
      onclick={() => set(n)}
      aria-label={`${n} de 5`}
      aria-pressed={value === n}
    >
      <Icon name={value !== null && n <= value ? 'star-fill' : 'star'} {size} />
    </button>
  {/each}
</div>
