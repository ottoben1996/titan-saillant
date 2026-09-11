import { describe, expect, it } from 'vitest';

describe('formatLoadKg', () => {
  it('écrit les charges au format français, sans décimale inutile', () => {
    expect(formatLoadKg(40)).toBe('40');
    expect(formatLoadKg(22.5)).toBe('22,5');
    expect(formatLoadKg(0)).toBe('0');
  });

  it('reste lisible sur une valeur invalide', () => {
    expect(formatLoadKg(Number.NaN)).toBe('—');
  });
});
import type { WorkoutDay, WorkoutSession } from '../domain/types';
import {
  addDays,
  formatLoadKg,
  formatMinutes,
  formatSignedInt,
  formatSignedKg,
  formatSignedPercent,
  formatVolume,
  groupSessionsByWeek,
  historyTotals,
  isCompleted,
  personalRecords,
  sessionActiveSeconds,
  sessionBestLoadKg,
  sessionDurationSeconds,
  sessionTimestamp,
  sessionVolume,
  startOfWeek,
  summarizeSession,
  totalsForWeek,
  volumeLastDays,
  volumeTrendPoints,
  weekSlots,
  weeklyComparison,
  workoutDayLabel,
} from './summary';

/* Repères fixes : la semaine de référence va du lundi 7 au dimanche 13 septembre 2026. */
const NOW = new Date(2026, 8, 9, 12, 0, 0); // mercredi 9 septembre 2026
const local = (y: number, m: number, d: number, h = 9, min = 0) =>
  new Date(y, m - 1, d, h, min, 0, 0).toISOString();

const session = (overrides: Partial<WorkoutSession> = {}): WorkoutSession => ({
  id: 's1',
  profileId: 'ottman',
  dayId: 'full-body-a',
  startedAt: local(2026, 9, 8, 9, 0),
  updatedAt: local(2026, 9, 8, 10, 0),
  completedAt: local(2026, 9, 8, 10, 0),
  currentExerciseIndex: 0,
  currentSetIndex: 0,
  loggedSets: [],
  ...overrides,
});

const sets = (...values: Array<{ reps?: number; load?: number; duration?: number }>) =>
  values.map((value, index) => ({
    exerciseId: 'presse-cuisses-inclinee',
    setIndex: index,
    actualRepetitions: value.reps,
    actualLoadKg: value.load,
    actualDurationSeconds: value.duration,
    completedAt: local(2026, 9, 8, 9, 30),
  }));

const day = (id: WorkoutDay['id'], name: string): WorkoutDay => ({
  id,
  name,
  subtitle: '',
  exercises: [],
  cooldown: { name: 'Retour au calme', durationSeconds: 300 },
});

const PROGRAM_DAYS: readonly WorkoutDay[] = [
  day('full-body-a', 'Full Body A'),
  day('full-body-b', 'Full Body B'),
  day('cardio', 'Cardio'),
];

describe('startOfWeek', () => {
  it('renvoie le lundi 00:00 de la semaine', () => {
    const monday = startOfWeek(new Date(2026, 8, 9, 15, 42));
    expect(monday.getDay()).toBe(1);
    expect([monday.getFullYear(), monday.getMonth(), monday.getDate()]).toEqual([2026, 8, 7]);
    expect([monday.getHours(), monday.getMinutes()]).toEqual([0, 0]);
  });

  it('traite le dimanche comme le dernier jour de la semaine', () => {
    const monday = startOfWeek(new Date(2026, 8, 13, 20, 0)); // dimanche
    expect(monday.getDate()).toBe(7);
  });

  it('addDays franchit les mois', () => {
    expect(addDays(new Date(2026, 8, 30), 3).getMonth()).toBe(9);
  });
});

describe('mesures de séance', () => {
  it('somme les charges par répétitions validées', () => {
    const composed = session({
      loggedSets: sets({ reps: 10, load: 50 }, { reps: 12, load: 40 }, { duration: 30 }),
    });
    expect(sessionVolume(composed)).toBe(10 * 50 + 12 * 40);
  });

  it('additionne les durées réelles des séries chronométrées', () => {
    const composed = session({ loggedSets: sets({ duration: 30 }, { duration: 45 }, { reps: 8, load: 10 }) });
    expect(sessionActiveSeconds(composed)).toBe(75);
  });

  it('retient la charge maximale observée', () => {
    const composed = session({ loggedSets: sets({ reps: 10, load: 50 }, { reps: 8, load: 62.5 }) });
    expect(sessionBestLoadKg(composed)).toBe(62.5);
  });

  it('calcule la durée entre le début et la fin', () => {
    const composed = session({
      startedAt: local(2026, 9, 8, 9, 0),
      completedAt: local(2026, 9, 8, 9, 47),
    });
    expect(sessionDurationSeconds(composed)).toBe(47 * 60);
  });

  it('ne fabrique pas de durée pour une séance en cours', () => {
    expect(sessionDurationSeconds(session({ completedAt: undefined }))).toBe(0);
    expect(isCompleted(session({ completedAt: undefined }))).toBe(false);
  });

  it('résume une séance en valeurs factuelles', () => {
    const composed = session({
      startedAt: local(2026, 9, 8, 9, 0),
      completedAt: local(2026, 9, 8, 10, 0),
      loggedSets: sets({ reps: 10, load: 50 }, { reps: 10, load: 50 }),
    });
    expect(summarizeSession(composed)).toEqual({
      dayId: 'full-body-a',
      durationSeconds: 3600,
      sets: 2,
      volumeKg: 1000,
      bestLoadKg: 50,
    });
  });

  it('utilise la date d’un horodatage invalide sans planter', () => {
    expect(sessionTimestamp(session({ completedAt: undefined, startedAt: 'n/a' }))).toBe(0);
  });
});

describe('volumeLastDays', () => {
  it('ne retient que la fenêtre glissante des 7 derniers jours', () => {
    const history = [
      session({ id: 'recent', completedAt: local(2026, 9, 8), loggedSets: sets({ reps: 10, load: 20 }) }),
      session({ id: 'limite', completedAt: local(2026, 9, 3), loggedSets: sets({ reps: 10, load: 10 }) }),
      session({ id: 'trop-ancient', completedAt: local(2026, 8, 20), loggedSets: sets({ reps: 10, load: 100 }) }),
    ];
    expect(volumeLastDays(history, NOW)).toBe(300);
  });
});

describe('totaux et comparaison hebdomadaire', () => {
  const history: WorkoutSession[] = [
    // Semaine en cours : 1 000 + 500 de volume, 2 séances
    session({ id: 'w1', dayId: 'full-body-a', completedAt: local(2026, 9, 8), loggedSets: sets({ reps: 10, load: 100 }) }),
    session({ id: 'w2', dayId: 'cardio', completedAt: local(2026, 9, 9, 8), loggedSets: sets({ reps: 10, load: 50 }) }),
    // Semaine précédente : 400 de volume, 1 séance
    session({ id: 'p1', dayId: 'full-body-b', completedAt: local(2026, 9, 2), loggedSets: sets({ reps: 10, load: 40 }) }),
    // Séance en cours : jamais comptée
    session({ id: 'active', completedAt: undefined, loggedSets: sets({ reps: 10, load: 999 }) }),
  ];

  it('compte uniquement les séances terminées de la semaine', () => {
    const totals = totalsForWeek(history, NOW);
    expect(totals.sessions).toBe(2);
    expect(totals.volumeKg).toBe(1500);
    expect(totals.sets).toBe(2);
  });

  it('cumule l’historique complet pour les indicateurs globaux', () => {
    const totals = historyTotals(history);
    expect(totals.sessions).toBe(3);
    expect(totals.volumeKg).toBe(1900);
    expect(totals.bestLoadKg).toBe(100);
  });

  it('compare en pourcentage et en absolu avec la semaine précédente', () => {
    const comparison = weeklyComparison(history, NOW);
    expect(comparison.current.volumeKg).toBe(1500);
    expect(comparison.previous.volumeKg).toBe(400);
    expect(comparison.volumeDeltaKg).toBe(1100);
    expect(comparison.volumeDeltaPct).toBe(275);
    expect(comparison.sessionsDelta).toBe(1);
    expect(comparison.sessionsDeltaPct).toBe(100);
  });

  it('annonce l’absence de comparaison quand la semaine précédente est vide', () => {
    const comparison = weeklyComparison(
      [session({ completedAt: local(2026, 9, 8), loggedSets: sets({ reps: 10, load: 10 }) })],
      NOW
    );
    expect(comparison.previous.sessions).toBe(0);
    expect(comparison.volumeDeltaPct).toBeNull();
    expect(comparison.sessionsDeltaPct).toBeNull();
    expect(comparison.volumeDeltaKg).toBe(100);
  });
});

describe('weekSlots', () => {
  it('marque terminé, aujourd’hui puis à venir dans l’ordre du programme', () => {
    const slots = weekSlots(
      PROGRAM_DAYS,
      [session({ dayId: 'full-body-a', completedAt: local(2026, 9, 8) })],
      NOW
    );
    expect(slots.map((slot) => slot.state)).toEqual(['done', 'today', 'upcoming']);
    expect(slots[1].day.id).toBe('full-body-b');
  });

  it('ne retient que la séance la plus récente du créneau', () => {
    const slots = weekSlots(
      PROGRAM_DAYS,
      [
        session({ id: 'a', dayId: 'cardio', completedAt: local(2026, 9, 8) }),
        session({ id: 'b', dayId: 'cardio', completedAt: local(2026, 9, 9) }),
      ],
      NOW
    );
    expect(slots[2].state).toBe('done');
    expect(slots[2].completedAt).toBe(local(2026, 9, 9));
  });

  it('ignore les séances des semaines précédentes', () => {
    const slots = weekSlots(
      PROGRAM_DAYS,
      [session({ dayId: 'full-body-a', completedAt: local(2026, 8, 31) })],
      NOW
    );
    expect(slots.map((slot) => slot.state)).toEqual(['today', 'upcoming', 'upcoming']);
  });

  it('passe tous les créneaux en terminé quand la semaine est complète', () => {
    const slots = weekSlots(
      PROGRAM_DAYS,
      PROGRAM_DAYS.map((item, index) =>
        session({ id: `s${index}`, dayId: item.id, completedAt: local(2026, 9, 7 + index) })
      ),
      NOW
    );
    expect(slots.map((slot) => slot.state)).toEqual(['done', 'done', 'done']);
  });
});

describe('groupSessionsByWeek', () => {
  it('isole la semaine en cours et nomme les semaines passées', () => {
    const groups = groupSessionsByWeek(
      [
        session({ id: 'old', completedAt: local(2026, 9, 1) }),
        session({ id: 'new', completedAt: local(2026, 9, 9) }),
      ],
      NOW
    );
    expect(groups).toHaveLength(2);
    expect(groups[0].label).toBe('Cette semaine');
    expect(groups[0].sessions.map((item) => item.id)).toEqual(['new']);
    expect(groups[1].label).toMatch(/^Semaine du /);
    expect(groups[1].sessions.map((item) => item.id)).toEqual(['old']);
  });

  it('trie les séances d’une semaine de la plus récente à la plus ancienne', () => {
    const groups = groupSessionsByWeek(
      [
        session({ id: 'lundi', completedAt: local(2026, 9, 7) }),
        session({ id: 'mercredi', completedAt: local(2026, 9, 9) }),
        session({ id: 'mardi', completedAt: local(2026, 9, 8) }),
      ],
      NOW
    );
    expect(groups[0].sessions.map((item) => item.id)).toEqual(['mercredi', 'mardi', 'lundi']);
  });

  it('conserve les séances en cours dans leur semaine', () => {
    const groups = groupSessionsByWeek([session({ id: 'active', completedAt: undefined })], NOW);
    expect(groups).toHaveLength(1);
    expect(groups[0].sessions[0].id).toBe('active');
  });

  it('ne renvoie aucun groupe sans historique', () => {
    expect(groupSessionsByWeek([], NOW)).toEqual([]);
  });
});

describe('tendances et records', () => {
  it('renvoie les points de tendance dans l’ordre chronologique', () => {
    const points = volumeTrendPoints(
      [
        session({ id: 'c', completedAt: local(2026, 9, 9), loggedSets: sets({ reps: 10, load: 30 }) }),
        session({ id: 'a', completedAt: local(2026, 9, 7), loggedSets: sets({ reps: 10, load: 10 }) }),
        session({ id: 'b', completedAt: local(2026, 9, 8), loggedSets: sets({ reps: 10, load: 20 }) }),
      ],
      8
    );
    expect(points.map((point) => point.volume)).toEqual([100, 200, 300]);
  });

  it('limite la tendance aux dernières séances', () => {
    const history = Array.from({ length: 12 }, (_, index) =>
      session({ id: `s${index}`, completedAt: local(2026, 9, 1 + (index % 9)) })
    );
    expect(volumeTrendPoints(history, 8)).toHaveLength(8);
  });

  it('relève la meilleure charge par mouvement', () => {
    const history = [
      session({
        loggedSets: [
          { exerciseId: 'chest-press', setIndex: 0, actualLoadKg: 45, actualRepetitions: 12, completedAt: local(2026, 9, 8) },
          { exerciseId: 'tirage-horizontal', setIndex: 0, actualLoadKg: 50, actualRepetitions: 8, completedAt: local(2026, 9, 8) },
        ],
      }),
      session({
        loggedSets: [
          { exerciseId: 'chest-press', setIndex: 0, actualLoadKg: 52, actualRepetitions: 10, completedAt: local(2026, 9, 9) },
        ],
      }),
    ];
    expect(personalRecords(history)).toEqual([
      { exerciseId: 'chest-press', loadKg: 52, repetitions: 10 },
      { exerciseId: 'tirage-horizontal', loadKg: 50, repetitions: 8 },
    ]);
  });

  it('écarte les mouvements sans charge ni durée renseignées', () => {
    const records = personalRecords([
      session({ loggedSets: [{ exerciseId: 'gainage-planche', setIndex: 0, completedAt: local(2026, 9, 8) }] }),
    ]);
    expect(records).toEqual([]);
  });
});

describe('libellés et formatage', () => {
  it('traduit les identifiants de créneau', () => {
    expect(workoutDayLabel('full-body-a')).toBe('Full Body A');
    expect(workoutDayLabel('cardio')).toBe('Cardio');
    expect(workoutDayLabel('autre-jour')).toBe('autre jour');
  });

  it('formate les durées en minutes lisibles', () => {
    expect(formatMinutes(0)).toBe('—');
    expect(formatMinutes(30)).toBe('< 1 min');
    expect(formatMinutes(47 * 60)).toBe('47 min');
    expect(formatMinutes(3600)).toBe('1 h');
    expect(formatMinutes(3900)).toMatch(/^1 h.05$/);
  });

  it('formate les écarts signés', () => {
    expect(formatSignedKg(0)).toBe('0');
    expect(formatSignedKg(1200)).toMatch(/^\+1.200$/);
    expect(formatSignedKg(-400)).toMatch(/^-400$/);
    expect(formatSignedInt(2)).toBe('+2');
    expect(formatSignedInt(-1)).toBe('-1');
    expect(formatSignedPercent(null)).toBe('—');
    expect(formatSignedPercent(275)).toMatch(/^\+275.%$/);
    expect(formatSignedPercent(-12.5)).toMatch(/^-12,5.%$/);
  });

  it('formate un volume arrondi', () => {
    expect(formatVolume(1499.6)).toMatch(/1.500/);
    expect(formatVolume(0)).toBe('0');
  });
});
