# DESIGN.md

Sistema de diseño para una aplicación con estética **Apple** (lenguaje *Human Interface* / *Liquid Glass*), apoyada en **glassmorphism** y construida con **Tailwind CSS**. Sirve como única fuente de verdad para tipografía, color, profundidad, movimiento y componentes.

---

## 1. Principios

1. **Claridad.** El contenido manda; la interfaz desaparece. Negativos generosos, jerarquía tipográfica nítida, nada decorativo sin función.
2. **Deferencia.** El cromo de la UI es traslúcido y secundario: deja respirar al contenido. El vidrio toma color de lo que tiene detrás, no al revés.
3. **Profundidad.** Capas translúcidas, desenfoque y sombras suaves comunican jerarquía espacial en lugar de bordes duros.
4. **Consistencia.** Un único set de tokens (radios, sombras, espaciado, color) reutilizado en todo. Si algo necesita un valor nuevo, primero se evalúa si encaja en la escala.
5. **Movimiento con intención.** Animaciones tipo *spring*, cortas y suaves. Nunca lineales ni abruptas. El movimiento refuerza causa-efecto, no entretiene.

---

## 2. Tipografía

Apple usa **SF Pro**. En web no se puede redistribuir, así que se usa el *system font stack* (que ya resuelve a SF en dispositivos Apple) con buenas alternativas para el resto.

```css
/* Stack tipográfico */
font-family:
  -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display",
  "Segoe UI", system-ui, "Helvetica Neue", Arial, sans-serif;
```

> Alternativa web libre muy cercana: **Inter** (texto) o **General Sans** / **Geist** (display). Si necesitas un look fiel, valora una licencia de SF o usa el stack del sistema sin webfont.

**Reglas de oro**

- **Pesos:** usa solo 3–4 (`400` regular, `500` medium, `600` semibold, `700` bold). El medium/semibold es la firma de Apple.
- **Tracking negativo en títulos.** Cuanto más grande el texto, más apretado: `tracking-tight` / `tracking-tighter` en headings; tracking normal o ligeramente positivo en *captions*.
- **Interlineado holgado** en cuerpo (`leading-relaxed`), ajustado en titulares (`leading-tight`).
- **Tamaños en `rem`**, no en `px`, para respetar accesibilidad.

### Escala tipográfica

| Rol            | Clase Tailwind                                | Uso                          |
|----------------|-----------------------------------------------|------------------------------|
| Large Title    | `text-5xl font-bold tracking-tighter`         | Hero, pantalla de bienvenida |
| Title 1        | `text-4xl font-bold tracking-tight`           | Cabeceras de sección         |
| Title 2        | `text-3xl font-semibold tracking-tight`       | Subsecciones                 |
| Title 3        | `text-2xl font-semibold tracking-tight`       | Tarjetas, módulos            |
| Headline       | `text-lg font-semibold`                       | Énfasis de fila/lista        |
| Body           | `text-base font-normal leading-relaxed`       | Texto principal              |
| Callout        | `text-[15px] font-normal`                     | Texto secundario             |
| Subheadline    | `text-sm font-normal text-neutral-500`        | Apoyo                        |
| Footnote       | `text-xs font-normal text-neutral-500`        | Notas                        |
| Caption        | `text-[11px] font-medium uppercase tracking-wide text-neutral-400` | Etiquetas |

---

## 3. Color

Paleta neutra y luminosa con **un acento vibrante**. El acento se reserva para acción primaria; el resto es escala de grises. Evita degradados morados sobre blanco y cualquier cliché "AI".

### Tokens (CSS variables)

```css
:root {
  /* Acento (System Blue de Apple) */
  --accent: 211 100% 50%;        /* #007AFF */
  --accent-hover: 211 100% 45%;

  /* Superficies (modo claro) */
  --bg: 0 0% 96%;                /* fondo de app, gris cálido */
  --surface: 0 0% 100%;          /* tarjetas sólidas */
  --text: 0 0% 9%;
  --text-muted: 0 0% 45%;
  --border: 0 0% 0% / 0.08;

  /* Vidrio */
  --glass-bg: 255 255 255 / 0.55;
  --glass-border: 255 255 255 / 0.6;
}

.dark {
  --bg: 0 0% 7%;
  --surface: 0 0% 12%;
  --text: 0 0% 98%;
  --text-muted: 0 0% 60%;
  --border: 255 255 255 / 0.1;

  --glass-bg: 30 30 30 / 0.5;
  --glass-border: 255 255 255 / 0.12;
}
```

### Colores de sistema Apple (acentos alternativos)

| Nombre  | Hex        | Nombre  | Hex        |
|---------|------------|---------|------------|
| Blue    | `#007AFF`  | Red     | `#FF3B30`  |
| Green   | `#34C759`  | Orange  | `#FF9500`  |
| Indigo  | `#5856D6`  | Pink    | `#FF2D55`  |
| Teal    | `#30B0C7`  | Yellow  | `#FFCC00`  |

**Regla:** un solo acento dominante por pantalla. Los demás solo para estados semánticos (error = red, éxito = green).

---

## 4. Glassmorphism (Liquid Glass)

El efecto vidrio es la firma visual. Se construye con **fondo semitransparente + `backdrop-blur` + borde claro sutil + sombra suave**, y *siempre* sobre un fondo con contenido o color (el vidrio sobre blanco plano no se ve).

### Receta base

```html
<div class="
  bg-white/55 dark:bg-neutral-900/50
  backdrop-blur-xl backdrop-saturate-150
  border border-white/60 dark:border-white/10
  shadow-[0_8px_32px_rgba(0,0,0,0.08)]
  rounded-3xl
">
  <!-- contenido -->
</div>
```

**Anatomía del vidrio**

- **Transparencia:** entre `40%` y `65%` de opacidad (`/40`–`/65`). Demasiado opaco pierde el efecto; demasiado transparente pierde legibilidad.
- **Blur:** `backdrop-blur-xl` (24px) para paneles, `backdrop-blur-md` para barras finas. Acompaña con `backdrop-saturate-150` para que los colores de detrás "florezcan" (clave en el look Apple).
- **Borde luminoso:** borde blanco a `60%` arriba; en oscuro un blanco al `10–12%`. Simula el canto biselado del cristal.
- **Sombra:** difusa y baja opacidad. La profundidad viene del blur, no de sombras duras.
- **Radios grandes:** `rounded-2xl`/`rounded-3xl`. El vidrio Apple nunca tiene esquinas vivas.

> Requiere un fondo interesante detrás: un degradado de malla, una foto difuminada o blobs de color. Añade una capa de **fondo atmosférico** a la app para que el vidrio tenga algo que refractar.

### Fondo recomendado para que luzca el vidrio

```html
<div class="fixed inset-0 -z-10 bg-neutral-100 dark:bg-neutral-950">
  <div class="absolute -top-32 -left-20 h-96 w-96 rounded-full
              bg-blue-400/40 blur-3xl"></div>
  <div class="absolute top-40 right-0 h-96 w-96 rounded-full
              bg-pink-400/30 blur-3xl"></div>
  <div class="absolute bottom-0 left-1/3 h-96 w-96 rounded-full
              bg-indigo-400/30 blur-3xl"></div>
</div>
```

---

## 5. Espaciado y layout

- **Base 4px** (la escala nativa de Tailwind ya lo es). Apóyate en `2 / 3 / 4 / 6 / 8 / 12 / 16 / 24`.
- **Aire generoso.** Padding interno mínimo `p-4` en tarjetas pequeñas, `p-6`–`p-8` en paneles.
- **Ancho de lectura** del contenido principal: `max-w-prose` o `max-w-2xl`. Layouts amplios con `max-w-5xl`/`max-w-7xl` centrados.
- **Ritmo vertical** entre secciones: `space-y-6` dentro de módulos, `space-y-12`–`space-y-16` entre bloques mayores.
- **Toque mínimo 44×44px** en cualquier control interactivo (accesibilidad táctil Apple). Usa `min-h-11 min-w-11`.

---

## 6. Radios, bordes y elevación

```js
// Radios
rounded-lg   // 8px  — inputs, chips
rounded-xl   // 12px — botones
rounded-2xl  // 16px — tarjetas
rounded-3xl  // 24px — paneles, modales, hojas
rounded-full // pills, avatares, FAB
```

**Sombras (sistema de elevación)**

| Nivel | Token | Tailwind | Uso |
|-------|-------|----------|-----|
| 0 | plano | `shadow-none` | Sobre superficie |
| 1 | sutil | `shadow-[0_1px_3px_rgba(0,0,0,0.06)]` | Tarjetas en reposo |
| 2 | medio | `shadow-[0_8px_32px_rgba(0,0,0,0.08)]` | Vidrio, popovers |
| 3 | alto | `shadow-[0_20px_60px_rgba(0,0,0,0.15)]` | Modales, hojas |

Sombras siempre suaves, frías y de baja opacidad. Nunca negras al 50%.

---

## 7. Movimiento

- **Curvas tipo Apple:** `cubic-bezier(0.32, 0.72, 0, 1)` para entradas/salidas suaves. Para micro-interacciones, *spring*.
- **Duraciones:** `150ms` hover, `250–350ms` transiciones de capa, `400–500ms` aparición de modales/hojas.
- **Hover/press:** escala sutil `hover:scale-[1.02] active:scale-[0.98]` + `transition-transform`.
- **Entrada de pantalla:** *fade + slide-up* con `animation-delay` escalonado (10–60ms entre elementos) para un *staggered reveal*.
- **Respeta `prefers-reduced-motion`**: desactiva transforms y deja solo opacidad.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
```

---

## 8. Configuración de Tailwind

`tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        accent: 'hsl(var(--accent) / <alpha-value>)',
        'accent-hover': 'hsl(var(--accent-hover) / <alpha-value>)',
        surface: 'hsl(var(--surface) / <alpha-value>)',
      },
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"',
          '"SF Pro Display"', '"Segoe UI"', 'system-ui', 'sans-serif',
        ],
      },
      borderRadius: { '4xl': '2rem' },
      backdropBlur: { xs: '2px' },
      transitionTimingFunction: {
        'apple': 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0,0,0,0.08)',
        'sheet': '0 20px 60px rgba(0,0,0,0.15)',
      },
      keyframes: {
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.32,0.72,0,1) both',
      },
    },
  },
  plugins: [],
}
```

Y una clase utilitaria reutilizable en tu CSS global:

```css
@layer components {
  .glass {
    @apply bg-white/55 dark:bg-neutral-900/50
           backdrop-blur-xl backdrop-saturate-150
           border border-white/60 dark:border-white/10
           shadow-glass rounded-3xl;
  }
}
```

---

## 9. Componentes de referencia

### Botón primario

```html
<button class="inline-flex items-center justify-center gap-2
  min-h-11 px-5 rounded-xl
  bg-accent text-white font-semibold
  shadow-[0_4px_14px_hsl(var(--accent)/0.4)]
  transition-all duration-150 ease-apple
  hover:bg-accent-hover hover:scale-[1.02]
  active:scale-[0.98]
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50">
  Continuar
</button>
```

### Botón secundario (vidrio)

```html
<button class="glass min-h-11 px-5 !rounded-xl
  font-medium text-neutral-800 dark:text-neutral-100
  transition-transform duration-150 ease-apple
  hover:scale-[1.02] active:scale-[0.98]">
  Cancelar
</button>
```

### Tarjeta

```html
<div class="glass p-6 animate-fade-up">
  <h3 class="text-2xl font-semibold tracking-tight">Título</h3>
  <p class="mt-2 text-base leading-relaxed text-neutral-600 dark:text-neutral-300">
    Contenido de la tarjeta con tipografía cómoda y aire suficiente.
  </p>
</div>
```

### Barra de navegación flotante

```html
<nav class="glass !rounded-2xl
  fixed top-4 inset-x-4 z-50
  flex items-center justify-between
  h-14 px-5 backdrop-blur-md">
  <span class="font-semibold tracking-tight">App</span>
  <div class="flex items-center gap-6 text-sm text-neutral-600 dark:text-neutral-300">
    <a class="hover:text-accent transition-colors" href="#">Inicio</a>
    <a class="hover:text-accent transition-colors" href="#">Ajustes</a>
  </div>
</nav>
```

### Modal / hoja

```html
<div class="fixed inset-0 z-50 grid place-items-center
            bg-black/20 backdrop-blur-sm">
  <div class="glass !rounded-4xl shadow-sheet p-8 w-full max-w-md
              animate-fade-up">
    <h2 class="text-3xl font-bold tracking-tight">Confirmar</h2>
    <p class="mt-3 text-neutral-600 dark:text-neutral-300">¿Seguro que quieres continuar?</p>
    <div class="mt-8 flex gap-3 justify-end">
      <button class="glass !rounded-xl min-h-11 px-5 font-medium">Cancelar</button>
      <button class="bg-accent text-white font-semibold min-h-11 px-5 rounded-xl">Aceptar</button>
    </div>
  </div>
</div>
```

### Campo de texto

```html
<input type="text" placeholder="Buscar"
  class="w-full min-h-11 px-4 rounded-xl
  bg-white/70 dark:bg-neutral-800/60 backdrop-blur
  border border-black/5 dark:border-white/10
  text-base placeholder:text-neutral-400
  focus:outline-none focus:ring-2 focus:ring-accent/50
  transition" />
```

---

## 10. Accesibilidad

- **Contraste:** el vidrio reduce contraste. Verifica AA (4.5:1) del texto sobre el panel real, no sobre el fondo ideal. Si falla, sube la opacidad del vidrio o añade una capa sólida tras el texto.
- **Foco visible siempre:** `focus-visible:ring-2 ring-accent/50`. Nunca elimines el outline sin sustituto.
- **Objetivos táctiles** ≥ 44px (`min-h-11`).
- **`prefers-reduced-motion`** y **`prefers-color-scheme`** respetados.
- **Texto escalable:** tamaños en `rem`; no fijes alturas que rompan con *Dynamic Type* / zoom.
- **No depender solo del color** para transmitir estado (añade icono o texto).

---

## 11. Checklist antes de enviar

- [ ] ¿Hay un fondo atmosférico detrás del vidrio para que refracte?
- [ ] ¿Un único acento dominante por pantalla?
- [ ] ¿Pesos tipográficos limitados (≤4) y tracking negativo en títulos?
- [ ] ¿Radios grandes y consistentes con la escala?
- [ ] ¿Sombras suaves y frías, sin negros duros?
- [ ] ¿Transiciones con curva `ease-apple` y press/hover sutil?
- [ ] ¿Contraste AA verificado sobre el panel translúcido real?
- [ ] ¿Foco visible y objetivos táctiles ≥44px?
- [ ] ¿Funciona en claro y oscuro?
- [ ] ¿`prefers-reduced-motion` respetado?