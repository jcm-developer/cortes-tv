/**
 * Ephemeral UI state: active tab, open detail, the add-to-list sheet, settings, theme and toasts.
 *
 * Only the theme is persisted. See `docs/domains/ui.md`.
 */
import { writable } from 'svelte/store';
import type { MediaSummary, MediaType } from './types';

/** The main views; they are in-memory tabs, not routes. */
export type Tab = 'home' | 'search' | 'lists';

/** The view on screen. */
export const activeTab = writable<Tab>('home');

/** Whether the settings and backup sheet is open; it opens from the top navigation. */
export const settingsOpen = writable<boolean>(false);

/** The title the detail view shows. */
export interface DetailTarget {
  mediaType: MediaType;
  id: number;
  /** Summary already at hand, painted at once while the full detail loads. */
  preview?: MediaSummary;
}

/** The title open in the detail view, or null when it is closed. */
export const detailTarget = writable<DetailTarget | null>(null);

/**
 * Opens the detail view.
 *
 * @param t - The title to show.
 */
export function openDetail(t: DetailTarget) {
  detailTarget.set(t);
}

/** Closes the detail view. */
export function closeDetail() {
  detailTarget.set(null);
}

/** The title whose list membership the bottom sheet edits, or null when it is closed. */
export const addSheetTarget = writable<MediaSummary | null>(null);

/**
 * Opens the add-to-list sheet.
 *
 * @param s - The title to add.
 */
export function openAddSheet(s: MediaSummary) {
  addSheetTarget.set(s);
}

/** Closes the add-to-list sheet. */
export function closeAddSheet() {
  addSheetTarget.set(null);
}

// --- Theme (light / dark / system) ------------------------------------------
/** The theme choice; `system` follows `prefers-color-scheme`. */
export type Theme = 'light' | 'dark' | 'system';
const THEME_KEY = 'cortes-tv:theme';

/** Checks whether the system asks for a dark color scheme. */
function systemPrefersDark(): boolean {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Reads the stored theme.
 *
 * @return The stored theme, or `system` when none or an unknown value is stored.
 */
function readTheme(): Theme {
  if (typeof localStorage === 'undefined') return 'system';
  const t = localStorage.getItem(THEME_KEY);
  return t === 'light' || t === 'dark' || t === 'system' ? t : 'system';
}

/** The theme choice; every change is applied to the page and stored. */
export const theme = writable<Theme>(readTheme());

/**
 * Applies a theme by toggling the `dark` class on `<html>`.
 *
 * `Layout.astro` repeats this logic inline to avoid a flash before the app loads; keep both in
 * step.
 *
 * @param t - The theme to apply.
 */
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

/** Switches between light and dark, resolving `system` to the scheme on screen first. */
export function toggleTheme() {
  theme.update((t) => {
    const isDark = t === 'dark' || (t === 'system' && systemPrefersDark());
    return isDark ? 'light' : 'dark';
  });
}

/** The toast message on screen, or null. */
export const toast = writable<string | null>(null);
let toastTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Shows a toast for 2.2 seconds, replacing the one on screen.
 *
 * @param msg - The message, in Spanish.
 */
export function showToast(msg: string) {
  toast.set(msg);
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.set(null), 2200);
}
