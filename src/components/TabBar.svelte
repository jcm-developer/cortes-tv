<script lang="ts">
  /** Renders the floating glass tab bar (Inicio, Buscar, Biblioteca), the same on every screen size. */
  import Icon from './Icon.svelte';
  import { activeTab, type Tab } from '../lib/ui';

  type IconName = 'home' | 'home-fill' | 'search' | 'search-bold' | 'library' | 'library-fill';
  const tabs: { id: Tab; label: string; icon: IconName; iconActive: IconName }[] = [
    { id: 'home', label: 'Inicio', icon: 'home', iconActive: 'home-fill' },
    { id: 'search', label: 'Buscar', icon: 'search', iconActive: 'search-bold' },
    { id: 'library', label: 'Biblioteca', icon: 'library', iconActive: 'library-fill' },
  ];
  const index = $derived(Math.max(0, tabs.findIndex((t) => t.id === $activeTab)));

  function go(tab: Tab) {
    if ($activeTab === tab) {
      // Pressing the current tab again scrolls back to the top, as on iOS.
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    activeTab.set(tab);
    window.scrollTo({ top: 0 });
  }
</script>

<nav
  class="glass-tabs fixed left-1/2 -translate-x-1/2 bottom-[var(--tabbar-bottom)] z-50"
  aria-label="Secciones"
>
  <span class="glass-indicator" style="--count: {tabs.length}; --index: {index}" aria-hidden="true"></span>
  {#each tabs as t (t.id)}
    <button
      type="button"
      class="glass-tabs__tab"
      aria-current={$activeTab === t.id ? 'page' : undefined}
      onclick={() => go(t.id)}
    >
      <Icon name={$activeTab === t.id ? t.iconActive : t.icon} size={24} />
      {t.label}
    </button>
  {/each}
</nav>
