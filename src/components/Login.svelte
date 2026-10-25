<script lang="ts">
  /** Renders the login form shown while `authed` is false: Convex email and password, or the build-time gate. There is no sign-up. */
  import { cloudLogin, login } from '../lib/auth';
  import { cloudEnabled } from '../lib/convex';
  import Logo from './Logo.svelte';

  const cloud = cloudEnabled();

  let user = $state('');
  let pass = $state('');
  let error = $state<string | null>(null);
  let busy = $state(false);
  let userEl: HTMLInputElement;

  $effect(() => {
    userEl?.focus();
  });

  async function onSubmit(e: Event) {
    e.preventDefault();
    error = null;
    if (!cloud) {
      if (!login(user, pass)) {
        error = 'Usuario o contraseña incorrectos.';
        pass = '';
      }
      return;
    }
    busy = true;
    const res = await cloudLogin(user, pass);
    busy = false;
    if (!res.ok) {
      error = res.message ?? 'No se pudo iniciar sesión.';
      pass = '';
    }
  }
</script>

<div class="min-h-dvh flex flex-col items-center justify-center gap-8 px-4 pt-[calc(var(--safe-top)+1rem)] pb-[calc(var(--safe-bottom)+3rem)]">
  <Logo height={56} />

  <form class="glass-sheet w-full max-w-sm p-6 sm:p-7" onsubmit={onSubmit}>
    <h1 class="text-[1.75rem] font-bold tracking-tight">Iniciar sesión</h1>
    <p class="mt-1 text-[15px] text-muted">
      {cloud ? 'Entra con tu cuenta para sincronizar tu biblioteca.' : 'Introduce tus credenciales para acceder.'}
    </p>

    <div class="mt-6 flex flex-col gap-3">
      <input
        bind:this={userEl}
        class="field"
        type={cloud ? 'email' : 'text'}
        inputmode={cloud ? 'email' : 'text'}
        placeholder={cloud ? 'Email' : 'Usuario'}
        aria-label={cloud ? 'Email' : 'Usuario'}
        bind:value={user}
        autocomplete={cloud ? 'email' : 'username'}
        autocapitalize="off"
        spellcheck="false"
        oninput={() => (error = null)}
      />
      <input
        class="field"
        type="password"
        placeholder="Contraseña"
        aria-label="Contraseña"
        bind:value={pass}
        autocomplete="current-password"
        oninput={() => (error = null)}
      />
    </div>

    {#if error}
      <p class="mt-3 text-[15px] text-danger" role="alert">{error}</p>
    {/if}

    <button type="submit" class="glass-btn glass-btn--plain glass-btn--prominent w-full mt-5 min-h-12" disabled={busy || !user.trim() || !pass}>
      {busy ? 'Un momento…' : 'Entrar'}
    </button>
  </form>
</div>
