<script lang="ts">
  /** Renders the login form shown while `authed` is false: Convex email and password (sign in or first-time sign up), or the build-time gate. */
  import { cloudLogin, login } from '../lib/auth';
  import { cloudEnabled } from '../lib/convex';
  import Logo from './Logo.svelte';

  const cloud = cloudEnabled();

  let user = $state('');
  let pass = $state('');
  let error = $state<string | null>(null);
  let busy = $state(false);
  let creating = $state(false);
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
    const res = await cloudLogin(user, pass, creating);
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
    <h1 class="text-[1.75rem] font-bold tracking-tight">{creating ? 'Crear cuenta' : 'Iniciar sesión'}</h1>
    <p class="mt-1 text-[15px] text-muted">
      {#if !cloud}
        Introduce tus credenciales para acceder.
      {:else if creating}
        Solo la primera vez. La contraseña necesita al menos 8 caracteres.
      {:else}
        Entra con tu cuenta para sincronizar tu biblioteca.
      {/if}
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
        autocomplete={creating ? 'new-password' : 'current-password'}
        oninput={() => (error = null)}
      />
    </div>

    {#if error}
      <p class="mt-3 text-[15px] text-danger" role="alert">{error}</p>
    {/if}

    <button type="submit" class="glass-btn glass-btn--plain glass-btn--prominent w-full mt-5 min-h-12" disabled={busy || !user.trim() || !pass}>
      {busy ? 'Un momento…' : creating ? 'Crear cuenta' : 'Entrar'}
    </button>

    {#if cloud}
      <button
        type="button"
        class="mt-3 w-full min-h-11 text-center text-[15px] font-medium text-accent active:opacity-60"
        onclick={() => {
          creating = !creating;
          error = null;
        }}
      >
        {creating ? 'Ya tengo cuenta: entrar' : 'Primera vez: crear cuenta'}
      </button>
    {/if}
  </form>
</div>
