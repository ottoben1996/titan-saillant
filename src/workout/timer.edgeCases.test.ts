import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCountdown, restoreRemainingSeconds } from './timer';

afterEach(() => {
  vi.useRealTimers();
});

describe('restoreRemainingSeconds — cas limites', () => {
  const now = Date.parse('2026-09-08T20:00:10.000Z');

  it('décompte le temps écoulé depuis la dernière mise à jour', () => {
    expect(restoreRemainingSeconds(
      { remainingSeconds: 20, paused: false, updatedAt: '2026-09-08T20:00:05.000Z' },
      now,
    )).toBe(15);
  });

  it('ne descend jamais sous zéro quand le temps écoulé dépasse le restant', () => {
    expect(restoreRemainingSeconds(
      { remainingSeconds: 5, paused: false, updatedAt: '2026-09-08T20:00:00.000Z' },
      now,
    )).toBe(0);
  });

  it('renvoie zéro pour un restant négatif, en pause ou non', () => {
    expect(restoreRemainingSeconds(
      { remainingSeconds: -12, paused: true, updatedAt: '2026-09-08T20:00:05.000Z' },
      now,
    )).toBe(0);
    expect(restoreRemainingSeconds(
      { remainingSeconds: -12, paused: false, updatedAt: '2026-09-08T20:00:05.000Z' },
      now,
    )).toBe(0);
  });

  it('renvoie zéro pour un restant à zéro', () => {
    expect(restoreRemainingSeconds(
      { remainingSeconds: 0, paused: false, updatedAt: '2026-09-08T20:00:00.000Z' },
      now,
    )).toBe(0);
  });

  it('ne pénalise pas une horloge en avance (updatedAt dans le futur)', () => {
    expect(restoreRemainingSeconds(
      { remainingSeconds: 30, paused: false, updatedAt: '2026-09-08T20:01:00.000Z' },
      now,
    )).toBe(30);
  });

  it('ignore le temps écoulé quand le chrono est en pause', () => {
    expect(restoreRemainingSeconds(
      { remainingSeconds: 18, paused: true, updatedAt: '2026-09-08T20:00:00.000Z' },
      now,
    )).toBe(18);
  });

  it('reste fini (pas de NaN) face à une date corrompue', () => {
    const restored = restoreRemainingSeconds(
      { remainingSeconds: 30, paused: false, updatedAt: 'pas-une-date' },
      now,
    );
    expect(Number.isFinite(restored)).toBe(true);
    expect(restored).toBe(30);
  });
});

describe('createCountdown — cas limites', () => {
  it('publie la durée initiale, décrémente puis appelle onDone une seule fois', () => {
    vi.useFakeTimers();
    const onTick = vi.fn();
    const onDone = vi.fn();
    const countdown = createCountdown(3, onTick, onDone);

    expect(onTick).toHaveBeenCalledWith(3);
    vi.advanceTimersByTime(1000);
    expect(countdown.getRemaining()).toBe(2);

    vi.advanceTimersByTime(2500);
    expect(countdown.getRemaining()).toBe(0);
    expect(onDone).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(5000);
    expect(onDone).toHaveBeenCalledTimes(1);

    countdown.cancel();
  });

  it('termine immédiatement un chrono de durée nulle', () => {
    vi.useFakeTimers();
    const onTick = vi.fn();
    const onDone = vi.fn();
    const countdown = createCountdown(0, onTick, onDone);

    expect(onTick).toHaveBeenCalledWith(0);
    expect(countdown.getRemaining()).toBe(0);
    vi.advanceTimersByTime(250);
    expect(onDone).toHaveBeenCalledTimes(1);

    countdown.cancel();
  });

  it('ne publie jamais de valeur négative pour une durée négative', () => {
    vi.useFakeTimers();
    const ticks: number[] = [];
    const onDone = vi.fn();
    const countdown = createCountdown(-5, (remaining) => ticks.push(remaining), onDone);

    expect(ticks.every((value) => value >= 0)).toBe(true);
    expect(ticks[0]).toBe(0);
    expect(countdown.getRemaining()).toBe(0);

    vi.advanceTimersByTime(250);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(countdown.getRemaining()).toBe(0);

    countdown.cancel();
  });

  it('gèle le décompte en pause puis le reprend au même niveau', () => {
    vi.useFakeTimers();
    const ticks: number[] = [];
    const countdown = createCountdown(10, (remaining) => ticks.push(remaining));

    vi.advanceTimersByTime(2000);
    countdown.pause();
    const held = countdown.getRemaining();
    expect(held).toBe(8);

    vi.advanceTimersByTime(60000);
    expect(countdown.getRemaining()).toBe(held);
    expect(ticks.at(-1)).toBe(held);

    countdown.resume();
    vi.advanceTimersByTime(8000);
    expect(countdown.getRemaining()).toBe(0);

    countdown.cancel();
  });

  it('arrête définitivement les ticks après cancel', () => {
    vi.useFakeTimers();
    const onTick = vi.fn();
    const countdown = createCountdown(30, onTick);

    vi.advanceTimersByTime(1000);
    countdown.cancel();
    const callsAfterCancel = onTick.mock.calls.length;

    vi.advanceTimersByTime(10000);
    expect(onTick.mock.calls.length).toBe(callsAfterCancel);
    expect(countdown.getRemaining()).toBe(29);
  });
});
