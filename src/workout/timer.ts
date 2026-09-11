import type { SessionTimerState } from '../domain/types';

export interface CountdownController { pause(): void; resume(): void; cancel(): void; getRemaining(): number; }

export function restoreRemainingSeconds(state: Pick<SessionTimerState, 'remainingSeconds' | 'paused' | 'updatedAt'>, now = Date.now()) {
  if (state.paused) return Math.max(0, state.remainingSeconds);
  const elapsedSeconds = Math.max(0, Math.floor((now - Date.parse(state.updatedAt)) / 1000));
  return Math.max(0, state.remainingSeconds - elapsedSeconds);
}

export function createCountdown(durationSeconds: number, onTick?: (remaining: number) => void, onDone?: () => void): CountdownController {
  let end = Date.now() + durationSeconds * 1000; let paused = false; let remaining = durationSeconds;
  onTick?.(remaining);
  let timer = window.setInterval(() => {
    if (paused) return; remaining = Math.max(0, Math.ceil((end - Date.now()) / 1000)); onTick?.(remaining);
    if (remaining === 0) { window.clearInterval(timer); onDone?.(); }
  }, 250);
  return { pause() { if (!paused) { remaining = Math.max(0, Math.ceil((end - Date.now()) / 1000)); paused = true; } }, resume() { if (paused) { end = Date.now() + remaining * 1000; paused = false; } }, cancel() { window.clearInterval(timer); }, getRemaining() { return remaining; } };
}
