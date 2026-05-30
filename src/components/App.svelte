<script lang="ts">
  import Home from './Home.svelte';
  import Search from './Search.svelte';
  import Lists from './Lists.svelte';
  import Detail from './Detail.svelte';
  import TopNav from './TopNav.svelte';
  import AddToListSheet from './AddToListSheet.svelte';
  import Settings from './Settings.svelte';
  import Sheet from './Sheet.svelte';
  import Toast from './Toast.svelte';
  import Login from './Login.svelte';
  import { activeTab, detailTarget, settingsOpen, theme, applyTheme } from '../lib/ui';
  import { authed } from '../lib/auth';

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

  // El botón "atrás" del navegador cierra el detalle.
  $effect(() => {
    function onPop() {
      detailTarget.set(null);
    }
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  });
  let pushed = false;
  $effect(() => {
    const open = !!$detailTarget;
    if (open && !pushed) {
      history.pushState({ detail: true }, '');
      pushed = true;
    } else if (!open && pushed) {
      pushed = false;
    }
  });
</script>

{#if !$authed}
  <Login />
{:else}
  <TopNav />

  <!-- Mismo esquema que el navbar (px fuera, max-w-5xl dentro) para que el
       contenido tenga exactamente el mismo ancho que la barra. -->
  <main class="px-3 sm:px-5 pt-[calc(env(safe-area-inset-top,0px)+5rem)] pb-16">
    <div class="mx-auto w-full max-w-5xl">
      {#if $activeTab === 'home'}
        <Home />
      {:else if $activeTab === 'search'}
        <Search />
      {:else}
        <Lists />
      {/if}
    </div>
  </main>

  <Detail />
  <AddToListSheet />

  <Sheet open={$settingsOpen} title="Ajustes y copias de seguridad" onClose={() => settingsOpen.set(false)}>
    <Settings />
  </Sheet>
{/if}

<Toast />
