import type { SessionTimerState } from '../domain/types';

export interface CountdownController {
  pause(): void;
  resume(): void;
  cancel(): void;
  getRemaining(): number;
  /**
   * Recalcule le restant à partir de l'horloge, tout de suite.
   *
   * Un navigateur gèle les minuteries d'une page en arrière-plan : au retour,
   * la première frappe peut arriver en retard. Comme le décompte s'appuie sur
   * une échéance absolue, un recalcul immédiat redonne le bon temps écoulé —
   * et déclenche la fin si le temps s'est écoulé pendant l'absence.
   */
  refresh(): number;
}

export function restoreRemainingSeconds(
  state: Pick<SessionTimerState, 'remainingSeconds' | 'paused' | 'updatedAt'>,
  now = Date.now(),
) {
  if (state.paused) return Math.max(0, state.remainingSeconds);
  const updatedAtMs = Date.parse(state.updatedAt);
  // Une date corrompue (sauvegarde importée, données partielles) donnerait NaN :
  // on retombe sur le restant enregistré plutôt que de casser l'affichage.
  if (!Number.isFinite(updatedAtMs)) return Math.max(0, state.remainingSeconds);
  const elapsedSeconds = Math.max(0, Math.floor((now - updatedAtMs) / 1000));
  return Math.max(0, state.remainingSeconds - elapsedSeconds);
}

export function createCountdown(
  durationSeconds: number,
  onTick?: (remaining: number) => void,
  onDone?: () => void,
): CountdownController {
  let end = Date.now() + durationSeconds * 1000;
  let paused = false;
  let finished = false;
  let remaining = Math.max(0, durationSeconds);
  onTick?.(remaining);

  const tick = () => {
    if (paused || finished) return remaining;
    remaining = Math.max(0, Math.ceil((end - Date.now()) / 1000));
    onTick?.(remaining);
    if (remaining === 0) {
      finished = true;
      window.clearInterval(timer);
      onDone?.();
    }
    return remaining;
  };

  const timer = window.setInterval(tick, 250);

  return {
    pause() {
      if (!paused) {
        remaining = Math.max(0, Math.ceil((end - Date.now()) / 1000));
        paused = true;
      }
    },
    resume() {
      if (paused) {
        end = Date.now() + remaining * 1000;
        paused = false;
      }
    },
    cancel() {
      window.clearInterval(timer);
    },
    getRemaining() {
      return remaining;
    },
    refresh() {
      return tick();
    },
  };
}
