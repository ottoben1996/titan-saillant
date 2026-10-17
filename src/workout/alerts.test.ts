import { describe, expect, it, vi } from 'vitest';
import { isSoundEnabled, playTimerChime, setSoundEnabled, timerTitle, vibrateTimer } from './alerts';

describe('alertes de chrono', () => {
  it('ne lève jamais d’exception sans Web Audio (environnement de test)', () => {
    expect(() => playTimerChime('rest')).not.toThrow();
    expect(() => playTimerChime('tempo')).not.toThrow();
  });

  it('ne lève jamais d’exception sans API de vibration', () => {
    expect(() => vibrateTimer('rest')).not.toThrow();
    expect(() => vibrateTimer('tempo')).not.toThrow();
  });

  it('produit un titre de document sans emoji', () => {
    expect(timerTitle('rest')).toBe('Repos terminé · Coach');
    expect(timerTitle('tempo')).toBe('Tempo terminé · Coach');
    expect(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(timerTitle('rest'))).toBe(false);
  });

  it('mémorise la préférence de son et la respecte', () => {
    setSoundEnabled(false);
    expect(isSoundEnabled()).toBe(false);
    expect(() => playTimerChime('rest')).not.toThrow();
    setSoundEnabled(true);
    expect(isSoundEnabled()).toBe(true);
  });

  it('déclenche la vibration quand l’API existe', () => {
    const vibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
    vibrateTimer('tempo');
    expect(vibrate).toHaveBeenCalled();
  });
});
