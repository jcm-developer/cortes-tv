<script lang="ts">
  /**
   * Renders the navigation: a top bar (tab links, theme and settings on desktop; brand and
   * settings on mobile) and, on mobile, a bottom glass tab bar.
   */
  import Icon from './Icon.svelte';
  import Logo from './Logo.svelte';
  import { activeTab, settingsOpen, theme, toggleTheme, type Tab } from '../lib/ui';

  type IconName = 'home' | 'home-fill' | 'search' | 'search-bold' | 'library' | 'library-fill';
  const links: { id: Tab; label: string; icon: IconName; iconActive: IconName }[] = [
    { id: 'home', label: 'Inicio', icon: 'home', iconActive: 'home-fill' },
    { id: 'search', label: 'Buscar', icon: 'search', iconActive: 'search-bold' },
    { id: 'library', label: 'Biblioteca', icon: 'library', iconActive: 'library-fill' },
  ];
  const activeIndex = $derived(Math.max(0, links.findIndex((l) => l.id === $activeTab)));

  function go(tab: Tab) {
    if ($activeTab === tab) {
      // Pressing the current tab again scrolls back to the top, as on iOS.
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    activeTab.set(tab);
    window.scrollTo({ top: 0 });
  }

  const isDark = $derived(
    $theme === 'dark' ||
      ($theme === 'system' &&
        typeof matchMedia !== 'undefined' &&
        matchMedia('(prefers-color-scheme: dark)').matches),
  );
</script>

<nav class="fixed top-safe inset-x-0 z-50 px-3 sm:px-5" aria-label="Navegación principal">
  <div class="mx-auto max-w-5xl glass-bar rounded-2xl flex items-center justify-between h-14 pl-4 pr-2 sm:pr-3">
    <button class="flex items-center h-11 active:scale-95 transition-transform" onclick={() => go('home')} aria-label="Cortes TV, inicio">
      <Logo height={20} />
    </button>

    <div class="hidden sm:flex items-center gap-1">
      {#each links as l (l.id)}
        <button
          class="px-3.5 h-10 rounded-xl text-[15px] font-medium transition-colors active:scale-95
                 {$activeTab === l.id ? 'text-accent bg-accent/10' : 'text-muted hover:text-content'}"
          aria-current={$activeTab === l.id ? 'page' : undefined}
          onclick={() => go(l.id)}
        >
          {l.label}
        </button>
      {/each}
      <span class="mx-1 h-6 w-px bg-black/10 dark:bg-white/10"></span>
      <button class="grid h-10 w-10 place-items-center rounded-xl text-muted hover:text-content transition-colors active:scale-90" onclick={toggleTheme} aria-label="Cambiar tema">
        <Icon name={isDark ? 'sun' : 'moon'} size={20} />
      </button>
      <button class="grid h-10 w-10 place-items-center rounded-xl text-muted hover:text-content transition-colors active:scale-90" onclick={() => settingsOpen.set(true)} aria-label="Ajustes">
        <Icon name="sliders" size={20} />
      </button>
    </div>

    <button
      class="sm:hidden grid h-11 w-11 place-items-center rounded-xl text-content active:scale-90 transition-transform"
      onclick={() => settingsOpen.set(true)}
      aria-label="Ajustes"
    >
      <Icon name="sliders" size={22} />
    </button>
  </div>
</nav>

<!-- Mobile tab bar -->
<nav class="sm:hidden fixed bottom-safe inset-x-0 z-50 px-6" aria-label="Secciones">
  <div class="glass-tabbar mx-auto max-w-sm">
    <span class="glass-tabbar__indicator" style={`transform: translateX(${activeIndex * 100}%)`} aria-hidden="true"></span>
    {#each links as l (l.id)}
      <button
        class="glass-tabbar__tab"
        aria-current={$activeTab === l.id ? 'page' : undefined}
        onclick={() => go(l.id)}
      >
        <Icon name={$activeTab === l.id ? l.iconActive : l.icon} size={23} />
        {l.label}
      </button>
    {/each}
  </div>
</nav>
