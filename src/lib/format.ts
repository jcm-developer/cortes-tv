// Pequeñas utilidades de formato.

export function formatRuntime(min: number | null): string | null {
  if (!min || min <= 0) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export function formatVote(vote: number | null): string | null {
  if (vote === null || vote === undefined || vote <= 0) return null;
  return vote.toFixed(1);
}

export function mediaTypeLabel(t: 'movie' | 'tv'): string {
  return t === 'movie' ? 'Película' : 'Serie';
}

export function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Fecha de hoy en formato YYYY-MM-DD (para inputs date). */
export function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}
