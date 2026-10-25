<script lang="ts">
  /** Renders the root island: auth gate, navigation, active tab and overlays; owns the theme and history sync. */
  import Home from './Home.svelte';
  import Search from './Search.svelte';
  import Library from './Library.svelte';
  import Detail from './Detail.svelte';
  import TopNav from './TopNav.svelte';
  import TitleSheet from './TitleSheet.svelte';
  import Settings from './Settings.svelte';
  import Sheet from './Sheet.svelte';
  import Toast from './Toast.svelte';
  import Login from './Login.svelte';
  import { activeTab, settingsOpen, theme, applyTheme, onHistoryBack } from '../lib/ui';
  import { authed, authReady } from '../lib/auth';
  import '../lib/sync';

  // Mantén el <html> sincronizado con el tema (incluye cambios del sistema).
  $effect(() => {
    applyTheme($theme);
  });
  $effect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme($theme);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  });

  // The browser back button and the iOS back gesture close the detail view.
  $effect(() => {
    window.addEventListener('popstate', onHistoryBack);
    return () => window.removeEventListener('popstate', onHistoryBack);
  });
</script>

{#if !$authReady}
  <div class="min-h-dvh grid place-items-center" aria-busy="true">
    <span class="text-xl font-bold tracking-tight animate-pulse">Cortes TV</span>
  </div>
{:else if !$authed}
  <Login />
{:else}
  <TopNav />

  <!-- Same frame as the top bar (padding outside, max-w-5xl inside) so content lines up with
       it; the bottom padding clears the mobile tab bar. -->
  <main class="px-3 sm:px-5 pt-[calc(env(safe-area-inset-top,0px)+5rem)] pb-[calc(env(safe-area-inset-bottom,0px)+7rem)] sm:pb-16">
    <div class="mx-auto w-full max-w-5xl">
      {#if $activeTab === 'home'}
        <Home />
      {:else if $activeTab === 'search'}
        <Search />
      {:else}
        <Library />
      {/if}
    </div>
  </main>

  <Detail />
  <TitleSheet />

  <Sheet open={$settingsOpen} title="Ajustes" onClose={() => settingsOpen.set(false)}>
    <Settings />
  </Sheet>
{/if}

<Toast />
