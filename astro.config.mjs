// @ts-check
import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import tailwind from '@astrojs/tailwind';

// --- GitHub Pages config -----------------------------------------------------
// Para un "project site" (https://<user>.github.io/<repo>/) define el base
// con el nombre del repositorio. Puedes sobreescribirlo en build con:
//   SITE=https://tu-usuario.github.io  BASE=/cortes-tv  pnpm build
// Para un dominio propio o "user site", deja BASE = '/'.
const SITE = process.env.SITE ?? 'https://tu-usuario.github.io';
const BASE = process.env.BASE ?? '/cortes-tv';

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
