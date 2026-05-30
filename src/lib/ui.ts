// Estado de UI efímero (no se persiste): vista activa, detalle abierto,
// hoja "añadir a lista" y toasts.
import { writable } from 'svelte/store';
import type { MediaSummary, MediaType } from './types';

export type Tab = 'home' | 'search' | 'lists';

export const activeTab = writable<Tab>('home');

/** Hoja de ajustes / copias de seguridad (global, abierta desde el menú). */
export const settingsOpen = writable<boolean>(false);

export interface DetailTarget {
  mediaType: MediaType;
  id: number;
  /** título/poster opcional para pintar de inmediato mientras carga el detalle */
  preview?: MediaSummary;
}

export const detailTarget = writable<DetailTarget | null>(null);
export function openDetail(t: DetailTarget) {
  detailTarget.set(t);
}
export function closeDetail() {
  detailTarget.set(null);
}

/** Hoja inferior para elegir en qué listas está un título. */
export const addSheetTarget = writable<MediaSummary | null>(null);
export function openAddSheet(s: MediaSummary) {
  addSheetTarget.set(s);
}
export function closeAddSheet() {
  addSheetTarget.set(null);
}

// --- Tema (claro / oscuro / sistema) ----------------------------------------
export type Theme = 'light' | 'dark' | 'system';
const THEME_KEY = 'cortes-tv:theme';

function systemPrefersDark(): boolean {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;
}

function readTheme(): Theme {
  if (typeof localStorage === 'undefined') return 'system';
  const t = localStorage.getItem(THEME_KEY);
  return t === 'light' || t === 'dark' || t === 'system' ? t : 'system';
}

export const theme = writable<Theme>(readTheme());

/** Aplica la clase .dark al <html> según el tema elegido. */
export function applyTheme(t: Theme) {
  if (typeof document === 'undefined') return;
  const dark = t === 'dark' || (t === 'system' && systemPrefersDark());
  document.documentElement.classList.toggle('dark', dark);
}

theme.subscribe((t) => {
  applyTheme(t);
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {
      /* ignore */
    }
  }
});

/** Alterna claro ↔ oscuro (resolviendo "system" al estado actual). */
export function toggleTheme() {
  theme.update((t) => {
    const isDark = t === 'dark' || (t === 'system' && systemPrefersDark());
    return isDark ? 'light' : 'dark';
  });
}

/** Toast simple. */
export const toast = writable<string | null>(null);
let toastTimer: ReturnType<typeof setTimeout> | null = null;
export function showToast(msg: string) {
  toast.set(msg);
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.set(null), 2200);
}
