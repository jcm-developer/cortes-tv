<script lang="ts">
  import { login } from '../lib/auth';

  let user = $state('');
  let pass = $state('');
  let error = $state(false);
  let userEl: HTMLInputElement;

  $effect(() => {
    userEl?.focus();
  });

  function onSubmit(e: Event) {
    e.preventDefault();
    if (!login(user, pass)) {
      error = true;
      pass = '';
    }
  }
</script>

<div class="min-h-dvh grid place-items-center px-4 pb-16 pt-[calc(env(safe-area-inset-top,0px)+1rem)]">
  <form class="glass w-full max-w-sm p-7 sm:p-8 animate-scale-in" onsubmit={onSubmit}>
    <div class="mb-6 text-xl font-bold tracking-tight">Cortes TV</div>

    <h1 class="text-3xl font-bold tracking-tight">Iniciar sesión</h1>
    <p class="mt-1.5 text-[15px] text-muted">Introduce tus credenciales para acceder.</p>

    <div class="mt-6 flex flex-col gap-3">
      <label class="flex flex-col gap-1.5">
        <span class="text-[11px] font-medium uppercase tracking-wide text-muted">Usuario</span>
        <input
          bind:this={userEl}
          class="field"
          type="text"
          bind:value={user}
          autocomplete="username"
          autocapitalize="off"
          spellcheck="false"
          oninput={() => (error = false)}
        />
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="text-[11px] font-medium uppercase tracking-wide text-muted">Contraseña</span>
        <input
          class="field"
          type="password"
          bind:value={pass}
          autocomplete="current-password"
          oninput={() => (error = false)}
        />
      </label>
    </div>

    {#if error}
      <p class="mt-3 text-[15px] text-red-500">Usuario o contraseña incorrectos.</p>
    {/if}

    <button type="submit" class="btn-primary w-full mt-5" disabled={!user.trim() || !pass}>
      Entrar
    </button>
  </form>
</div>
