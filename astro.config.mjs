// @ts-check
import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import tailwind from '@astrojs/tailwind';

// --- Site and base path ------------------------------------------------------
// Cloudflare Pages serves the site at the root of cortes-tv.pages.dev. Override with SITE and
// BASE for another host or a sub-path (docs/operations.md, "Deploy").
const SITE = process.env.SITE ?? 'https://cortes-tv.pages.dev';
const BASE = process.env.BASE ?? '/';

// https://astro.build/config
export default defineConfig({
  site: SITE,
  base: BASE,
  trailingSlash: 'ignore',
  integrations: [
    // applyBaseStyles: false → controlamos las @layer base en global.css
    tailwind({ applyBaseStyles: false }),
    svelte(),
  ],
  build: {
    assets: 'assets',
  },
  vite: {
    build: {
      // La app es una única isla; no hace falta inlinear demasiado.
      assetsInlineLimit: 4096,
    },
  },
});
