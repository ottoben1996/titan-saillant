/**
 * Durée annoncée d'une séance.
 *
 * Le forfait de deux minutes par étape était faux d'un facteur deux sur la
 * séance cardio : la quatrième séance annonçait 28 min pour 15 min de rameur et
 * 25 min de marche. On verrouille le chiffre ici, parce qu'il se lit sur l'écran
 * d'accueil et décide si la personne a le temps de lancer la séance.
 */
import { describe, expect, it } from 'vitest';
import { getProgram } from '../../domain/programs';
import { estimatedMinutes, getNextBestAction } from './HomeScreen';

const jour = (id: string) => {
  const trouve = getProgram('ottman').days.find((item) => item.id === id);
  if (!trouve) throw new Error(`Créneau introuvable : ${id}`);
  return trouve;
};

describe('next best action', () => {
  const program = getProgram('ottman');
  it('prioritizes resuming an unfinished session', () => {
    const day = program.days[0];
    const action = getNextBestAction({
      program,
      history: [],
      activeSession: {
        id: 'active',
        profileId: 'ottman',
        dayId: day.id,
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        currentExerciseIndex: 0,
        currentSetIndex: 0,
        loggedSets: [],
      },
      measurements: [],
      now: new Date('2026-10-17T10:00:00'),
    });
    expect(action.kind).toBe('resume');
    expect(action.label).toContain('Reprendre');
  });

  it('offers the next session when no session is active', () => {
    const action = getNextBestAction({
      program,
      history: [],
      activeSession: null,
      measurements: [],
      now: new Date('2026-10-17T10:00:00'),
    });
    expect(action.kind).toBe('workout');
    if (action.kind === 'workout') expect(action.day).toBeDefined();
  });
});

describe('durée annoncée', () => {
  it('annonce la vraie durée de la séance cardio, pas la moitié', () => {
    // 15 min de rameur + 25 min de marche, plus l'échauffement et le retour.
    expect(estimatedMinutes(jour('cardio-4'))).toBeGreaterThanOrEqual(50);
  });

  it('reste dans un ordre de grandeur plausible pour les séances de force', () => {
    for (const id of ['full-body-a', 'full-body-b', 'cardio']) {
      const minutes = estimatedMinutes(jour(id));
      expect(minutes, id).toBeGreaterThan(20);
      expect(minutes, id).toBeLessThan(90);
    }
  });

  it('ne descend jamais sous une minute', () => {
    const vide = { ...jour('cardio'), exercises: [] };
    expect(estimatedMinutes(vide)).toBeGreaterThanOrEqual(1);
  });
});
