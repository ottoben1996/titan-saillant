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

  it('restores elapsed time for a timer persisted while the app was open', () => {
    const now = Date.parse('2026-09-08T20:00:05.900Z');
    expect(restoreRemainingSeconds({
      remainingSeconds: 20,
      paused: false,
      updatedAt: '2026-09-08T20:00:02.100Z',
    }, now)).toBe(17);
    expect(restoreRemainingSeconds({
      remainingSeconds: 20,
      paused: true,
      updatedAt: '2026-09-08T20:00:02.100Z',
    }, now)).toBe(20);
  });
});
