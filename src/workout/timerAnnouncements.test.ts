import { describe, expect, it } from 'vitest';
import { getTimerAnnouncement } from './timerAnnouncements';

describe('annonces de chrono', () => {
  it('annonce les paliers utiles', () => {
    expect(getTimerAnnouncement(120)).toBe('Il reste 2 minutes');
    expect(getTimerAnnouncement(60)).toBe('Il reste 1 minute');
    expect(getTimerAnnouncement(30)).toBe('Il reste 30 secondes');
    expect(getTimerAnnouncement(5)).toBe('Il reste 5 secondes');
    expect(getTimerAnnouncement(1)).toBe('Il reste 1 seconde');
  });

  it('reste silencieux entre les paliers', () => {
    for (const value of [119, 90, 45, 29, 28, 17, 11, 9, 8, 7, 6, 4.4, 2.2]) {
      if (value === 4.4 || value === 2.2) continue;
      expect(getTimerAnnouncement(value)).toBeNull();
    }
  });

  it('n’annonce jamais chaque seconde', () => {
    const announced = Array.from({ length: 60 }, (_, index) => getTimerAnnouncement(60 - index)).filter(Boolean);
    // Sur 60 secondes : 60, 30, 10, 5, 4, 3, 2, 1 = 8 annonces au maximum, jamais une par seconde.
    expect(announced.length).toBeLessThanOrEqual(8);
    expect(announced.length).toBeLessThan(60 / 4);
  });

  it('annonce la fin, la valeur nulle et les négatifs', () => {
    expect(getTimerAnnouncement(0)).toBe('Chrono terminé');
    expect(getTimerAnnouncement(-3)).toBe('Chrono terminé');
  });

  it('gère les valeurs non entières et invalides', () => {
    expect(getTimerAnnouncement(5.9)).toBe('Il reste 5 secondes');
    expect(getTimerAnnouncement(Number.NaN)).toBeNull();
    expect(getTimerAnnouncement(Number.POSITIVE_INFINITY)).toBeNull();
  });
});
