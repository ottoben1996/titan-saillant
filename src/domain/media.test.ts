import { describe, expect, it } from 'vitest';
import { exerciseMedia } from './media';

describe('local exercise illustrations', () => {
  it('keeps embedded RepDB media local and attributed', () => {
    const legPress = exerciseMedia['presse-cuisses-inclinee'];
    expect(legPress.start).toBe('/exercise-media/leg-press-start.webp');
    expect(legPress.peak).toBe('/exercise-media/leg-press-peak.webp');
    expect(legPress.credit).toBe('Exercise data by RepDB (repdb.co)');
  });

  it('does not pretend every prescribed machine has an exact visual match', () => {
    expect(exerciseMedia['squat-smith']).toBeUndefined();
    expect(exerciseMedia.skierg).toBeUndefined();
    expect(exerciseMedia['sit-to-stand']).toBeUndefined();
  });
});
