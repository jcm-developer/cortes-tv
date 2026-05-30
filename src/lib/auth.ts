// =============================================================================
// Login de un solo usuario para un sitio estático.
// Las credenciales se definen en build mediante variables de entorno
// (PUBLIC_AUTH_USER / PUBLIC_AUTH_PASSWORD) — en .env y en los secretos de
// GitHub Actions. La sesión se guarda en localStorage SIN caducidad.
//
// ⚠️ Aviso: en un sitio estático estas credenciales viajan en el bundle del
// cliente. Esto NO es seguridad real (sirve para "cerrar la puerta", no para
// proteger datos sensibles). Para auth real haría falta un backend.
// =============================================================================
import { writable, derived } from 'svelte/store';

const USER = (import.meta.env.PUBLIC_AUTH_USER ?? '').trim();
const PASS = import.meta.env.PUBLIC_AUTH_PASSWORD ?? '';
const KEY = 'cortes-tv:session';

/** ¿Hay credenciales configuradas? Si no, el acceso es abierto. */
export const authRequired = (): boolean => Boolean(USER && PASS);

function marker(): string {
  // Marcador no criptográfico; cambia si cambia el usuario → invalida sesiones viejas.
  try {
    return btoa(`v1:${encodeURIComponent(USER)}`);
  } catch {
    return `v1:${USER}`;
  }
}

function loadSession(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    return localStorage.getItem(KEY) === marker();
  } catch {
    return false;
  }
}

export const session = writable<boolean>(loadSession());

export function login(user: string, pass: string): boolean {
  if (user.trim() === USER && pass === PASS) {
    try {
      localStorage.setItem(KEY, marker());
    } catch {
      /* ignore */
    }
    session.set(true);
    return true;
  }
  return false;
}

export function logout(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  session.set(false);
}

/** Acceso permitido: true si no se exige login, o si la sesión es válida. */
export const authed = derived(session, (s) => !authRequired() || s);
