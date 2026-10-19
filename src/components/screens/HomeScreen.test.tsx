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
import type { WorkoutSession } from '../../domain/types';
import { weekSlots } from '../../workout/summary';
import { estimatedMinutes, getNextBestAction, HomeScreen } from './HomeScreen';

const program = getProgram('ottman');

const jour = (id: string) => {
  const trouve = program.days.find((item) => item.id === id);
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

const completedSession = (dayId: WorkoutSession['dayId'], completedAt: string): WorkoutSession => ({
  id: `${dayId}-${completedAt}`,
  profileId: 'ottman',
  dayId,
  startedAt: completedAt,
  updatedAt: completedAt,
  completedAt,
  currentExerciseIndex: 0,
  currentSetIndex: 0,
  loggedSets: [],
});

describe('rail de la semaine', () => {
  const now = new Date('2026-10-17T10:00:00');

  it('marks the first unfinished slot today and later slots upcoming', () => {
    const slots = weekSlots(program.days, [completedSession(program.days[0].id, '2026-10-12T09:00:00')], now);
    expect(slots.map((slot) => slot.state)).toEqual(['done', 'today', 'upcoming', 'upcoming']);
    expect(slots[1].completedAt).toBeNull();
  });

  it('keeps completed and upcoming slots distinct when an earlier slot is missing', () => {
    const slots = weekSlots(
      program.days,
      [
        completedSession(program.days[1].id, '2026-10-13T09:00:00'),
        completedSession(program.days[3].id, '2026-10-16T09:00:00'),
      ],
      now,
    );
    expect(slots.map((slot) => slot.state)).toEqual(['today', 'done', 'upcoming', 'done']);
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

import { fireEvent, render, screen, within } from '@testing-library/react';
import { vi } from 'vitest';

describe('hiérarchie de l’accueil', () => {
  const baseProps = {
    profile: 'ottman' as const,
    program,
    history: [],
    measurements: [],
    activeSession: null,
    onStart: () => undefined,
    onResume: () => undefined,
    onDiscard: () => undefined,
  };

  it('annonce le chargement puis une seule action dominante', () => {
    const { rerender } = render(<HomeScreen {...baseProps} chargement />);
    expect(screen.getByRole('status')).toHaveTextContent('Chargement');

    rerender(<HomeScreen {...baseProps} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Aujourd’hui' })).toBeInTheDocument();
    const hero = screen.getByRole('article');
    const cta = within(hero).getByRole('button', { name: /^Commencer .+, \d+ min$/i });
    expect(cta).toHaveClass('primary-button');
    expect(cta).toHaveTextContent(/^Commencer$/);
    expect(screen.getAllByRole('button').filter((b) => b.classList.contains('primary-button'))).toHaveLength(1);
    expect(screen.queryByText(/charges prescrites/i)).not.toBeInTheDocument();
  });

  it('propose de reprendre ou de supprimer la séance en cours', () => {
    const onResume = vi.fn();
    const onDiscard = vi.fn();
    const active: WorkoutSession = {
      ...completedSession(program.days[0].id, new Date().toISOString()),
      completedAt: undefined,
    };
    render(<HomeScreen {...baseProps} activeSession={active} onResume={onResume} onDiscard={onDiscard} />);
    fireEvent.click(screen.getByRole('button', { name: /^Reprendre/ }));
    expect(onResume).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer la séance' }));
    expect(onDiscard).toHaveBeenCalled();
  });

  it('déclenche l’action correspondant à chaque état du rail', () => {
    const onStart = vi.fn();
    const onReviewSlot = vi.fn();
    const onPreviewSlot = vi.fn();
    // Une séance terminée maintenant tombe toujours dans la semaine en cours.
    const history = [completedSession(program.days[0].id, new Date().toISOString())];
    render(
      <HomeScreen
        {...baseProps}
        history={history}
        onStart={onStart}
        onReviewSlot={onReviewSlot}
        onPreviewSlot={onPreviewSlot}
      />,
    );

    const rail = screen.getByRole('navigation', { name: /créneaux de la semaine/i });
    fireEvent.click(within(rail).getByRole('button', { name: /Revoir Full Body A — Terminée/i }));
    expect(onReviewSlot).toHaveBeenCalledWith(program.days[0]);

    const hero = screen.getByRole('article');
    fireEvent.click(within(hero).getByRole('button', { name: /^Commencer Full Body B, \d+ min$/i }));
    expect(onStart).toHaveBeenCalledWith(program.days[1]);

    fireEvent.click(within(rail).getByRole('button', { name: /Prévisualiser Cardio circuit — À venir/i }));
    expect(onPreviewSlot).toHaveBeenCalledWith(program.days[2]);
  });
});
