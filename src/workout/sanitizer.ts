/**
 * Helper pur pour l'assainissement et la validation des entrées numériques.
 * Résout le problème des claviers mobiles français (virgule décimale convertie en NaN).
 */

export function parseSafeFloat(input: string | number | undefined | null, fallback = 0, min = 0, max = 500): number {
  if (input === undefined || input === null) return fallback;
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) return fallback;
    return Math.max(min, Math.min(max, Math.round(input * 100) / 100));
  }

  const trimmed = input.trim();
  if (!trimmed) return fallback;

  // Remplace la virgule française par un point décimal standard
  const normalized = trimmed.replace(',', '.');
  const parsed = parseFloat(normalized);

  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed * 100) / 100));
}

export function parseSafeInt(input: string | number | undefined | null, fallback = 0, min = 0, max = 1000): number {
  if (input === undefined || input === null) return fallback;
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) return fallback;
    return Math.max(min, Math.min(max, Math.round(input)));
  }

  const trimmed = input.trim();
  if (!trimmed) return fallback;

  const normalized = trimmed.replace(',', '.');
  const parsed = parseFloat(normalized);

  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}
