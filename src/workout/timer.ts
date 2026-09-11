import type { SessionTimerState } from '../domain/types';

export interface CountdownController { pause(): void; resume(): void; cancel(): void; getRemaining(): number; }

export function restoreRemainingSeconds(state: Pick<SessionTimerState, 'remainingSeconds' | 'paused' | 'updatedAt'>, now = Date.now()) {
  if (state.paused) return Math.max(0, state.remainingSeconds);
  const updatedAtMs = Date.parse(state.updatedAt);
  // Une date corrompue (sauvegarde importée, données partielles) donnerait NaN :
  // on retombe sur le restant enregistré plutôt que de casser l'affichage.
  if (!Number.isFinite(updatedAtMs)) return Math.max(0, state.remainingSeconds);
  const elapsedSeconds = Math.max(0, Math.floor((now - updatedAtMs) / 1000));
  return Math.max(0, state.remainingSeconds - elapsedSeconds);
}

export function createCountdown(durationSeconds: number, onTick?: (remaining: number) => void, onDone?: () => void): CountdownController {
  let end = Date.now() + durationSeconds * 1000; let paused = false; let remaining = Math.max(0, durationSeconds);
  onTick?.(remaining);
  let timer = window.setInterval(() => {
    if (paused) return; remaining = Math.max(0, Math.ceil((end - Date.now()) / 1000)); onTick?.(remaining);
    if (remaining === 0) { window.clearInterval(timer); onDone?.(); }
  }, 250);
  return { pause() { if (!paused) { remaining = Math.max(0, Math.ceil((end - Date.now()) / 1000)); paused = true; } }, resume() { if (paused) { end = Date.now() + remaining * 1000; paused = false; } }, cancel() { window.clearInterval(timer); }, getRemaining() { return remaining; } };
}
