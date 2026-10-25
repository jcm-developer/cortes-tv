<script lang="ts" generics="T extends string | number">
  import Icon from './Icon.svelte';

  /**
   * Renders a filter chip that opens a glass popover menu, in place of the native select.
   *
   * @param value - The selected value, bindable.
   * @param options - The choices, each with a value and a label.
   * @param ariaLabel - The accessible name of the button.
   */
  interface Props {
    value: T;
    options: { value: T; label: string }[];
    ariaLabel?: string;
  }
  let { value = $bindable(), options, ariaLabel }: Props = $props();

  let open = $state(false);
  let btn = $state<HTMLButtonElement>();
  let menu = $state<HTMLDivElement>();
  let pos = $state({ top: 0, left: 0, minWidth: 0 });

  const selected = $derived(options.find((o) => o.value === value));

  // The menu is `fixed` so the scrolling filter row (overflow hidden) does not clip it.
  function reposition() {
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const w = menu?.offsetWidth ?? 200;
    let left = r.left;
    if (left + w > window.innerWidth - 8) left = window.innerWidth - 8 - w;
    if (left < 8) left = 8;
    pos = { top: r.bottom + 6, left, minWidth: r.width };
  }

  function choose(v: T) {
    value = v;
    open = false;
  }
  function onWindowClick(e: MouseEvent) {
    const t = e.target as Node;
    if (open && !btn?.contains(t) && !menu?.contains(t)) open = false;
  }
  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') open = false;
  }

  // Position on open; a scroll anywhere else closes it.
  $effect(() => {
    if (!open) return;
    reposition();
    // Scrolling the long menu itself must not close it.
    const close = (e: Event) => {
      if (!menu?.contains(e.target as Node)) open = false;
    };
    document.addEventListener('scroll', close, true);
    return () => document.removeEventListener('scroll', close, true);
  });
</script>

<svelte:window onclick={onWindowClick} onkeydown={onKeydown} onresize={reposition} />

<button
  bind:this={btn}
  type="button"
  class="chip !pr-2.5"
  aria-haspopup="listbox"
  aria-expanded={open}
  aria-label={ariaLabel}
  onclick={() => (open = !open)}
>
  <span class="whitespace-nowrap">{selected?.label ?? ''}</span>
  <span class="transition-transform duration-200 ease-apple" class:rotate-180={open}>
    <Icon name="chevron-down" size={15} />
  </span>
</button>

{#if open}
  <div
    bind:this={menu}
    class="glass-popover fixed z-[200] max-h-72 overflow-y-auto no-scrollbar"
    style="top:{pos.top}px; left:{pos.left}px; min-width:max({pos.minWidth}px, 12rem)"
    role="listbox"
    aria-label={ariaLabel}
  >
    {#each options as o (o.value)}
      <button type="button" role="option" aria-selected={o.value === value} class="glass-popover__item" onclick={() => choose(o.value)}>
        <span class="whitespace-nowrap">{o.label}</span>
        {#if o.value === value}<Icon name="check" size={16} />{/if}
      </button>
    {/each}
  </div>
{/if}
