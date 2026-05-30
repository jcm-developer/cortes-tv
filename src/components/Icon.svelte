<script lang="ts">
  // Iconos SF-symbols-like en SVG, trazo fino estilo iOS.
  interface Props {
    name:
      | 'home'
      | 'home-fill'
      | 'lists'
      | 'lists-fill'
      | 'search'
      | 'plus'
      | 'check'
      | 'close'
      | 'chevron-left'
      | 'chevron-right'
      | 'chevron-down'
      | 'star'
      | 'star-fill'
      | 'trash'
      | 'arrow-right'
      | 'ellipsis'
      | 'download'
      | 'upload'
      | 'film'
      | 'tv'
      | 'sliders'
      | 'edit'
      | 'menu'
      | 'sun'
      | 'moon'
      | 'logout';
    size?: number;
  }
  let { name, size = 24 }: Props = $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.8"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  {#if name === 'home'}
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V20h14V9.5" />
  {:else if name === 'home-fill'}
    <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" fill="currentColor" stroke="none" />
  {:else if name === 'lists'}
    <path d="M8 6h12M8 12h12M8 18h12" />
    <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none" />
    <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none" />
  {:else if name === 'lists-fill'}
    <path d="M8 6h12M8 12h12M8 18h12" stroke-width="2.4" />
    <circle cx="4" cy="6" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="4" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="4" cy="18" r="1.4" fill="currentColor" stroke="none" />
  {:else if name === 'search'}
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.2-3.2" />
  {:else if name === 'plus'}
    <path d="M12 5v14M5 12h14" />
  {:else if name === 'check'}
    <path d="m4 12.5 5 5L20 6.5" />
  {:else if name === 'close'}
    <path d="M6 6l12 12M18 6 6 18" />
  {:else if name === 'chevron-left'}
    <path d="m15 5-7 7 7 7" />
  {:else if name === 'chevron-right'}
    <path d="m9 5 7 7-7 7" />
  {:else if name === 'chevron-down'}
    <path d="m5 9 7 7 7-7" />
  {:else if name === 'arrow-right'}
    <path d="M5 12h14M13 6l6 6-6 6" />
  {:else if name === 'star'}
    <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.8 6.6 20l1-6.1L3.2 9.5l6.1-.9z" />
  {:else if name === 'star-fill'}
    <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.8 6.6 20l1-6.1L3.2 9.5l6.1-.9z" fill="currentColor" />
  {:else if name === 'trash'}
    <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
  {:else if name === 'ellipsis'}
    <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
  {:else if name === 'download'}
    <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 21h16" />
  {:else if name === 'upload'}
    <path d="M12 21V9m0 0 4 4m-4-4-4 4M4 3h16" />
  {:else if name === 'film'}
    <rect x="3" y="4" width="18" height="16" rx="2.5" />
    <path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" />
  {:else if name === 'tv'}
    <rect x="3" y="6" width="18" height="12" rx="2.5" />
    <path d="M8 21h8" />
  {:else if name === 'sliders'}
    <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="8" cy="17" r="2" />
  {:else if name === 'edit'}
    <path d="M4 20h4l10-10-4-4L4 16z" />
    <path d="m13.5 6.5 4 4" />
  {:else if name === 'menu'}
    <path d="M4 7h16M4 12h16M4 17h16" />
  {:else if name === 'sun'}
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" />
  {:else if name === 'moon'}
    <path d="M20 13.5A8 8 0 1 1 10.5 4a6.3 6.3 0 0 0 9.5 9.5z" />
  {:else if name === 'logout'}
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 12h10M16 8l4 4-4 4" />
  {/if}
</svg>
