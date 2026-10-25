/**
 * Ephemeral UI state: active tab, open detail, the title sheet, settings, theme and toasts.
 *
 * Only the theme is persisted. See `docs/domains/ui.md`.
 */
import { writable, get } from 'svelte/store';
import type { MediaSummary, MediaType, TitleStatus } from './types';

/** The main views; they are in-memory tabs, not routes. */
export type Tab = 'home' | 'search' | 'library';

/** The view on screen. */
export const activeTab = writable<Tab>('home');

/** The library segment on screen, so other views can open the library on one of them. */
export const librarySegment = writable<TitleStatus>('pending');

/**
 * Shows a tab; pressing the tab already on screen scrolls back to the top, as on iOS.
 *
 * @param tab - The tab to show.
 */
export function selectTab(tab: Tab) {
  if (get(activeTab) === tab) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  activeTab.set(tab);
  window.scrollTo({ top: 0 });
}

/**
 * Opens the library on one segment.
 *
 * @param segment - Pending or watched.
 */
export function openLibrary(segment: TitleStatus) {
  librarySegment.set(segment);
  activeTab.set('library');
}

/** Whether the settings and backup sheet is open; it opens from the button in the top bar. */
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

/** Whether the open detail pushed a history entry that a close must pop. */
let detailPushed = false;

/**
 * Opens the detail view, or swaps the title when it is already open.
 *
 * The first open pushes one history entry so the browser and iOS back gesture close it.
 *
 * @param t - The title to show.
 */
export function openDetail(t: DetailTarget) {
  if (!get(detailTarget) && typeof history !== 'undefined') {
    history.pushState({ detail: true }, '');
    detailPushed = true;
  }
  detailTarget.set(t);
}

/** Closes the detail view, popping the history entry it pushed. */
export function closeDetail() {
  if (detailPushed) {
    // The `popstate` handler (`onHistoryBack`) clears the target.
    history.back();
  } else {
    detailTarget.set(null);
  }
}

/** Handles a browser back navigation: closes the detail view. */
export function onHistoryBack() {
  detailPushed = false;
  detailTarget.set(null);
}

/** The title whose library status the bottom sheet edits, or null when it is closed. */
export const titleSheetTarget = writable<MediaSummary | null>(null);

/**
 * Opens the title sheet (status, rating, remove).
 *
 * @param s - The title.
 */
export function openTitleSheet(s: MediaSummary) {
  titleSheetTarget.set(s);
}

/** Closes the title sheet. */
export function closeTitleSheet() {
  titleSheetTarget.set(null);
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

/** Whether the dark scheme is on screen, after resolving `system`; `applyTheme` keeps it current. */
export const darkActive = writable<boolean>(false);

/** Switches to the scheme not on screen, as an explicit choice (the top bar toggle). */
export function toggleTheme() {
  theme.set(get(darkActive) ? 'light' : 'dark');
}

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
  darkActive.set(dark);
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

/** An optional button in a toast, such as "Deshacer". */
export interface ToastAction {
  label: string;
  run: () => void;
}

/** The toast on screen, or null. */
export const toast = writable<{ message: string; action?: ToastAction } | null>(null);
let toastTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Shows a toast, replacing the one on screen.
 *
 * It stays 2.2 seconds, or 4 seconds when it carries an action so there is time to press it.
 *
 * @param message - The message, in Spanish.
 * @param action - An optional button; pressing it runs the action and hides the toast.
 */
export function showToast(message: string, action?: ToastAction) {
  toast.set({ message, action });
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.set(null), action ? 4000 : 2200);
}

/** Hides the toast on screen. */
export function hideToast() {
  if (toastTimer) clearTimeout(toastTimer);
  toast.set(null);
}
