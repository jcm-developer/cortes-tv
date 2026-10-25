<script lang="ts">
  /** Renders the floating glass top bar: the "Cortes TV" name, the tabs on desktop, the theme toggle and the settings button. */
  import Icon from './Icon.svelte';
  import { activeTab, darkActive, selectTab, settingsOpen, toggleTheme, type Tab } from '../lib/ui';

  const tabs: { id: Tab; label: string }[] = [
    { id: 'home', label: 'Inicio' },
    { id: 'search', label: 'Buscar' },
    { id: 'library', label: 'Biblioteca' },
  ];
  const index = $derived(Math.max(0, tabs.findIndex((t) => t.id === $activeTab)));

  // Clear at the top of the page; glass as soon as content scrolls under the bar.
  let scrolled = $state(false);
  function onScroll() {
    scrolled = window.scrollY > 4;
  }
  $effect(onScroll);
</script>

<svelte:window onscroll={onScroll} />

<header
  class="glass-topbar fixed left-1/2 -translate-x-1/2 top-[var(--topbar-top)] z-50 w-[var(--chrome-w)]"
  class:is-clear={!scrolled}
>
  <!-- The name as text; the "Ctv" mark (Logo.svelte) is for the app icon, login and splash -->
  <button
    type="button"
    class="flex items-center min-h-11 pr-2 text-[1.1875rem] md:text-xl font-bold tracking-tight whitespace-nowrap active:opacity-60"
    onclick={() => selectTab('home')}
    aria-label="Cortes TV, inicio"
  >
    Cortes TV
  </button>

  <nav class="glass-topbar__links hidden md:grid ml-3" aria-label="Secciones">
    <span class="glass-indicator" style="--count: {tabs.length}; --index: {index}" aria-hidden="true"></span>
    {#each tabs as t (t.id)}
      <button
        type="button"
        class="glass-topbar__link"
        aria-current={$activeTab === t.id ? 'page' : undefined}
        onclick={() => selectTab(t.id)}
      >
        {t.label}
      </button>
    {/each}
  </nav>

  <div class="ml-auto flex items-center gap-1.5">
    <button
      type="button"
      class="glass-btn glass-btn--plain glass-btn--sm glass-btn--icon"
      onclick={toggleTheme}
      aria-label={$darkActive ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
    >
      <Icon name={$darkActive ? 'sun' : 'moon'} size={19} />
    </button>
    <button
      type="button"
      class="glass-btn glass-btn--plain glass-btn--sm glass-btn--icon"
      onclick={() => settingsOpen.set(true)}
      aria-label="Ajustes"
    >
      <Icon name="gear" size={19} />
    </button>
  </div>
</header>
