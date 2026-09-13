import { describe, expect, it } from 'vitest';
import { measurementId, starterMeasurements, type WeeklyMeasurement } from '../domain/measurements';
import {
  bodyMassIndex,
  buildWeeklyReading,
  formFromEnergy,
  implausibleZones,
  lastExerciseLoads,
  movingAverage,
  navyBodyFat,
  nextTargetWeek,
  relativeFatMass,
  seancesDeLaSemaine,
  waistToHeight,
  weeklyCheckinSummary,
  weightVelocity,
  zoneDelta,
} from './followup';

const ottman = (week: number) => starterMeasurements.find((item) => item.id === measurementId('ottman', 1, week))!;
const laura = (week: number) => starterMeasurements.find((item) => item.id === measurementId('laura', 1, week))!;

describe('suivi hebdomadaire', () => {
  it('compare deux semaines en ignorant les zones écartées', () => {
    const s1 = ottman(1);
    const s2 = ottman(2);

    // Le tour de taille de la semaine 1 (147 cm) était une erreur de saisie :
    // la valeur existe, mais elle est écartée des tendances.
    expect(zoneDelta(s1, s2, 'waistCm')).toBeUndefined();
    expect(zoneDelta(s1, s2, 'weightKg')).toBe(-0.6);
    expect(zoneDelta(s1, s2, 'armLeftCm')).toBe(1.5);
    expect(zoneDelta(s1, s2, 'thighRightCm')).toBe(1.5);
  });

  it('signale un écart invraisemblable au lieu de le laisser fausser la courbe', () => {
    const aberrant: WeeklyMeasurement = { ...ottman(1), waistCm: 147 };
    const suivant: WeeklyMeasurement = { ...ottman(2), waistCm: 117.5 };
    expect(implausibleZones(suivant, aberrant)).toContain('waistCm');

    // Un écart normal ne déclenche rien.
    expect(implausibleZones(ottman(2), ottman(1))).toEqual([]);

    // Le poids a son propre seuil : 2 kg d'une semaine à l'autre.
    expect(implausibleZones({ ...ottman(2), weightKg: 101 }, ottman(1))).toContain('weightKg');
  });

  it('calcule la vitesse de variation du poids, en kilos et en pourcentage', () => {
    const velocity = weightVelocity([ottman(1), ottman(2)]);
    expect(velocity?.kgPerWeek).toBe(-0.6);
    expect(velocity?.percentPerWeek).toBe(-0.57);
    expect(weightVelocity([ottman(1)])).toBeUndefined();
  });

  it('lisse une série avec la moyenne mobile', () => {
    expect(movingAverage([104.8, 104.7, 104.1, 103.9])).toEqual([104.8, 104.75, 104.53, 104.38]);
    expect(movingAverage([undefined, 100])).toEqual([undefined, 100]);
  });

  it('calcule les indicateurs morphologiques', () => {
    expect(bodyMassIndex(104.1, 175)).toBe(34);
    expect(waistToHeight(117.5, 175)).toBe(0.67);
    // RFM : hauteur et tour de taille suffisent, aucune autre mesure requise.
    expect(relativeFatMass('homme', 175, 117.5)).toBe(34.2);
    expect(relativeFatMass('femme', 160, 95)).toBe(42.3);
  });

  it('ne propose la formule marine que lorsque les mesures existent', () => {
    expect(navyBodyFat({ sex: 'homme', heightCm: 175, waistCm: 117.5 })).toBeUndefined();
    expect(navyBodyFat({ sex: 'homme', heightCm: 175, waistCm: 117.5, neckCm: 42 })).toBeGreaterThan(30);
    // Pour une femme, la formule exige aussi le tour de hanches.
    expect(navyBodyFat({ sex: 'femme', heightCm: 160, waistCm: 95, neckCm: 34 })).toBeUndefined();
    expect(navyBodyFat({ sex: 'femme', heightCm: 160, waistCm: 95, neckCm: 34, hipCm: 108 })).toBeGreaterThan(25);
  });

  it('reconnaît une recomposition : taille qui baisse, bras et cuisses qui montent', () => {
    const lecture = buildWeeklyReading({
      current: ottman(2),
      previous: ottman(1),
      first: ottman(1),
      profileId: 'ottman',
      sessionsThisWeek: 3,
    });
    expect(lecture.title).toBe('Recomposition en cours');
    expect(lecture.alert).toBe(false);
    expect(lecture.text).toContain('3 séances');
  });

  it('alerte quand le poids chute trop vite', () => {
    const avant: WeeklyMeasurement = { ...ottman(1), weightKg: 100 };
    const apres: WeeklyMeasurement = { ...ottman(2), weightKg: 98.5, waistCm: 117.5 };
    const lecture = buildWeeklyReading({ current: apres, previous: avant, first: avant, profileId: 'ottman' });
    expect(lecture.alert).toBe(true);
    expect(lecture.text).toContain('muscle');
  });

  it('donne la semaine suivante et boucle le cycle à huit semaines', () => {
    expect(nextTargetWeek([])).toEqual({ cycle: 1, week: 1 });
    expect(nextTargetWeek([laura(1)])).toEqual({ cycle: 1, week: 2 });
    expect(nextTargetWeek([{ ...laura(1), week: 8 }])).toEqual({ cycle: 2, week: 1 });
  });

  it('relève les charges réellement validées par exercice', () => {
    const sessions = [
      {
        dayId: 'full-body-a',
        completedAt: '2026-09-01T10:00:00.000Z',
        loggedSets: [
          { exerciseId: 'presse-cuisses-inclinee', actualLoadKg: 110 },
          { exerciseId: 'presse-cuisses-inclinee', actualLoadKg: 100 },
          { exerciseId: 'leg-curl-allonge', actualLoadKg: 50 },
        ],
      },
      {
        dayId: 'full-body-a',
        completedAt: '2026-09-08T10:00:00.000Z',
        loggedSets: [
          { exerciseId: 'presse-cuisses-inclinee', actualLoadKg: 115 },
          { exerciseId: 'leg-curl-allonge', actualLoadKg: 55 },
        ],
      },
    ];
    const charges = lastExerciseLoads(sessions, 'full-body-a');
    const presse = charges.find((charge) => charge.exerciseId === 'presse-cuisses-inclinee');
    expect(presse?.last).toBe(115);
    expect(presse?.previous).toBe(110);
    expect(presse?.delta).toBe(5);
  });

  it('ne retient que les séances de la semaine du point', () => {
    const seances = [
      { id: 'avant', completedAt: '2026-09-01T10:00:00.000Z' },
      { id: 'debut-de-semaine', completedAt: '2026-09-07T10:00:00.000Z' },
      { id: 'veille', completedAt: '2026-09-11T18:00:00.000Z' },
      { id: 'matin-du-point', completedAt: '2026-09-12T07:00:00.000Z' },
      { id: 'apres-le-point', completedAt: '2026-09-12T16:00:00.000Z' },
      { id: 'sans-date' },
    ];
    const semaine = seancesDeLaSemaine(seances, {
      depuis: '2026-09-05T09:00:00.000Z',
      jusqua: '2026-09-12T09:00:00.000Z',
    });

    expect(semaine.map((s) => s.id)).toEqual(['debut-de-semaine', 'veille', 'matin-du-point']);
  });

  it('n’invente rien quand la semaine n’a pas de date', () => {
    const seances = [{ id: 'a', completedAt: '2026-09-07T10:00:00.000Z' }];
    expect(seancesDeLaSemaine(seances, {})).toEqual([]);
    expect(seancesDeLaSemaine(seances, { jusqua: '2026-09-12T09:00:00.000Z' })).toHaveLength(1);
  });

  it('traduit la forme ressentie en langage parlé', () => {
    expect(formFromEnergy(5)).toBe('better');
    expect(formFromEnergy(4)).toBe('better');
    expect(formFromEnergy(3)).toBe('same');
    expect(formFromEnergy(2)).toBe('worse');
    expect(formFromEnergy(undefined)).toBeUndefined();
  });

  it('agrège le ressenti des séances de la semaine', () => {
    const sessions = [
      {
        dayId: 'full-body-a',
        completedAt: '2026-09-07T10:00:00.000Z',
        perceivedExertion: 7,
        energy: 5,
        pain: 'Gêne légère',
        painLocation: 'épaule droite',
        loadConsigne: 'increase' as const,
        notes: 'bonne séance',
      },
      {
        dayId: 'full-body-b',
        completedAt: '2026-09-10T10:00:00.000Z',
        perceivedExertion: 9,
        energy: 5,
        pain: 'Aucune',
        loadConsigne: 'same' as const,
      },
      // Séance abandonnée : aucun ressenti à raconter.
      { dayId: 'cardio', loggedSets: [] },
    ];
    const ressenti = weeklyCheckinSummary(sessions);

    expect(ressenti.sessions).toBe(2);
    expect(ressenti.averageRpe).toBe(8);
    expect(ressenti.painCount).toBe(1);
    expect(ressenti.painDetails[0]).toEqual({ dayId: 'full-body-a', pain: 'Gêne légère', location: 'épaule droite' });
    expect(ressenti.formTrend).toBe('better');
    expect(ressenti.consignes).toEqual([
      { dayId: 'full-body-a', consigne: 'increase' },
      { dayId: 'full-body-b', consigne: 'same' },
    ]);
    expect(ressenti.notes).toEqual([{ dayId: 'full-body-a', notes: 'bonne séance' }]);
  });

  it('signale une forme qui part dans les deux sens et une gêne répétée', () => {
    const ressenti = weeklyCheckinSummary([
      { dayId: 'full-body-a', completedAt: '2026-09-07T10:00:00.000Z', energy: 1, pain: 'Douleur' },
      { dayId: 'full-body-b', completedAt: '2026-09-10T10:00:00.000Z', energy: 5, pain: 'Douleur' },
    ]);
    expect(ressenti.formTrend).toBe('mixed');
    expect(ressenti.painCount).toBe(2);
    expect(ressenti.averageRpe).toBeUndefined();
  });
});
