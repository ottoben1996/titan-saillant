import { describe, expect, it } from 'vitest';
import { getProgram } from '../domain/programs';
import type { WorkoutSession } from '../domain/types';
import { serieAssiduite } from './assiduite';

const JOUR = 86_400_000;
const maintenant = new Date(2026, 8, 12, 9, 0, 0); // samedi 12 septembre 2026
const programme = getProgram('ottman'); // trois jours : Full Body A, B et Cardio

/** Séance terminée à tant de jours en arrière. */
const seance = (jours: number, id: string): WorkoutSession =>
  ({
    id,
    profileId: 'ottman',
    dayId: 'full-body-a',
    sequenceVersion: 2,
    startedAt: new Date(maintenant.getTime() - jours * JOUR).toISOString(),
    completedAt: new Date(maintenant.getTime() - jours * JOUR).toISOString(),
    updatedAt: new Date(maintenant.getTime() - jours * JOUR).toISOString(),
    currentExerciseIndex: 0,
    currentSetIndex: 0,
    loggedSets: [],
  }) as WorkoutSession;

/** Trois séances dans la semaine qui commence à `jours` en arrière. */
const semaineComplete = (jours: number, marque: string) => [
  seance(jours, `${marque}-1`),
  seance(jours + 2, `${marque}-2`),
  seance(jours + 4, `${marque}-3`),
];

describe('série d’assiduité', () => {
  it('compte les semaines complètes consécutives', () => {
    const historique = [
      ...semaineComplete(1, 'cette'),
      ...semaineComplete(8, 'avant'),
      ...semaineComplete(15, 'encore'),
    ];
    const serie = serieAssiduite(historique, programme, maintenant);

    expect(serie.semainesConsecutives).toBe(3);
    expect(serie.seancesFaites).toBe(9);
    expect(serie.semaines).toHaveLength(8);
  });

  it('ne casse pas la série quand la semaine en cours n’est pas finie', () => {
    // Une seule séance cette semaine, les deux précédentes complètes.
    const historique = [seance(1, 'cette-1'), ...semaineComplete(8, 'avant'), ...semaineComplete(15, 'encore')];
    const serie = serieAssiduite(historique, programme, maintenant);

    expect(serie.semaines.at(-1)?.faite).toBe(false);
    expect(serie.semainesConsecutives).toBe(2);
  });

  it('s’arrête à la première semaine incomplète', () => {
    // Semaine en cours complète, la précédente vide, celle d'avant complète.
    const historique = [...semaineComplete(1, 'cette'), ...semaineComplete(15, 'encore')];
    const serie = serieAssiduite(historique, programme, maintenant);

    expect(serie.semainesConsecutives).toBe(1);
  });

  it('ne retient que les séances de la fenêtre de huit semaines', () => {
    const historique = [...semaineComplete(1, 'cette'), ...semaineComplete(70, 'trop-vieux')];
    const serie = serieAssiduite(historique, programme, maintenant);

    expect(serie.seancesFaites).toBe(3);
  });

  it('ignore les séances abandonnées', () => {
    const abandonnee = { ...seance(1, 'abandon'), completedAt: undefined } as WorkoutSession;
    const serie = serieAssiduite([abandonnee], programme, maintenant);

    expect(serie.seancesFaites).toBe(0);
    expect(serie.semainesConsecutives).toBe(0);
  });
});
