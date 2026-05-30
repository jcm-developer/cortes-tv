# Cortes TV 🎬

Gestor de **películas y series** con estética **Apple** (*Human Interface* /
*Liquid Glass*), responsive y pensado también para **iPhone**. Sitio
**estático** (Astro) que se despliega en **GitHub Pages** y guarda tus listas en
el navegador.

Datos de [TheMovieDB](https://www.themoviedb.org/). El sistema de diseño está
documentado en [`DESIGN.md`](DESIGN.md).

## Características

- **Diseño Apple / Liquid Glass** (Tailwind): glassmorphism con `backdrop-blur`
  sobre un fondo atmosférico de blobs, acento *System Blue*, radios grandes,
  sombras suaves y microinteracciones con curva `ease-apple`.
- **Modo claro / oscuro / sistema** con conmutador y sin parpadeo al cargar.
- **Navegación responsive**: menú horizontal en PC que colapsa a **menú
  hamburguesa** (drawer lateral) en móvil. Respeta las *safe areas* del iPhone.
- Carátulas protagonistas, carruseles horizontales con inercia.
- **Login de un solo usuario** (credenciales por variable de entorno / secreto),
  con sesión persistente **sin caducidad** en `localStorage`.
- **Página de búsqueda** (`/search/multi`) y añadir títulos a listas en un toque.
- **Listas propias**: no hay listas por defecto, las creas tú. Añadir, **mover**
  y **quitar** títulos; **filtrar y ordenar** por tipo, género, año o nota.
- **Detalle inmersivo**: *backdrop* a pantalla completa, sinopsis, géneros,
  duración / nº de temporadas, nota de TMDB, **reparto** y **dónde verlo**
  (`/watch/providers`).
- **Valoración personal** (1–5) y **fecha de visto**; fila *"Tus joyas"* en
  Inicio con lo que has puntuado 4★ o más.
- **Descubrimiento**: tendencias, mejor valoradas (cine y series), clásicos,
  en cartelera y populares.
- **Persistencia** en `localStorage` + **exportar/importar JSON** como copia
  de seguridad y para mover datos entre dispositivos.
- Estructura de datos **normalizada**, lista para migrar a una BBDD externa
  (p. ej. Supabase) sin rehacer la app.

## Stack

Astro · isla interactiva con **Svelte 5** · TypeScript · **Tailwind CSS**
(tokens de diseño en variables CSS) · pnpm.

## Puesta en marcha

```bash
pnpm install
cp .env.example .env      # y pon tu PUBLIC_TMDB_API_KEY
pnpm dev
```

Consigue una API key (v3 *auth*) en
<https://www.themoviedb.org/settings/api>.

> ⚠️ En un sitio estático la API key queda **expuesta** en el cliente. Usa una
> clave de **solo lectura**; es lo normal con la API pública de TMDB.

### Login (opcional)

Define tu usuario y contraseña en `.env`:

```bash
PUBLIC_AUTH_USER=tu_usuario
PUBLIC_AUTH_PASSWORD=tu_contraseña
```

Si ambos están vacíos, el sitio queda con **acceso abierto** (sin login). La
sesión se guarda en `localStorage` **sin caducidad** hasta que cierres sesión.

> ⚠️ Igual que la API key, en un sitio estático estas credenciales viajan en el
> bundle del cliente: sirven para *cerrar la puerta*, **no es seguridad real**.
> Para auth de verdad haría falta un backend (p. ej. Supabase Auth).

### Scripts

| Comando         | Acción                              |
| --------------- | ----------------------------------- |
| `pnpm dev`      | Servidor de desarrollo              |
| `pnpm build`    | Build estático en `dist/`           |
| `pnpm preview`  | Previsualiza el build               |
| `pnpm check`    | Comprobación de tipos (astro check) |

Los iconos PWA se regeneran con `node scripts/generate-icons.mjs`.

## Despliegue en GitHub Pages

1. Sube el repo a GitHub y activa **Settings → Pages → Source: GitHub Actions**.
2. Añade los secretos en *Settings → Secrets and variables → Actions*:
   - **`TMDB_API_KEY`** (obligatorio).
   - **`AUTH_USER`** y **`AUTH_PASSWORD`** (opcionales, para el login).
3. Cada *push* a `main` ejecuta [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml),
   que compila y publica.

El *workflow* calcula el `base` automáticamente con el nombre del repositorio
(*project site* → `https://<usuario>.github.io/<repo>/`). Para un **dominio
propio** o un repo `usuario.github.io`, define `BASE="/"` en las variables del
repositorio. En local puedes forzarlo: `BASE=/ pnpm build`.

## Modelo de datos (resumen)

```ts
AppData {
  version: number
  titles: Record<"movie:123" | "tv:456", StoredTitle>   // tabla normalizada
  lists:  MovieList[]   // cada lista guarda itemKeys[] → relación N:M
}
```

`titles` ↔ `lists.itemKeys` modela una *join table* (`list_items`), lo que
facilita migrar a Supabase sin cambiar la lógica de la app.
