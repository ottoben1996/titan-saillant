/**
 * Mission 7 — tests d'intégration du parcours complet d'une séance.
 *
 * Ces tests pilotent l'interface comme un utilisateur : clics réels sur les
 * boutons visibles, saisie réelle dans les champs, et vérification de l'état
 * RÉELLEMENT affiché (numéro de série, compteur de séries, nom de l'exercice,
 * présence du bloc de repos, écran de bilan, historique).
 *
 * Aucun fichier de production n'est modifié. Les défauts rencontrés sont
 * documentés dans les tests (voir `DÉFAUT DOCUMENTÉ` plus bas) et dans le
 * rapport de mission.
 *
 * Contraintes jsdom prises en compte :
 *  - Web Audio et la vibration ne sont pas implémentés (alerts.ts / timerAnnouncements.ts
 *    sont sans effet, jamais en échec) : le son n'est pas testé ;
 *  - le service worker n'existe pas : App ne l'utilise que derrière `'serviceWorker' in navigator` ;
 *  - les chronos sont pilotés par de faux chronos (`vi.useFakeTimers`), jamais par
 *    une attente en temps réel ;
 *  - `setImmediate` reste RÉEL pour que l'itération d'IndexedDB (fake-indexeddb)
 *    continue de fonctionner pendant les faux chronos.
 */
import 'fake-indexeddb/auto';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { getProgram } from '../domain/programs';
import type { WorkoutSession } from '../domain/types';
import { db } from '../storage/db';
import { getActiveSession, listSessions, saveSession } from '../storage/sessionRepository';

// Ces parcours pilotent une séance entière : lancés avec toute la suite en
// parallèle, ils dépassent le délai par défaut de 5 s. Le délai est porté à 20 s
// pour ce fichier uniquement, sans toucher aux autres suites.
vi.setConfig({ testTimeout: 20_000 });

import { completeSet, createRunner, getNextStep, getWorkoutExercises } from '../workout/runner';

/* ------------------------------------------------------------------ outils -- */

const FAKED_TIMERS = ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] as const;

/** Capture du vrai setImmediate AVANT l'installation des faux chronos. */
const realSetImmediate = (globalThis as { setImmediate?: (callback: () => void) => void }).setImmediate;

/** Nombre total d'étapes prescrites pour « Full Body A » (échauffement + travail + retour au calme). */
const FULL_BODY_A_STEPS = 21;
/** Repère de l'en-tête de séance : « Exercice N sur M ». */
const exerciceSur = (numero: number) => new RegExp(`^exercice ${numero} sur \\d+$`, 'i');

/**
 * Laisse tourner la boucle d'événements réelle : les écritures IndexedDB
 * (fake-indexeddb planifie via setImmediate) et les mises à jour React
 * se terminent. Aucune attente en temps réel des faux chronos.
 */
async function flush(rounds = 15) {
  await act(async () => {
    for (let index = 0; index < rounds; index += 1) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise<void>((resolve) => {
        if (typeof realSetImmediate === 'function') realSetImmediate(() => resolve());
        else resolve();
      });
    }
  });
}

/** Avance les faux chronos puis laisse retomber les effets. */
async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
  await flush(3);
}

/** Le bloc de repos est-il affiché ? (bouton explicite « Passer le repos »). */
function restBlockVisible() {
  return Boolean(screen.queryByRole('button', { name: /passer le repos/i }));
}

/** Ouverture de l'application puis sélection du profil Ottman (parcours réel). */
async function openAsOttman() {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /ottman/i }));
  await flush();
}

/** Depuis l'accueil : bouton « Commencer » puis validation du check-in d'énergie. */
async function startDayFromHome(dayName: string) {
  fireEvent.click(screen.getByRole('button', { name: /^commencer .+, \d+ min$/i }));
  await flush();
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: new RegExp(`^commencer ${dayName}$`, 'i') }),
  );
  await flush();
}

/** Onglet Progrès, puis la vue Historique du sélecteur segmenté. */
async function openHistory() {
  fireEvent.click(screen.getByRole('button', { name: 'Progrès' }));
  await flush();
  fireEvent.click(screen.getByRole('radio', { name: 'Historique' }));
  await flush();
}

/** Valide la série affichée : clic utilisateur, écriture IndexedDB, puis libération du verrou anti double-clic (350 ms). */
async function validateSet() {
  fireEvent.click(screen.getByRole('button', { name: /valider la série/i }));
  await flush();
  await advance(400);
}

/** Passe le temps de repos en cours. */
async function skipRest() {
  fireEvent.click(screen.getByRole('button', { name: /passer le repos/i }));
  await advance(50);
}

/** Enchaîne séries et repos jusqu'à l'écran de bilan. */
async function completeRemainingSets(maxActions = 80) {
  for (let action = 0; action < maxActions; action += 1) {
    if (screen.queryByRole('heading', { name: /bilan de/i })) return;
    if (restBlockVisible()) {
      // eslint-disable-next-line no-await-in-loop
      await skipRest();
      continue;
    }
    const validate = screen.queryByRole('button', { name: /valider la série/i });
    if (!validate) throw new Error(`Aucune action possible après ${action} actions`);
    // eslint-disable-next-line no-await-in-loop
    await validateSet();
  }
  throw new Error('La séance ne s’est pas terminée');
}

/** Contenu d'une cellule du bilan (durée, séries, volume, meilleure charge). */
function bilanCell(label: RegExp): HTMLElement {
  // Cadré sur la grille des chiffres : la note placée sous elle parle aussi de
  // séries et de volume, donc une recherche sur tout le document devient
  // ambiguë — le test échouerait alors pour une phrase explicative ajoutée au
  // bilan, et non pour un défaut du bilan.
  const grille = document.querySelector('.bilan-grid');
  if (!grille) throw new Error('Grille du bilan introuvable');
  const cell = within(grille as HTMLElement)
    .getByText(label)
    .closest('.bilan-cell');
  if (!cell) throw new Error(`Cellule de bilan introuvable : ${label}`);
  return cell as HTMLElement;
}

/** Groupe de boutons d'une question du quiz de fin de séance. */
function quizGroup(label: RegExp): HTMLElement {
  return screen.getByRole('group', { name: label });
}

/** Rejoue une séance complète au niveau moteur (fixture de test, sans clics). */
function completedSession(profileId: 'ottman' | 'laura', dayId: string): WorkoutSession {
  const program = getProgram(profileId);
  const day = program.days.find((item) => item.id === dayId);
  if (!day) throw new Error(`Jour introuvable : ${dayId}`);
  let session = createRunner(day, profileId);
  let guard = 0;
  while (!session.completedAt && guard < 80) {
    const step = getNextStep(session, day);
    const exercise = getWorkoutExercises(day, session)[step.exerciseIndex ?? 0];
    const prescription = exercise.sets[step.setIndex ?? 0];
    session = completeSet(session, day, {
      exerciseId: exercise.id,
      setIndex: step.setIndex ?? 0,
      actualRepetitions: prescription?.repetitions,
      actualDurationSeconds: prescription?.durationSeconds,
      actualLoadKg: prescription?.loadKg,
    });
    guard += 1;
  }
  return session;
}

/* ------------------------------------------------------------- cycle de vie -- */

beforeEach(() => {
  vi.useFakeTimers({ toFake: [...FAKED_TIMERS] });
});

afterEach(async () => {
  // IMPORTANT — l'ordre compte : les faux chronos doivent être retirés AVANT le
  // démontage. Sinon le demontage React reste planifié sur un setTimeout simulé
  // qui ne s'exécute jamais, et le rendu du test suivant n'est plus « commité »
  // (conteneur vide). Les afterEach vitest s'exécutent en ordre inverse de
  // déclaration : celui-ci passe donc avant le nettoyage automatique de RTL.
  vi.useRealTimers();
  cleanup();
  vi.restoreAllMocks();
  await Promise.all(db.tables.map((table) => table.clear()));
  localStorage.clear();
});

/* ------------------------------------------------------------------- tests -- */

describe('Parcours complet d’une séance (intégration, interface pilotée)', () => {
  it('[1] parcours nominal : profil → accueil → énergie → échauffement → travail + charge → repos → fin de séance', async () => {
    await openAsOttman();
    expect(screen.getByRole('heading', { level: 1, name: 'Aujourd’hui' })).toBeInTheDocument();
    expect(screen.getByText(/espace d’ottman/i)).toBeInTheDocument();

    await startDayFromHome('Full Body A');

    // --- 1re série : échauffement, compteur de séries, exercice, suite annoncée.
    expect(screen.getByRole('heading', { level: 1, name: 'Coiffe des rotateurs' })).toBeInTheDocument();
    expect(screen.getByText('ÉCHAUFFEMENT · SÉRIE 1')).toBeInTheDocument();
    expect(screen.getByText(exerciceSur(1))).toBeInTheDocument();
    expect(screen.getByText(/ensuite\s: équilibre sur bosu/i)).toBeInTheDocument();

    await validateSet();

    // --- Série d'échauffement validée : on passe à l'exercice suivant, série 1.
    expect(screen.getByRole('heading', { level: 1, name: 'Équilibre sur bosu' })).toBeInTheDocument();
    expect(screen.getByText(exerciceSur(2))).toBeInTheDocument();
    expect(screen.getByText('ÉCHAUFFEMENT · SÉRIE 1')).toBeInTheDocument();
    expect(screen.getByText('TEMPO')).toBeInTheDocument();

    await validateSet();
    // --- Numéro de série qui progresse réellement à l'écran.
    expect(screen.getByText('ÉCHAUFFEMENT · SÉRIE 2')).toBeInTheDocument();
    expect(screen.getByText(exerciceSur(2))).toBeInTheDocument();

    await validateSet();
    expect(screen.getByText('ÉCHAUFFEMENT · SÉRIE 3')).toBeInTheDocument();
    await validateSet();
    expect(screen.getByRole('heading', { level: 1, name: 'Vélo' })).toBeInTheDocument();
    expect(screen.getByText(exerciceSur(3))).toBeInTheDocument();
    await validateSet();
    expect(restBlockVisible()).toBe(true);
    await skipRest();

    // --- Première séance du PDF : soulevé de terre roumain.
    expect(screen.getByRole('heading', { level: 1, name: 'Soulevé de terre roumain' })).toBeInTheDocument();
    expect(screen.getByText('SÉRIE D’ÉCHAUFFEMENT · SÉRIE 1')).toBeInTheDocument();
    await validateSet();
    expect(screen.getByText('01:00')).toBeInTheDocument();
    await skipRest();

    // --- Série de travail à 40 kg.
    expect(screen.getByText('SÉRIE DE TRAVAIL · SÉRIE 2')).toBeInTheDocument();
    expect(screen.getByText('Charge (kg)')).toBeInTheDocument();
    const loadInput = screen.getByDisplayValue('40');
    expect(loadInput).toHaveValue('40');
    // Les boutons de charge portent un libellé explicite pour les lecteurs d'écran,
    // et leurs paliers suivent le mouvement : 5 kg en chemin rapide sur la presse à
    // cuisse, 2,5 kg derrière « Réglages fins », replié par défaut.
    const augmenter = screen.getAllByRole('button', { name: /augmenter la charge de/i })[0];
    fireEvent.click(augmenter);
    expect(Number((loadInput as HTMLInputElement).value)).toBeGreaterThan(40);
    fireEvent.click(screen.getByRole('button', { name: /réglages fins/i }));
    expect(screen.getAllByRole('button', { name: /augmenter la charge de/i }).length).toBeGreaterThan(0);

    await validateSet();
    // --- Repos long prescrit (135 s) affiché au chrono.
    expect(restBlockVisible()).toBe(true);
    expect(screen.getByText('01:45')).toBeInTheDocument();
    await skipRest();
    expect(screen.getByText('SÉRIE DE TRAVAIL · SÉRIE 3')).toBeInTheDocument();

    // --- Jusqu'à la fin de séance.
    await completeRemainingSets();

    expect(screen.getByText('SÉANCE TERMINÉE')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /bilan de full body a/i })).toBeInTheDocument();
    expect(within(bilanCell(/séries validées/i)).getByText(String(FULL_BODY_A_STEPS))).toBeInTheDocument();
    expect(bilanCell(/meilleure charge/i).textContent).toMatch(/kg/);
    expect(bilanCell(/durée/i).textContent).not.toBe('—');
    expect(bilanCell(/volume/i).textContent).toMatch(/kg·rép\./);
  });

  it('[2] reprise : la séance en cours est restaurée au bon endroit après remontage de l’application', async () => {
    const { unmount } = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /ottman/i }));
    await flush();
    await startDayFromHome('Full Body A');

    await validateSet(); // coiffe des rotateurs
    await validateSet(); // bosu, série 1
    expect(screen.getByText('ÉCHAUFFEMENT · SÉRIE 2')).toBeInTheDocument();
    expect(screen.getByText(exerciceSur(2))).toBeInTheDocument();

    // Démonte puis remonte l'application (comme une fermeture / réouverture).
    unmount();
    render(<App />);
    await flush();

    // Pas de sélecteur de profil : le profil est mémorisé, la séance en cours est restaurée.
    expect(screen.queryByRole('heading', { name: /choisis ton profil/i })).toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: 'Équilibre sur bosu' })).toBeInTheDocument();
    expect(screen.getByText('ÉCHAUFFEMENT · SÉRIE 2')).toBeInTheDocument();
    expect(screen.getByText(exerciceSur(2))).toBeInTheDocument();

    // Les séries déjà validées sont bien persistées.
    const restored = await listSessions('ottman');
    expect(restored).toHaveLength(1);
    expect(restored[0].loggedSets).toHaveLength(2);
    expect(restored[0].completedAt).toBeUndefined();
  });

  it('[3] pause et reprise : continuer ou mettre en pause, puis reprise au bon exercice', async () => {
    await openAsOttman();
    await startDayFromHome('Full Body A');
    await validateSet(); // 1 série validée → exercice suivant, série 1

    // --- La sortie de séance propose de continuer OU de mettre en pause.
    fireEvent.click(screen.getByRole('button', { name: /quitter la séance/i }));
    await flush();
    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByRole('button', { name: /continuer la séance/i })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /mettre en pause/i })).toBeInTheDocument();

    // --- Continuer : on revient exactement sur la même étape.
    fireEvent.click(within(dialog).getByRole('button', { name: /continuer la séance/i }));
    await flush();
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: 'Équilibre sur bosu' })).toBeInTheDocument();
    expect(screen.getByText(exerciceSur(2))).toBeInTheDocument();

    // --- Mettre en pause : retour à l'accueil.
    fireEvent.click(screen.getByRole('button', { name: /quitter la séance/i }));
    await flush();
    fireEvent.click(screen.getByRole('button', { name: /mettre en pause/i }));
    await flush();

    expect(screen.getByRole('heading', { level: 1, name: 'Aujourd’hui' })).toBeInTheDocument();
    expect(screen.getByText(/séance mise en pause/i)).toBeInTheDocument();

    // --- L'accueil propose de reprendre, avec le nombre de séries déjà validées.
    const resumeCard = screen.getByRole('article', { name: /full body a/i });
    expect(resumeCard).toHaveTextContent(/1 série déjà validée/);
    expect(resumeCard).toHaveTextContent(/continue là où tu t’es arrêté/i);
    const resumeButton = within(resumeCard).getByRole('button', { name: /reprendre la séance en cours/i });
    // La même carte propose de supprimer la séance, via une action distincte.
    expect(screen.getByRole('button', { name: /^supprimer la séance$/i })).toBeInTheDocument();

    // --- La reprise ramène au bon exercice, à la bonne série.
    fireEvent.click(resumeButton);
    await flush();
    expect(screen.getByRole('heading', { level: 1, name: 'Équilibre sur bosu' })).toBeInTheDocument();
    expect(screen.getByText('ÉCHAUFFEMENT · SÉRIE 1')).toBeInTheDocument();
    expect(screen.getByText(exerciceSur(2))).toBeInTheDocument();
  });

  it('[4] isolation des profils : la séance validée par Ottman n’apparaît pas dans l’historique de Laura', async () => {
    // Une séance réellement terminée par Ottman (moteur de séance + dépôt réel).
    const ottmanSession = completedSession('ottman', 'full-body-a');
    expect(ottmanSession.completedAt).toBeTruthy();
    expect(ottmanSession.loggedSets).toHaveLength(FULL_BODY_A_STEPS);
    await saveSession(ottmanSession);

    // --- Laura ouvre l'application : son historique doit être vide.
    localStorage.setItem('coach-active-profile', 'laura');
    render(<App />);
    await flush();
    expect(screen.getByText(/espace de laura/i)).toBeInTheDocument();

    await openHistory();
    expect(screen.getByRole('heading', { name: /aucune séance enregistrée/i })).toBeInTheDocument();
    expect(screen.queryByText('Full Body A')).toBeNull();
    expect(screen.queryByText('Séance terminée')).toBeNull();

    // --- Bascule vers Ottman via l'avatar de la barre : sa séance apparaît.
    // La confirmation est un dialogue DE L'APPLICATION (plus de window.confirm natif).
    fireEvent.click(screen.getByRole('button', { name: 'Changer de profil' }));
    await flush();
    const confirmDialog = screen.getByRole('alertdialog');
    expect(within(confirmDialog).getByRole('heading', { name: /changer de profil/i })).toBeInTheDocument();
    fireEvent.click(within(confirmDialog).getByRole('button', { name: /changer de profil/i }));
    await flush();
    fireEvent.click(screen.getByRole('button', { name: /ottman/i }));
    await flush();
    await openHistory();

    expect(screen.getByText('Full Body A')).toBeInTheDocument();
    expect(screen.getByText('Séance terminée')).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${FULL_BODY_A_STEPS} séries`))).toBeInTheDocument();

    // --- Isolation vérifiée aussi au niveau du dépôt.
    expect(await listSessions('ottman')).toHaveLength(1);
    expect(await listSessions('laura')).toHaveLength(0);
  });

  it('[4b] le sélecteur duo de Progrès conserve l’écran de progression', async () => {
    await openAsOttman();
    fireEvent.click(screen.getByRole('button', { name: 'Progrès' }));
    await flush();

    const duo = screen.getByRole('radiogroup', { name: 'Profil affiché' });
    expect(within(duo).getByRole('radio', { name: 'Ottman' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(within(duo).getByRole('radio', { name: 'Laura' }));
    await flush();

    expect(screen.getByRole('heading', { level: 1, name: 'Progrès' })).toBeInTheDocument();
    expect(screen.getByText('Données de Laura')).toBeInTheDocument();
    expect(
      within(screen.getByRole('radiogroup', { name: 'Profil affiché' })).getByRole('radio', { name: 'Laura' }),
    ).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: 'Progrès' })).toHaveAttribute('aria-current', 'page');
  });

  it('[5] séance terminée : bilan factuel (durée, séries, volume) puis enregistrement dans l’historique', async () => {
    await openAsOttman();
    await startDayFromHome('Full Body A');
    await completeRemainingSets();

    // --- 1. Bilan factuel.
    expect(screen.getByText('SÉANCE TERMINÉE')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /bilan de full body a/i })).toBeInTheDocument();
    expect(within(bilanCell(/séries validées/i)).getByText(String(FULL_BODY_A_STEPS))).toBeInTheDocument();
    expect(bilanCell(/durée/i)).toHaveTextContent(/min/);
    expect(bilanCell(/meilleure charge/i)).toHaveTextContent('65 kg');
    expect(bilanCell(/volume/i).textContent).toMatch(/[\d][\s\u202f]?[\d]{3} kg·rép\./);

    // --- 2. Ressenti saisi par l'utilisateur (alimente le coaching suivant).
    // Le quiz se répond en boutons, debout dans la salle : plus de liste déroulante.
    fireEvent.click(within(quizGroup(/effort ressenti/i)).getByRole('button', { name: '8' }));
    fireEvent.click(within(quizGroup(/forme du jour/i)).getByRole('button', { name: "Mieux que d'habitude" }));
    fireEvent.click(within(quizGroup(/prochaine fois/i)).getByRole('button', { name: 'Charger plus' }));

    // --- 3. Enregistrement → retour à l'accueil, séance dans l'historique.
    fireEvent.click(screen.getByRole('button', { name: /enregistrer et terminer/i }));
    await flush();
    await advance(400);

    expect(screen.getByRole('heading', { level: 1, name: 'Aujourd’hui' })).toBeInTheDocument();
    expect(screen.getByText(/bilan enregistré/i)).toBeInTheDocument();
    // Le créneau du jour est validé dans le rail de la semaine.
    expect(screen.getByRole('button', { name: /full body a — terminée/i })).toBeInTheDocument();

    await openHistory();
    expect(screen.getByText('Full Body A')).toBeInTheDocument();
    expect(screen.getByText(/RPE 8\/10/)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${FULL_BODY_A_STEPS} séries`))).toBeInTheDocument();

    const saved = await listSessions('ottman');
    expect(saved).toHaveLength(1);
    expect(saved[0].completedAt).toBeTruthy();
    expect(saved[0].loggedSets).toHaveLength(FULL_BODY_A_STEPS);
    expect(saved[0].perceivedExertion).toBe(8);
    // « Mieux que d'habitude » vaut 5 sur l'échelle d'énergie (1 à 5).
    expect(saved[0].energy).toBe(5);
    expect(saved[0].loadConsigne).toBe('increase');
  });

  it('[6] une séance en cours bloque le démarrage d’un autre créneau : le rail prévisualise sans lancer la séance', async () => {
    await openAsOttman();
    await startDayFromHome('Full Body A');
    await validateSet(); // une série validée → la séance A existe en base

    // Mise en pause de la séance A : elle reste « en cours » dans le dépôt.
    fireEvent.click(screen.getByRole('button', { name: /quitter la séance/i }));
    await flush();
    fireEvent.click(screen.getByRole('button', { name: /mettre en pause/i }));
    await flush();

    // Un autre créneau est une prévisualisation : il ne contourne pas la séance en cours.
    fireEvent.click(screen.getByRole('button', { name: /prévisualiser full body b — à venir/i }));
    await flush();
    expect(screen.getByText(/aperçu disponible après le chargement des détails de la séance/i)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();

    const inProgress = (await listSessions('ottman')).filter((item) => !item.completedAt);
    expect(inProgress).toHaveLength(1);
    expect(inProgress[0].dayId).toBe('full-body-a');
    expect(inProgress[0].loggedSets).toHaveLength(1);
  });

  it('[6b] les champs de saisie portent un nom accessible (accessibilité corrigée)', async () => {
    await openAsOttman();
    await startDayFromHome('Full Body A');

    // Le libellé « Répétitions » est un simple <span> (WorkoutScreen.tsx:625) posé
    // à côté du champ : ni <label>, ni aria-label, ni aria-labelledby. Le champ
    // n'a donc aucun nom accessible (idem « Charge (kg) » ligne 645 et
    // « Durée (secondes) » ligne 604). Un lecteur d'écran annonce « champ de saisie »
    // sans dire ce qu'il mesure.
    expect(() => screen.getByLabelText(/répétitions/i)).not.toThrow();
  });

  /* ------------------------------------------------------------------ */
  /*  Annulation et suppression de séance, liste des exercices          */
  /* ------------------------------------------------------------------ */

  it('[7] annuler une séance en cours : le dialogue de sortie propose l’annulation, puis rien n’est conservé', async () => {
    await openAsOttman();
    await startDayFromHome('Full Body A');
    await validateSet();
    expect(await listSessions('ottman')).toHaveLength(1);

    // Sortie de séance : trois issues clairement distinctes.
    fireEvent.click(screen.getByRole('button', { name: /quitter la séance/i }));
    await flush();
    const sortie = screen.getByRole('alertdialog');
    expect(within(sortie).getByRole('button', { name: /mettre en pause/i })).toBeInTheDocument();
    expect(within(sortie).getByRole('button', { name: /continuer la séance/i })).toBeInTheDocument();
    fireEvent.click(within(sortie).getByRole('button', { name: /annuler la séance/i }));
    await flush();

    // Suppression = action destructive : confirmation explicite.
    const confirmation = screen.getByRole('alertdialog');
    expect(within(confirmation).getByRole('heading', { name: /annuler cette séance/i })).toBeInTheDocument();
    fireEvent.click(within(confirmation).getByRole('button', { name: /^annuler la séance$/i }));
    await flush();

    expect(screen.getByRole('heading', { level: 1, name: 'Aujourd’hui' })).toBeInTheDocument();
    expect(await listSessions('ottman')).toHaveLength(0);
    expect(await getActiveSession('ottman')).toBeUndefined();
  });

  it('[8] mettre en pause conserve la séance, et l’accueil permet de la supprimer', async () => {
    await openAsOttman();
    await startDayFromHome('Full Body A');
    await validateSet();

    fireEvent.click(screen.getByRole('button', { name: /quitter la séance/i }));
    await flush();
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: /mettre en pause/i }));
    await flush();

    // La pause conserve tout : la séance reste en cours dans le dépôt.
    const enCours = await listSessions('ottman');
    expect(enCours).toHaveLength(1);
    expect(enCours[0].completedAt).toBeUndefined();

    // Depuis l'accueil, l'action de suppression est distincte de la reprise.
    fireEvent.click(screen.getByRole('button', { name: /^supprimer la séance$/i }));
    await flush();
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: /^annuler la séance$/i }));
    await flush();

    expect(await listSessions('ottman')).toHaveLength(0);
    expect(screen.queryByText(/séance en cours/i)).toBeNull();
  });

  it('[9] liste des exercices : consultable à tout moment, dans l’ordre de la séance', async () => {
    await openAsOttman();
    await startDayFromHome('Full Body A');

    const jour = getProgram('ottman').days.find((item) => item.id === 'full-body-a');
    if (!jour) throw new Error('Séance « Full Body A » introuvable');
    const plan = getWorkoutExercises(jour);

    fireEvent.click(screen.getByRole('button', { name: /voir la liste des exercices/i }));
    await flush();

    const feuille = screen.getByRole('dialog');
    const lignes = within(feuille).getAllByRole('listitem');
    expect(lignes).toHaveLength(plan.length);
    expect(within(feuille).getByText(plan[0].name)).toBeInTheDocument();
    expect(within(feuille).getByText(plan[plan.length - 1].name)).toBeInTheDocument();

    // Un seul mouvement en cours, les suivants annoncés comme à venir.
    expect(within(feuille).getAllByText(/· EN COURS/)).toHaveLength(1);
    expect(within(feuille).getAllByText(/· À VENIR/).length).toBeGreaterThan(0);
    expect(within(lignes[0]).getByText(/· EN COURS/)).toBeInTheDocument();

    // Elle se ferme et reste accessible en cours de séance.
    fireEvent.keyDown(document, { key: 'Escape' });
    await flush();
    expect(screen.queryByRole('dialog')).toBeNull();

    await validateSet();
    fireEvent.click(screen.getByRole('button', { name: /voir la liste des exercices/i }));
    await flush();
    const feuille2 = screen.getByRole('dialog');
    expect(within(feuille2).getByText(/· EN COURS/)).toBeInTheDocument();
  });

  it('[10] machine occupée : l’exercice part à plus tard, et la liste y ramène', async () => {
    await openAsOttman();
    await startDayFromHome('Full Body A');

    const jour = getProgram('ottman').days.find((item) => item.id === 'full-body-a');
    if (!jour) throw new Error('Séance « Full Body A » introuvable');
    const premier = getWorkoutExercises(jour)[0];
    const titre = () => screen.getByRole('heading', { level: 1 }).textContent ?? '';

    expect(titre()).toBe(premier.name);

    // La machine est prise : les trois issues sont derrière une seule entrée
    // depuis la refonte du 6 octobre — décaler, remplacer, passer.
    // Les imprévus vivent dans le menu « Plus d’options » depuis la refonte.
    fireEvent.click(screen.getByRole('button', { name: /plus d’options/i }));
    await flush();
    fireEvent.click(screen.getByRole('button', { name: /je ne peux pas faire cet exercice/i }));
    await flush();
    const choix = screen.getByRole('dialog');
    expect(within(choix).getByText(/la machine est prise/i)).toBeInTheDocument();
    fireEvent.click(within(choix).getByRole('button', { name: /la machine est prise/i }));
    await flush();
    expect(titre()).not.toBe(premier.name);

    // La liste reste le seul endroit d'où l'on peut revenir dessus.
    fireEvent.click(screen.getByRole('button', { name: /voir la liste des exercices/i }));
    await flush();
    const feuille = screen.getByRole('dialog');
    expect(within(feuille).getByText(/· PLUS TARD/)).toBeInTheDocument();

    // Un appui dessus, et on y est — sans attendre que l'ordre le ramène.
    fireEvent.click(within(feuille).getByRole('button', { name: `Aller à ${premier.name}` }));
    await flush();

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(titre()).toBe(premier.name);
    // On est bien revenu dessus, et pas sur une séance déjà faite.
    expect(screen.getByText('REPRISE')).toBeInTheDocument();
  });
});
