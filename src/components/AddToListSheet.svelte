<script lang="ts">
  import Sheet from './Sheet.svelte';
  import Icon from './Icon.svelte';
  import { addSheetTarget, closeAddSheet, showToast } from '../lib/ui';
  import {
    appData,
    toggleInList,
    listsContaining,
    summaryKey,
    createList,
    addToList,
  } from '../lib/store';

  let newName = $state('');
  let creating = $state(false);

  const target = $derived($addSheetTarget);
  const key = $derived(target ? summaryKey(target) : '');
  const membership = $derived($appData && key ? listsContaining(key) : []);

  function onToggle(listId: string) {
    if (!target) return;
    toggleInList(target, listId);
  }
  function onCreate() {
    const name = newName.trim();
    if (!name || !target) return;
    const id = createList(name);
    addToList(target, id);
    newName = '';
    creating = false;
    showToast(`Lista "${name}" creada`);
  }
</script>

<Sheet open={!!target} title="Añadir a lista" onClose={closeAddSheet}>
  {#if target}
    <p class="-mt-2 mb-4 text-[15px] text-muted">{target.title}{target.year ? ` · ${target.year}` : ''}</p>

    <ul class="flex flex-col gap-1">
      {#each $appData.lists as l (l.id)}
        {@const checked = membership.includes(l.id)}
        <li>
          <button
            class="flex w-full items-center gap-3.5 min-h-[52px] px-2 rounded-xl text-left transition-colors
                   hover:bg-black/[0.04] dark:hover:bg-white/[0.06] active:scale-[0.99]"
            aria-pressed={checked}
            onclick={() => onToggle(l.id)}
          >
            <span class="grid h-6.5 w-6.5 shrink-0 place-items-center rounded-full border-2 text-white transition-colors
                         {checked ? 'bg-accent border-accent' : 'border-black/15 dark:border-white/25'}"
                  style="width:1.625rem;height:1.625rem">
              {#if checked}<Icon name="check" size={15} />{/if}
            </span>
            <span class="flex-1 font-medium">{l.name}</span>
            <span class="text-sm text-muted tabular-nums">{l.itemKeys.length}</span>
          </button>
        </li>
      {/each}
    </ul>

    {#if creating}
      <form class="mt-4 flex gap-2" onsubmit={(e) => { e.preventDefault(); onCreate(); }}>
        <!-- svelte-ignore a11y_autofocus -->
        <input class="field flex-1" type="text" placeholder="Nombre de la lista" bind:value={newName} maxlength="40" autofocus />
        <button type="submit" class="btn-primary shrink-0" disabled={!newName.trim()}>Crear</button>
      </form>
    {:else}
      <button class="btn-glass w-full mt-4" onclick={() => (creating = true)}>
        <Icon name="plus" size={18} /> Nueva lista
      </button>
    {/if}
  {/if}
</Sheet>
