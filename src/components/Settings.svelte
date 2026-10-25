<script lang="ts">
  /** Renders the settings sheet content: library stats, account and sync, theme, JSON backup and logout. */
  import Icon from './Icon.svelte';
  import { exportJSON, importJSON, pendingTitles, watchedTitles } from '../lib/store';
  import { showToast, theme, settingsOpen, type Theme } from '../lib/ui';
  import { authRequired, cloudUser, logout } from '../lib/auth';
  import { cloudEnabled } from '../lib/convex';
  import { syncState, syncNow, signOut } from '../lib/sync';

  const cloud = cloudEnabled();

  let fileInput: HTMLInputElement;
  let importMode = $state<'replace' | 'merge'>('merge');

  function onExport() {
    exportJSON();
    showToast('Copia exportada');
  }
  function pickFile() {
    fileInput?.click();
  }
  async function onFile(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const text = await file.text();
    const res = importJSON(text, importMode);
    showToast(res.message);
    input.value = '';
  }

  function onLogout() {
    if (
      cloud &&
      $syncState.pending > 0 &&
      !confirm(`Hay ${$syncState.pending} cambios sin sincronizar que se perderán. ¿Cerrar sesión igualmente?`)
    ) {
      return;
    }
    settingsOpen.set(false);
    void (cloud ? signOut() : logout());
  }

  const syncLabel = $derived.by(() => {
    switch ($syncState.status) {
      case 'syncing':
        return 'Sincronizando…';
      case 'offline':
        return 'Sin conexión: se sincronizará al volver';
      case 'error':
        return 'No se pudo sincronizar';
      case 'idle':
        return $syncState.lastSync
          ? `Sincronizado a las ${new Date($syncState.lastSync).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`
          : 'Sincronizado';
      default:
        return 'Desconectado';
    }
  });

  const themes: { id: Theme; label: string }[] = [
    { id: 'light', label: 'Claro' },
    { id: 'dark', label: 'Oscuro' },
    { id: 'system', label: 'Sistema' },
  ];
</script>

<div class="flex flex-col gap-5">
  <div class="flex gap-3">
    <div class="flex-1 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] p-4">
      <p class="text-3xl font-bold tracking-tight">{$pendingTitles.length}</p>
      <p class="text-sm text-muted">pendientes</p>
    </div>
    <div class="flex-1 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] p-4">
      <p class="text-3xl font-bold tracking-tight">{$watchedTitles.length}</p>
      <p class="text-sm text-muted">vistas</p>
    </div>
  </div>

  {#if cloud && $cloudUser}
    <div>
      <p class="text-[11px] font-medium uppercase tracking-wide text-muted mb-2">Cuenta</p>
      <div class="rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] p-4 flex items-center gap-3">
        <span class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
          <Icon name="cloud" size={20} />
        </span>
        <div class="flex-1 min-w-0">
          <p class="font-medium truncate">{$cloudUser.email}</p>
          <p class="text-sm {$syncState.status === 'error' ? 'text-red-500' : 'text-muted'}">
            {syncLabel}{#if $syncState.pending > 0}<span> · {$syncState.pending} pendientes de subir</span>{/if}
          </p>
        </div>
        <button
          class="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted hover:text-content active:scale-90 transition-transform disabled:opacity-40"
          onclick={() => void syncNow()}
          disabled={$syncState.status === 'syncing'}
          aria-label="Sincronizar ahora"
        >
          <span class:animate-spin={$syncState.status === 'syncing'}><Icon name="refresh" size={20} /></span>
        </button>
      </div>
    </div>
  {/if}

  <div>
    <p class="text-[11px] font-medium uppercase tracking-wide text-muted mb-2">Apariencia</p>
    <div class="flex gap-2">
      {#each themes as t (t.id)}
        <button class="chip flex-1 justify-center" class:is-active={$theme === t.id} onclick={() => theme.set(t.id)}>
          {t.label}
        </button>
      {/each}
    </div>
  </div>

  <div>
    <p class="text-[11px] font-medium uppercase tracking-wide text-muted mb-1.5">Copia de seguridad</p>
    <p class="text-[15px] text-muted leading-relaxed mb-3">
      {cloud
        ? 'Tu biblioteca se sincroniza con tu cuenta. Exporta un JSON si quieres una copia propia.'
        : 'Tu biblioteca se guarda en este dispositivo. Exporta un archivo JSON para conservarla o moverla a otro.'}
      Puedes importar copias antiguas con listas: lo valorado o fechado pasa a Vistas y el resto a Pendientes.
    </p>

    <button class="btn-glass w-full" onclick={onExport}>
      <Icon name="download" size={18} /> Exportar a JSON
    </button>

    <div class="flex items-center gap-2 my-3">
      <span class="text-sm text-muted mr-0.5">Al importar:</span>
      <button class="chip" class:is-active={importMode === 'merge'} onclick={() => (importMode = 'merge')}>Combinar</button>
      <button class="chip" class:is-active={importMode === 'replace'} onclick={() => (importMode = 'replace')}>Reemplazar</button>
    </div>

    <button class="btn-glass w-full" onclick={pickFile}>
      <Icon name="upload" size={18} /> Importar desde JSON
    </button>
    <input bind:this={fileInput} type="file" accept="application/json,.json" onchange={onFile} hidden />
  </div>

  {#if authRequired()}
    <button class="btn-glass w-full" onclick={onLogout}>
      <Icon name="logout" size={18} /> Cerrar sesión
    </button>
  {/if}
</div>
