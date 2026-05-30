<script lang="ts">
  import Icon from './Icon.svelte';
  import { activeTab, settingsOpen, theme, toggleTheme, type Tab } from '../lib/ui';

  const links: { id: Tab; label: string; icon: 'home' | 'search' | 'lists' }[] = [
    { id: 'home', label: 'Inicio', icon: 'home' },
    { id: 'search', label: 'Buscar', icon: 'search' },
    { id: 'lists', label: 'Listas', icon: 'lists' },
  ];

  let menuOpen = $state(false);

  function go(tab: Tab) {
    activeTab.set(tab);
    menuOpen = false;
  }
  function openSettings() {
    settingsOpen.set(true);
    menuOpen = false;
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
    <!-- Marca: texto -->
    <button class="text-[17px] font-bold tracking-tight active:scale-95 transition-transform" onclick={() => go('home')}>
      Cortes&nbsp;TV
    </button>

    <!-- Menú PC -->
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
      <button class="grid h-10 w-10 place-items-center rounded-xl text-muted hover:text-content transition-colors active:scale-90" onclick={openSettings} aria-label="Ajustes">
        <Icon name="sliders" size={20} />
      </button>
    </div>

    <!-- Hamburguesa móvil -->
    <button
      class="sm:hidden grid h-11 w-11 place-items-center rounded-xl text-content active:scale-90 transition-transform"
      onclick={() => (menuOpen = true)}
      aria-label="Abrir menú"
      aria-expanded={menuOpen}
    >
      <Icon name="menu" size={24} />
    </button>
  </div>
</nav>

<!-- Drawer móvil -->
{#if menuOpen}
  <div class="sm:hidden fixed inset-0 z-[60] animate-fade-in" role="presentation" onclick={() => (menuOpen = false)}>
    <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
    <div
      class="absolute top-0 right-0 h-full w-[80%] max-w-xs rounded-l-4xl p-5 pt-safe flex flex-col animate-slide-in-right
             bg-neutral-50/95 dark:bg-neutral-900/95 backdrop-blur-2xl backdrop-saturate-150
             border-l border-black/10 dark:border-white/10 shadow-sheet"
      role="dialog"
      aria-modal="true"
      aria-label="Menú"
      onclick={(e) => e.stopPropagation()}
    >
      <div class="flex items-center justify-between mt-2 mb-6">
        <span class="text-xl font-bold tracking-tight">Cortes TV</span>
        <button class="grid h-10 w-10 place-items-center rounded-full bg-black/[0.05] dark:bg-white/10 active:scale-90 transition-transform" onclick={() => (menuOpen = false)} aria-label="Cerrar menú">
          <Icon name="close" size={20} />
        </button>
      </div>

      <div class="flex flex-col gap-1">
        {#each links as l (l.id)}
          <button
            class="flex items-center gap-3 h-12 px-3 rounded-xl text-[17px] font-medium transition-colors active:scale-[0.98]
                   {$activeTab === l.id ? 'text-accent bg-accent/10' : 'text-content hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'}"
            onclick={() => go(l.id)}
          >
            <Icon name={l.icon} size={22} />{l.label}
          </button>
        {/each}
      </div>

      <span class="my-4 h-px w-full bg-black/10 dark:bg-white/10"></span>

      <button class="flex items-center gap-3 h-12 px-3 rounded-xl text-[17px] font-medium text-content hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors active:scale-[0.98]" onclick={toggleTheme}>
        <Icon name={isDark ? 'sun' : 'moon'} size={22} />{isDark ? 'Modo claro' : 'Modo oscuro'}
      </button>
      <button class="flex items-center gap-3 h-12 px-3 rounded-xl text-[17px] font-medium text-content hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors active:scale-[0.98]" onclick={openSettings}>
        <Icon name="sliders" size={22} />Ajustes y copias
      </button>

      <p class="mt-auto text-xs text-muted">Datos de TheMovieDB · guardados en este navegador</p>
    </div>
  </div>
{/if}
