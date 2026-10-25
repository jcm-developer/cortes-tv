<script lang="ts">
  /** Renders the root island: auth gate, active tab, top bar, tab bar and overlays; owns the theme, scroll lock and history sync. */
  import Home from './Home.svelte';
  import Search from './Search.svelte';
  import Library from './Library.svelte';
  import Detail from './Detail.svelte';
  import TabBar from './TabBar.svelte';
  import TopBar from './TopBar.svelte';
  import TitleSheet from './TitleSheet.svelte';
  import Settings from './Settings.svelte';
  import Sheet from './Sheet.svelte';
  import Toast from './Toast.svelte';
  import Login from './Login.svelte';
  import Logo from './Logo.svelte';
  import { activeTab, settingsOpen, theme, applyTheme, onHistoryBack, detailTarget, titleSheetTarget } from '../lib/ui';
  import { authed, authReady } from '../lib/auth';
  import '../lib/sync';

  // Keep <html> in step with the theme, including system scheme changes.
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

  // While an overlay is open the page behind it must not scroll (iOS scrolls it otherwise).
  $effect(() => {
    const locked = !!$detailTarget || !!$titleSheetTarget || $settingsOpen;
    document.documentElement.classList.toggle('is-locked', locked);
  });
</script>

{#if !$authReady}
  <div class="min-h-dvh grid place-items-center" aria-busy="true">
    <span class="animate-pulse"><Logo height={40} /></span>
  </div>
{:else if !$authed}
  <Login />
{:else}
  <TopBar />

  <main class="page-x mx-auto w-full max-w-5xl pt-[var(--topbar-room)] pb-[var(--tabbar-room)]">
    {#if $activeTab === 'home'}
      <Home />
    {:else if $activeTab === 'search'}
      <Search />
    {:else}
      <Library />
    {/if}
  </main>

  <TabBar />
  <Detail />
  <TitleSheet />

  <Sheet open={$settingsOpen} title="Ajustes" onClose={() => settingsOpen.set(false)}>
    <Settings />
  </Sheet>
{/if}

<Toast />
