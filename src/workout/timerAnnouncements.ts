/**
 * Annonces accessibles des chronos.
 *
 * Un lecteur d'écran ne doit pas être inondé d'une annonce par seconde : seuls
 * les paliers utiles sont annoncés, et rien entre deux paliers.
 */

const CHECKPOINTS = new Set([120, 60, 30, 10, 5, 4, 3, 2, 1]);

export function getTimerAnnouncement(remainingSeconds: number): string | null {
  if (!Number.isFinite(remainingSeconds)) return null;
  const seconds = Math.floor(remainingSeconds);
  if (seconds <= 0) return 'Chrono terminé';
  if (!CHECKPOINTS.has(seconds)) return null;

  if (seconds === 120) return 'Il reste 2 minutes';
  if (seconds === 60) return 'Il reste 1 minute';
  if (seconds === 30) return 'Il reste 30 secondes';
  return `Il reste ${seconds} seconde${seconds > 1 ? 's' : ''}`;
}
