<script lang="ts">
  /** Renders the notice shown when the build has no TMDB API key. */
</script>

<div class="rounded-2xl bg-surface p-5">
  <p class="text-lg font-semibold">Falta la API key de TMDB</p>
  <p class="mt-1 text-[15px] text-muted leading-relaxed">
    Define <code class="rounded bg-fill px-1.5 py-0.5 text-[0.85em]">PUBLIC_TMDB_API_KEY</code>
    en un archivo <code class="rounded bg-fill px-1.5 py-0.5 text-[0.85em]">.env</code> y recompila.
  </p>
</div>
