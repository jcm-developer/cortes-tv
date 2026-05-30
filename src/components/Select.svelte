<script lang="ts" generics="T extends string | number">
  import Icon from './Icon.svelte';

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

  // El menú se posiciona como `fixed` para no quedar recortado por el
  // contenedor de filtros (h-scroll → overflow oculto).
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

  // Reposiciona al abrir y cierra al hacer scroll en cualquier contenedor.
  $effect(() => {
    if (!open) return;
    reposition();
    const close = () => (open = false);
    document.addEventListener('scroll', close, true);
    return () => document.removeEventListener('scroll', close, true);
  });
</script>

<svelte:window onclick={onWindowClick} onkeydown={onKeydown} onresize={reposition} />

<button
  bind:this={btn}
  type="button"
  class="chip cursor-pointer !pr-2.5 shrink-0"
  class:is-active={open}
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
    class="fixed z-[200] max-h-72 overflow-y-auto no-scrollbar
           glass !rounded-2xl p-1.5 origin-top animate-scale-in"
    style="top:{pos.top}px; left:{pos.left}px; min-width:max({pos.minWidth}px, 11rem)"
    role="listbox"
    aria-label={ariaLabel}
  >
    {#each options as o (o.value)}
      <button
        type="button"
        role="option"
        aria-selected={o.value === value}
        class="flex w-full items-center justify-between gap-4 rounded-xl px-3 py-2 text-left text-[15px] font-medium transition-colors
               {o.value === value
                 ? 'text-accent bg-accent/10'
                 : 'text-content hover:bg-black/[0.05] dark:hover:bg-white/[0.07]'}"
        onclick={() => choose(o.value)}
      >
        <span class="whitespace-nowrap">{o.label}</span>
        {#if o.value === value}<Icon name="check" size={16} />{/if}
      </button>
    {/each}
  </div>
{/if}
