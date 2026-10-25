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

<div class="flex flex-col gap-6">
  <div class="grid grid-cols-2 gap-2.5">
    <div class="rounded-2xl bg-fill p-4">
      <p class="text-3xl font-bold tracking-tight tabular-nums">{$pendingTitles.length}</p>
      <p class="text-sm text-muted">pendientes</p>
    </div>
    <div class="rounded-2xl bg-fill p-4">
      <p class="text-3xl font-bold tracking-tight tabular-nums">{$watchedTitles.length}</p>
      <p class="text-sm text-muted">vistas</p>
    </div>
  </div>

  {#if cloud && $cloudUser}
    <section>
      <p class="group-label">Cuenta</p>
      <div class="group-list">
        <div class="flex items-center gap-3 p-3.5">
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent/15 text-accent">
            <Icon name="cloud" size={20} />
          </span>
          <div class="flex-1 min-w-0">
            <p class="font-medium truncate">{$cloudUser.email}</p>
            <p class="text-sm {$syncState.status === 'error' ? 'text-danger' : 'text-muted'}">
              {syncLabel}{#if $syncState.pending > 0}<span> · {$syncState.pending} pendientes de subir</span>{/if}
            </p>
          </div>
          <button
            type="button"
            class="glass-btn glass-btn--plain glass-btn--sm glass-btn--icon shrink-0"
            onclick={() => void syncNow()}
            disabled={$syncState.status === 'syncing'}
            aria-label="Sincronizar ahora"
          >
            <span class:animate-spin={$syncState.status === 'syncing'}><Icon name="refresh" size={18} /></span>
          </button>
        </div>
      </div>
    </section>
  {/if}

  <section>
    <p class="group-label">Apariencia</p>
    <div class="glass-segmented glass-segmented--plain w-full" role="radiogroup" aria-label="Tema">
      <span class="glass-indicator" style="--count: {themes.length}; --index: {Math.max(0, themes.findIndex((t) => t.id === $theme))}" aria-hidden="true"></span>
      {#each themes as t (t.id)}
        <button type="button" class="glass-segmented__option" role="radio" aria-checked={$theme === t.id} onclick={() => theme.set(t.id)}>
          {t.label}
        </button>
      {/each}
    </div>
  </section>

  <section>
    <p class="group-label">Copia de seguridad</p>
    <div class="group-list">
      <button type="button" class="flex items-center gap-3 p-3.5 text-left font-medium active:bg-fill" onclick={onExport}>
        <Icon name="download" size={20} /> Exportar a JSON
      </button>
      <button type="button" class="flex items-center gap-3 p-3.5 text-left font-medium active:bg-fill" onclick={pickFile}>
        <Icon name="upload" size={20} /> Importar desde JSON
      </button>
      <div class="flex items-center justify-between gap-3 p-3.5">
        <span class="text-[15px] text-muted">Al importar</span>
        <div class="glass-segmented glass-segmented--plain" role="radiogroup" aria-label="Modo de importación">
          <span class="glass-indicator" style="--count: 2; --index: {importMode === 'merge' ? 0 : 1}" aria-hidden="true"></span>
          <button type="button" class="glass-segmented__option min-h-8 px-3" role="radio" aria-checked={importMode === 'merge'} onclick={() => (importMode = 'merge')}>Combinar</button>
          <button type="button" class="glass-segmented__option min-h-8 px-3" role="radio" aria-checked={importMode === 'replace'} onclick={() => (importMode = 'replace')}>Reemplazar</button>
        </div>
      </div>
    </div>
    <p class="mt-2 px-1 text-[13px] text-muted leading-relaxed">
      {cloud
        ? 'Tu biblioteca se sincroniza con tu cuenta; el JSON es una copia propia.'
        : 'Tu biblioteca se guarda en este dispositivo; exporta un JSON para conservarla o moverla.'}
      Las copias antiguas con listas también se importan: lo valorado pasa a Vistas y el resto a Pendientes.
    </p>
    <input bind:this={fileInput} type="file" accept="application/json,.json" onchange={onFile} hidden />
  </section>

  {#if authRequired()}
    <button type="button" class="glass-btn glass-btn--plain glass-btn--danger w-full" onclick={onLogout}>
      <Icon name="logout" size={18} /> Cerrar sesión
    </button>
  {/if}
</div>
