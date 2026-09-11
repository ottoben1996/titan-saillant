/**
 * Alertes de fin de chrono : son court synthétisé (aucun fichier audio) et
 * vibration. Toutes les API sont facultatives : en cas d'absence ou de refus
 * (jsdom, navigateur sans Web Audio, mode silencieux), la fonction ne fait rien
 * et ne lève jamais d'exception.
 */

export type AlertKind = 'rest' | 'tempo';

const SOUND_KEY = 'coach-sound-enabled';

export function isSoundEnabled(): boolean {
  if (typeof localStorage === 'undefined') return true;
  return localStorage.getItem(SOUND_KEY) !== 'off';
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(SOUND_KEY, enabled ? 'on' : 'off');
}

type AudioContextCtor = new () => AudioContext;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const ctor =
    (window as Window & { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor }).AudioContext ??
    (window as Window & { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
  if (!ctor) return null;
  try {
    return new ctor();
  } catch {
    return null;
  }
}

/** Deux notes courtes : plus aiguës pour le tempo, plus graves pour le repos. */
export function playTimerChime(kind: AlertKind): void {
  if (!isSoundEnabled()) return;
  const context = getAudioContext();
  if (!context) return;

  try {
    const notes = kind === 'tempo' ? [880, 1175] : [660, 880];
    const start = context.currentTime;
    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      const noteStart = start + index * 0.18;
      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.22, noteStart + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.16);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(noteStart);
      oscillator.stop(noteStart + 0.18);
    });
    window.setTimeout(() => void context.close().catch(() => undefined), 900);
  } catch {
    /* le son est un confort, jamais un blocage */
  }
}

export function vibrateTimer(kind: AlertKind): void {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  try {
    navigator.vibrate?.(kind === 'tempo' ? [140, 90, 140] : [200, 120, 200, 120, 320]);
  } catch {
    /* identique : jamais bloquant */
  }
}

export function timerTitle(kind: AlertKind): string {
  return kind === 'tempo' ? 'Tempo terminé · Coach' : 'Repos terminé · Coach';
}
