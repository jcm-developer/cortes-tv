# DESIGN.md

Sistema de diseño de Cortes TV: estética **Apple TV** con el material **Liquid Glass**, construido con Tailwind CSS y los componentes de la skill `liquid-glass` (`.agents/skills/liquid-glass/`). Es la única fuente de verdad para tipografía, color, vidrio, movimiento y componentes.

---

## 1. Principios

1. **Dos capas.** El contenido (pósteres, textos, listas) es opaco. El vidrio es solo para el cromo que flota encima: barras de navegación, botones flotantes, hojas y avisos.
2. **Nada de vidrio sobre vidrio.** Los controles dentro de una superficie de vidrio usan rellenos planos (`glass-btn--plain`, `glass-segmented--plain`, `--glass-fill`).
3. **Dos navegaciones, mismas vistas.** En iPhone (menos de 768px), barra superior de vidrio con el logotipo, el cambio de tema y Ajustes, y barra de pestañas flotante abajo, las dos con el mismo ancho (`--chrome-w`). En escritorio, una sola barra de navegación de vidrio arriba con el logotipo, las pestañas, el tema y Ajustes, alineada con la columna de contenido; sin barra inferior. Las vistas son las mismas; cambian columnas y márgenes.
4. **Máximo tres superficies de vidrio** visibles a la vez en móvil.
5. **Accesible por defecto.** Cada componente de vidrio tiene alternativa para transparencia reducida, contraste alto, movimiento reducido y colores forzados.

---

## 2. Tipografía

Stack del sistema: en dispositivos Apple resuelve a **SF Pro**; la fuente no se redistribuye.

```css
font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, "Segoe UI", sans-serif;
```

| Rol | Clase | Uso |
|---|---|---|
| Título grande | `.large-title` (34px, bold, tracking ajustado) | Cabecera de cada pestaña |
| Título de detalle | `text-[2rem] sm:text-5xl font-bold` | Nombre del título en el detalle |
| Sección | `.section-title` (20px, bold) | Filas y bloques ("Para ti", "Reparto") |
| Cuerpo | `text-base leading-relaxed` | Sinopsis |
| Secundario | `text-[15px] text-muted` | Subtítulos, metadatos |
| Pie | `text-[13px]` / `text-xs text-muted` | Año y tipo bajo el póster, etiquetas de grupo |

Peso mínimo 500 sobre vidrio; nunca 300 o menos. Los campos de texto usan 16px para que iOS no haga zoom al enfocarlos.

---

## 3. Color

Colores de sistema de iOS, como variables HSL en `src/styles/global.css` y mapeados en `tailwind.config.js`.

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `accent` | `#007AFF` | `#0A84FF` | Acción principal, pestaña activa, Pendiente |
| `success` | `#34C759` | `#30D158` | Estado Vista |
| `danger` | `#FF3B30` | `#FF453A` | Quitar, errores |
| `bg` | `#F2F2F7` | `#000000` | Fondo de la app |
| `surface` | `#FFFFFF` | `#1C1C1E` | Tarjetas opacas (avisos) |
| `content` / `muted` | `#1D1D1F` / `#6E6E73` | `#F5F5F7` / `#98989D` | Texto |
| `fill` | gris al 12% | gris al 18% | Campos, chips, listas agrupadas, placeholders |

Un solo acento por pantalla. El verde es semántico (Vista), no un segundo acento. El estado nunca depende solo del color: siempre hay icono y texto.

El detalle de un título es **siempre oscuro** (lleva la clase `dark`), como en Apple TV.

**Fondo atmosférico** (`.atmosphere`): tres degradados radiales muy suaves fijos tras la app, para que el vidrio tenga color que recoger. Sin capas con `blur`, que en iOS cuestan memoria.

---

## 4. Liquid Glass

`src/styles/glass.css` porta los snippets de la skill. Diferencias: el esquema sigue al tema de la app (clase `dark`) y no a `prefers-color-scheme`; no se carga `liquid-glass.js` (Svelte mueve los indicadores y la refracción no corre en táctil); hojas y avisos usan un tinte denso para que el texto largo se lea sobre pósteres.

**El material:** tinte (`--glass-tint`), escarcha ligera (`blur(8px) saturate(180%)`), dos brillos especulares interiores (`--glass-shadow-rim`) y una sombra suave. Nunca blur de 20px o más (eso es vidrio esmerilado, no Liquid Glass), nunca `will-change: backdrop-filter`, nunca animar `backdrop-filter`.

| Token | Claro | Oscuro |
|---|---|---|
| `--glass-tint-rgb` / `--glass-tint` | blanco / 0.55 | `34 34 38` / 0.5 |
| `--glass-tint-dense` (hojas, avisos) | 0.9 | 0.88 |
| `--glass-rim` | 0.9 | 0.32 |
| `--glass-easing-spring` | muelle `linear()` de 600ms | igual |

Los tokens derivados (`--glass-bg`, `--glass-shadow-rim`...) se recalculan en cada componente, así que basta con sobrescribir un primitivo en un elemento.

`glass.css` se importa entre `components` y `utilities` de Tailwind: una utilidad (`fixed`, `hidden`, `pr-5`) siempre gana a un componente de vidrio.

---

## 5. Componentes

### Vidrio (capa de cromo)

| Clase | Componente | Dónde |
|---|---|---|
| `.glass-topbar` + `__links` + `__link` + `.glass-indicator` | Barra superior en píldora; transparente arriba del todo (`is-clear`), vidrio al hacer scroll | `TopBar.svelte` |
| `.glass-tabs` + `.glass-tabs__tab` + `.glass-indicator` | Barra de pestañas con indicador deslizante (solo móvil) | `TabBar.svelte` |
| `.glass-btn` | Botón; variantes `--icon`, `--sm`, `--prominent` (acento), `--success` (verde), `--plain` (dentro de vidrio), `--danger` | Cabeceras, detalle, hojas |
| `.glass-segmented` + `__option` + `.glass-indicator` | Control segmentado; `--plain` dentro de hojas | Biblioteca, Ajustes |
| `.glass-search` + `__input` | Buscador en píldora (fijo al hacer scroll en Buscar); los botones de dentro, planos | Buscar, Biblioteca |
| `.glass-toast` | Aviso flotante sobre la barra de pestañas | `Toast.svelte` |
| `.glass-sheet` (+ `--bottom`) | Hoja: pegada al borde inferior en móvil, con asa y arrastre para cerrar; centrada en escritorio | `Sheet.svelte`, login |

El indicador deslizante recibe `--count` (número de opciones) y `--index` (opción activa) por estilo en línea. La selección vive en ARIA: `aria-current="page"` en pestañas, `role="radio"` y `aria-checked` en segmentados.

Los controles de vidrio **crecen** al pulsarlos (`--glass-press-scale: 1.08`); nunca encogen.

### Contenido (opaco)

- **Póster** (`PosterCard.svelte`): `rounded-xl`, `shadow-poster`, título y "año · tipo" debajo. El botón de la esquina es un círculo sólido (negro al 55%, acento si está pendiente, verde si está vista), nunca vidrio: una fila tendría decenas de desenfoques.
- **Fila** (`Carousel.svelte`): sangra hasta los bordes de la pantalla (`.h-scroll` lee `--page-x` de `.page-x`) y ajusta al margen. Con ratón aparecen dos botones de desplazamiento en la cabecera de la fila.
- **Chip** (`.chip`): relleno `fill`; activo en color de texto invertido (`aria-pressed="true"`).
- **Campo** (`.field`): relleno `fill`, anillo de acento al enfocar.
- **Lista agrupada** (`.group-list`, `.group-label`): estilo Ajustes de iOS dentro de hojas.
- **Aviso opaco** (`MissingKey.svelte`, recomendaciones vacías): `bg-surface rounded-2xl`.

### Estados de la biblioteca

| Estado | Color | Icono |
|---|---|---|
| Pendiente | acento (`glass-btn--prominent`, `bg-accent`) | `bookmark` / `bookmark-fill` |
| Vista | verde (`glass-btn--success`, `bg-success`) | `check-circle` / `check-circle-fill` |

### Logo

"**Ctv**" en **SF Pro Display Bold**, convertido a trazado para que se vea igual en cualquier dispositivo.

- **Icono de app** (`public/icons/icon.svg`): letras blancas con un degradado muy suave sobre negro con degradado vertical (`#2c2c2e` a `#050506`), a sangre (iOS y los iconos *maskable* redondean las esquinas). Los PNG se generan con `node scripts/generate-icons.mjs`.
- **Logotipo** (`Logo.svelte`): el mismo trazado en `currentColor`; 22px en la barra superior, 56px en el login y 40px en la pantalla de carga.
- Sin la manzana ni ninguna forma registrada de Apple.

---

## 6. Espaciado y layout

- Margen lateral de página `.page-x`: 16px en móvil, 24px desde `sm`, 40px desde `lg`. Ancho máximo `max-w-5xl` (el detalle, `max-w-4xl`).
- Rejillas de pósteres: 3 columnas en móvil, 4 en `sm`, 5 en `md`, 6 en `lg`.
- Áreas seguras: `--safe-top` y `--safe-bottom`. La barra superior se coloca con `--topbar-top` y `--topbar-h`, y el contenido deja `--topbar-room` arriba; la barra de pestañas se coloca con `--tabbar-bottom` y el contenido deja `--tabbar-room` debajo.
- Filtros: detrás de un botón junto al buscador, en una hoja; el botón pasa a acento y muestra cuántos hay activos. Nada de filas de chips sobre el contenido.
- Objetivo táctil mínimo 44px (`--glass-target`).
- Radios concéntricos: radio interior = radio exterior menos el padding entre ambos. Píldoras para controles, `rounded-xl` para pósteres, 34px para hojas.

---

## 7. Movimiento

- **Muelle** (`--glass-easing-spring`, 600ms) para indicadores, botones y avisos; las hojas salen con `ease-apple`.
- **Suave** (`ease-apple`, `cubic-bezier(0.16, 1, 0.3, 1)`) para entradas de pantalla (`animate-fade-in`, `animate-fade-up`) y la subida de las hojas.
- `hover:` solo existe en dispositivos con puntero (`hoverOnlyWhenSupported`), así que un toque nunca deja un estado hover pegado.
- `prefers-reduced-motion` anula animaciones y transiciones, y el crecimiento al pulsar.

---

## 8. Accesibilidad

- Contraste AA sobre el panel real; el tinte denso de hojas y avisos existe para eso.
- Foco visible: doble anillo negro y blanco en los controles de vidrio; anillo de acento en el buscador y en el resto de la página.
- Alternativas obligatorias en `glass.css`: `prefers-reduced-transparency` y `prefers-contrast: more` pasan a fondo sólido (`--glass-solid-bg`), `forced-colors` usa los colores del sistema, `prefers-reduced-motion` quita el movimiento.
- Mientras el detalle o una hoja están abiertos, la página de detrás no hace scroll (`html.is-locked`).

---

## 9. Checklist

- [ ] ¿El vidrio está solo en el cromo y nunca sobre otro vidrio?
- [ ] ¿Como mucho tres superficies de vidrio a la vez en móvil?
- [ ] ¿Un único acento por pantalla y estados con icono y texto?
- [ ] ¿Funciona en claro y oscuro, en iPhone y en escritorio?
- [ ] ¿Respeta las áreas seguras y deja sitio a la barra de pestañas?
- [ ] ¿Las cuatro alternativas de accesibilidad siguen cubriendo el componente nuevo?
