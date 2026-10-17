import { describe, expect, it, vi } from 'vitest';
import { createCountdown, restoreRemainingSeconds } from './timer';

describe('countdown', () => {
  it('publishes its initial duration and can be cancelled', () => {
    vi.useFakeTimers();
    const onTick = vi.fn();
    const countdown = createCountdown(45, onTick);

    expect(onTick).toHaveBeenCalledWith(45);
    countdown.cancel();
    vi.useRealTimers();
  });

  it('pauses on the current second and resumes from that value', () => {
    vi.useFakeTimers();
    const onTick = vi.fn();
    const countdown = createCountdown(10, onTick);

    vi.advanceTimersByTime(2250);
    countdown.pause();
    const pausedAt = countdown.getRemaining();
    expect(pausedAt).toBeLessThanOrEqual(8);
    expect(pausedAt).toBeGreaterThanOrEqual(7);

    vi.advanceTimersByTime(5000);
    expect(countdown.getRemaining()).toBe(pausedAt);

    countdown.resume();
    vi.advanceTimersByTime(pausedAt * 1000 + 250);
    expect(countdown.getRemaining()).toBe(0);
    countdown.cancel();
    vi.useRealTimers();
  });

  /**
   * Le temps continue de s'écouler quand l'application passe en arrière-plan.
   *
   * Un navigateur gèle les minuteries d'une page masquée : aucune frappe n'est
   * délivrée, mais l'horloge réelle, elle, avance. `setSystemTime` simule
   * exactement cela — du temps passe sans qu'aucun intervalle ne se déclenche.
   */
  it('continue de s’écouler quand les minuteries ont été gelées en arrière-plan', () => {
    vi.useFakeTimers();
    const ticks: number[] = [];
    const countdown = createCountdown(40, (remaining) => ticks.push(remaining));

    vi.setSystemTime(Date.now() + 12_000);
    expect(countdown.getRemaining()).toBe(40);

    expect(countdown.refresh()).toBe(28);
    expect(ticks.at(-1)).toBe(28);
    countdown.cancel();
    vi.useRealTimers();
  });

  it('détecte la fin du temps écoulé pendant l’absence', () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    const countdown = createCountdown(40, undefined, onDone);

    vi.setSystemTime(Date.now() + 60_000);
    expect(countdown.refresh()).toBe(0);
    expect(onDone).toHaveBeenCalledTimes(1);

    // Une seconde passe : la fin ne doit pas être annoncée deux fois.
    vi.setSystemTime(Date.now() + 1_000);
    countdown.refresh();
    expect(onDone).toHaveBeenCalledTimes(1);
    countdown.cancel();
    vi.useRealTimers();
  });

  it('un décompte mis en pause ne bouge pas, même après un long moment', () => {
    vi.useFakeTimers();
    const countdown = createCountdown(30);
    countdown.pause();

    vi.setSystemTime(Date.now() + 90_000);
    expect(countdown.refresh()).toBe(30);
    countdown.cancel();
    vi.useRealTimers();
  });

  it('restores elapsed time for a timer persisted while the app was open', () => {
    const now = Date.parse('2026-09-08T20:00:05.900Z');
    expect(
      restoreRemainingSeconds(
        {
          remainingSeconds: 20,
          paused: false,
          updatedAt: '2026-09-08T20:00:02.100Z',
        },
        now,
      ),
    ).toBe(17);
    expect(
      restoreRemainingSeconds(
        {
          remainingSeconds: 20,
          paused: true,
          updatedAt: '2026-09-08T20:00:02.100Z',
        },
        now,
      ),
    ).toBe(20);
  });
});
