import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MustaphaApp from './MustaphaApp';
import { mustaphaDb } from './storage/db';
import { exportMustaphaData, getActiveSession, importMustaphaData, saveProfile, saveSession, saveShopping } from './storage/repository';
import { recipes, trainingPlan } from './domain/plan';
import type { MustaphaProfile, WorkoutSession } from './domain/types';

const profile: MustaphaProfile = {
  id: 'mustapha',
  firstName: 'Mustapha',
  level: 'beginner',
  goal: 'recomposition',
  availableDays: ['Lundi', 'Mercredi', 'Samedi'],
  equipment: ['Haltères'],
  dietaryConstraints: [],
  allergies: [],
  excludedFoods: [],
  trackingMode: 'portions',
  consent: true,
  healthWarningAcknowledged: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const activeSession = (overrides: Partial<WorkoutSession> = {}): WorkoutSession => ({
  id: 'mustapha-session-test',
  profileId: 'mustapha',
  trainingDayId: 'full-body-b-w1',
  week: 1,
  startedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  currentExerciseIndex: 0,
  currentSetIndex: 0,
  loggedSets: [],
  ...overrides,
});

afterEach(async () => {
  await Promise.all(mustaphaDb.tables.map(table => table.clear()));
  localStorage.clear();
});

describe('MUSTAPHA COACH', () => {
  it('affiche onboarding et crée un profil Mustapha', async () => {
    render(<MustaphaApp />);
    expect(screen.getByRole('heading', { name: /ton cap/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /continuer/i }));
    fireEvent.click(screen.getByRole('button', { name: /continuer/i }));
    fireEvent.click(screen.getByRole('button', { name: /continuer/i }));
    fireEvent.click(screen.getByRole('button', { name: /générer mon programme/i }));
    await waitFor(() => expect(screen.getByRole('heading', { name: /bonjour mustapha/i })).toBeInTheDocument());
    expect(await mustaphaDb.profiles.get('mustapha')).toMatchObject({ id: 'mustapha', firstName: 'Mustapha', coachTone: 'dictator-rp', split: 'full-body', weeklySessions: 3 });
  });

  it('garde un plan immuable sur 8 semaines et des recettes filtrables', () => {
    expect(trainingPlan.weeks).toHaveLength(8);
    expect(Object.isFrozen(trainingPlan)).toBe(true);
    expect(recipes.filter(recipe => recipe.tags.includes('protéiné')).length).toBeGreaterThan(0);
  });

  it('exporte et restaure une sauvegarde Mustapha indépendante', async () => {
    await importMustaphaData(JSON.stringify({ profile: { id: 'mustapha', firstName: 'Mustapha', level: 'beginner', goal: 'recomposition', availableDays: [], equipment: [], dietaryConstraints: [], allergies: [], excludedFoods: [], trackingMode: 'portions', consent: true, healthWarningAcknowledged: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } }));
    const backup = await exportMustaphaData();
    expect(backup).toContain('"profile"');
    await mustaphaDb.profiles.clear();
    await importMustaphaData(backup);
    expect((await mustaphaDb.profiles.get('mustapha'))?.firstName).toBe('Mustapha');
  });

  it('reprend une séance active et conserve la pause du repos', async () => {
    await saveProfile(profile);
    await saveSession(activeSession());
    render(<MustaphaApp />);
    await waitFor(() => expect(screen.getByRole('button', { name: /reprendre ta séance/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /reprendre ta séance/i }));
    expect(await screen.findByRole('heading', { name: /s’entraîner/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /valider la série/i }));
    await waitFor(() => expect(screen.getByText(/repos en cours/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /^pause$/i }));
    await waitFor(async () => expect((await getActiveSession())?.restPausedRemainingSeconds).toBeGreaterThan(0));
    expect(screen.getByText(/repos en pause/i)).toBeInTheDocument();
  });

  it('agrège une liste de courses modifiable dans le stockage séparé', async () => {
    await saveShopping({
      id: 'mustapha-main',
      items: [{ id: 'item-1', name: 'Riz', quantity: 160, unit: 'g', aisle: 'epicerie', checked: false }],
      updatedAt: new Date().toISOString(),
    });
    const list = await mustaphaDb.shopping.get('mustapha-main');
    expect(list?.items[0]).toMatchObject({ name: 'Riz', quantity: 160, checked: false });
    await saveShopping({ ...list!, items: [{ ...list!.items[0], checked: true, quantity: 320 }] });
    expect(await mustaphaDb.shopping.get('mustapha-main')).toMatchObject({ items: [{ name: 'Riz', quantity: 320, checked: true }] });
    expect(await mustaphaDb.profiles.get('mustapha')).toBeUndefined();
  });
});
