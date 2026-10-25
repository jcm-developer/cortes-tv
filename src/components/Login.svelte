<script lang="ts">
  /** Renders the login form shown while `authed` is false: Convex email and password (sign in or first-time sign up), or the build-time gate. */
  import { cloudLogin, login } from '../lib/auth';
  import { cloudEnabled } from '../lib/convex';

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

<div class="min-h-dvh grid place-items-center px-4 pb-16 pt-[calc(env(safe-area-inset-top,0px)+1rem)]">
  <form class="glass w-full max-w-sm p-7 sm:p-8 animate-scale-in" onsubmit={onSubmit}>
    <div class="mb-6 text-xl font-bold tracking-tight">Cortes TV</div>

    <h1 class="text-3xl font-bold tracking-tight">{creating ? 'Crear cuenta' : 'Iniciar sesión'}</h1>
    <p class="mt-1.5 text-[15px] text-muted">
      {#if !cloud}
        Introduce tus credenciales para acceder.
      {:else if creating}
        Solo la primera vez. La contraseña necesita al menos 8 caracteres.
      {:else}
        Entra con tu cuenta para sincronizar tu biblioteca.
      {/if}
    </p>

    <div class="mt-6 flex flex-col gap-3">
      <label class="flex flex-col gap-1.5">
        <span class="text-[11px] font-medium uppercase tracking-wide text-muted">{cloud ? 'Email' : 'Usuario'}</span>
        <input
          bind:this={userEl}
          class="field"
          type={cloud ? 'email' : 'text'}
          inputmode={cloud ? 'email' : 'text'}
          bind:value={user}
          autocomplete={cloud ? 'email' : 'username'}
          autocapitalize="off"
          spellcheck="false"
          oninput={() => (error = null)}
        />
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="text-[11px] font-medium uppercase tracking-wide text-muted">Contraseña</span>
        <input
          class="field"
          type="password"
          bind:value={pass}
          autocomplete={creating ? 'new-password' : 'current-password'}
          oninput={() => (error = null)}
        />
      </label>
    </div>

    {#if error}
      <p class="mt-3 text-[15px] text-red-500" role="alert">{error}</p>
    {/if}

    <button type="submit" class="btn-primary w-full mt-5" disabled={busy || !user.trim() || !pass}>
      {busy ? 'Un momento…' : creating ? 'Crear cuenta' : 'Entrar'}
    </button>

    {#if cloud}
      <button
        type="button"
        class="mt-3 w-full text-center text-[15px] font-medium text-accent active:opacity-60"
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
