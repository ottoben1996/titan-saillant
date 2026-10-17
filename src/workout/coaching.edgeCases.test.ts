import { describe, expect, it } from 'vitest';
import type { WorkoutSession } from '../domain/types';
import { getAdaptiveAdvice } from './coaching';

const completed = (overrides: Partial<WorkoutSession> = {}): WorkoutSession => ({
  id: 's1',
  profileId: 'ottman',
  dayId: 'full-body-a',
  sequenceVersion: 2,
  currentStepIndex: 3,
  startedAt: '2026-09-08T08:00:00.000Z',
  updatedAt: '2026-09-08T09:00:00.000Z',
  completedAt: '2026-09-08T09:00:00.000Z',
  currentExerciseIndex: 0,
  currentSetIndex: 0,
  loggedSets: [],
  ...overrides,
});

const inProgress = (overrides: Partial<WorkoutSession> = {}): WorkoutSession =>
  completed({ completedAt: undefined, ...overrides });

describe('coaching adaptatif — cas limites', () => {
  it('ne conseille rien sans aucune séance', () => {
    expect(getAdaptiveAdvice([])).toBeNull();
  });

  it('ne conseille rien si aucune séance n’est terminée', () => {
    expect(getAdaptiveAdvice([inProgress({ perceivedExertion: 3, energy: 5 })])).toBeNull();
    expect(getAdaptiveAdvice([inProgress(), inProgress({ perceivedExertion: 4 })])).toBeNull();
  });

  it('propose de progresser sur une séance unique facile (RPE bas, énergie haute)', () => {
    const advice = getAdaptiveAdvice([completed({ perceivedExertion: 5, energy: 5 })]);
    expect(advice).toMatchObject({ recommendation: 'increase', safety: false });
  });

  it('propose de progresser quand l’énergie n’est pas renseignée (RPE <= 6)', () => {
    expect(getAdaptiveAdvice([completed({ perceivedExertion: 6 })])?.recommendation).toBe('increase');
  });

  it('reste sur la base quand l’énergie est basse malgré un RPE faible', () => {
    expect(getAdaptiveAdvice([completed({ perceivedExertion: 5, energy: 2 })])?.recommendation).toBe('maintain');
  });

  it('reste sur la base en plateau (RPE 7 à 8)', () => {
    expect(getAdaptiveAdvice([completed({ perceivedExertion: 7 })])?.recommendation).toBe('maintain');
    expect(getAdaptiveAdvice([completed({ perceivedExertion: 8, energy: 5 })])?.recommendation).toBe('maintain');
  });

  it('allège après une séance très dure (RPE >= 9), sans alerte sécurité', () => {
    const advice = getAdaptiveAdvice([completed({ perceivedExertion: 9, energy: 2 })]);
    expect(advice).toMatchObject({ recommendation: 'reduce', safety: false });
    expect(advice?.title).toMatch(/allège/i);
  });

  it('priorise la sécurité dès qu’une douleur est signalée', () => {
    const advice = getAdaptiveAdvice([completed({ perceivedExertion: 3, energy: 5, pain: 'gêne au genou' })]);
    expect(advice).toMatchObject({ recommendation: 'reduce', safety: true });
  });

  it('ne déclenche pas l’alerte pour « aucune » (espaces et casse ignorés)', () => {
    const advice = getAdaptiveAdvice([completed({ perceivedExertion: 5, energy: 5, pain: '  AUCUNE ' })]);
    expect(advice).toMatchObject({ recommendation: 'increase', safety: false });
  });

  it('ignore un signalement de douleur vide ou blanc', () => {
    expect(getAdaptiveAdvice([completed({ perceivedExertion: 5, energy: 5, pain: '   ' })])?.safety).toBe(false);
  });

  it('se base sur la séance terminée la plus récente', () => {
    const ancienneFacile = completed({
      id: 'old',
      completedAt: '2026-09-01T09:00:00.000Z',
      perceivedExertion: 5,
      energy: 5,
    });
    const recenteDure = completed({ id: 'new', completedAt: '2026-09-08T09:00:00.000Z', perceivedExertion: 9 });

    expect(getAdaptiveAdvice([ancienneFacile, recenteDure])?.recommendation).toBe('reduce');
    expect(getAdaptiveAdvice([recenteDure, ancienneFacile])?.recommendation).toBe('reduce');
  });

  it('ignore une séance en cours plus récente que la dernière séance terminée', () => {
    const ancienneFacile = completed({
      id: 'old',
      completedAt: '2026-09-01T09:00:00.000Z',
      perceivedExertion: 5,
      energy: 5,
    });
    const enCoursDure = inProgress({ id: 'running', updatedAt: '2026-09-10T09:00:00.000Z', perceivedExertion: 10 });

    expect(getAdaptiveAdvice([ancienneFacile, enCoursDure])?.recommendation).toBe('increase');
  });
});
