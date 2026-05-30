<script lang="ts">
  import Icon from './Icon.svelte';
  import { exportJSON, importJSON, appData } from '../lib/store';
  import { showToast, theme, settingsOpen, type Theme } from '../lib/ui';
  import { authRequired, logout } from '../lib/auth';

  function onLogout() {
    settingsOpen.set(false);
    logout();
  }

  let fileInput: HTMLInputElement;
  let importMode = $state<'replace' | 'merge'>('merge');

  const stats = $derived({
    titles: Object.keys($appData.titles).length,
    lists: $appData.lists.length,
  });

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

  const themes: { id: Theme; label: string }[] = [
    { id: 'light', label: 'Claro' },
    { id: 'dark', label: 'Oscuro' },
    { id: 'system', label: 'Sistema' },
  ];
</script>

<div class="flex flex-col gap-4">
  <!-- Estadísticas -->
  <div class="flex gap-3">
    <div class="flex-1 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] p-4">
      <p class="text-3xl font-bold tracking-tight">{stats.titles}</p>
      <p class="text-sm text-muted">títulos</p>
    </div>
    <div class="flex-1 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] p-4">
      <p class="text-3xl font-bold tracking-tight">{stats.lists}</p>
      <p class="text-sm text-muted">listas</p>
    </div>
  </div>

  <!-- Tema -->
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

  <!-- Copia de seguridad -->
  <div>
    <p class="text-[11px] font-medium uppercase tracking-wide text-muted mb-1.5">Copia de seguridad</p>
    <p class="text-[15px] text-muted leading-relaxed mb-3">
      Tus listas se guardan solo en este navegador. Exporta un archivo JSON para conservarlas o
      moverlas a otro dispositivo.
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

  <p class="text-xs text-muted leading-relaxed">
    Estructura preparada para migrar a una base de datos externa (p. ej. Supabase) sin perder datos.
  </p>

  {#if authRequired()}
    <button class="btn-glass w-full mt-1" onclick={onLogout}>
      <Icon name="logout" size={18} /> Cerrar sesión
    </button>
  {/if}
</div>
