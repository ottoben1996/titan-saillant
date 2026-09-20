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
const FULL_BODY_A_STEPS = 26;

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

/** Depuis l'accueil : bouton « Démarrer » puis validation du check-in d'énergie. */
async function startDayFromHome(dayName: string) {
  fireEvent.click(screen.getByRole('button', { name: /^démarrer .+ · \d+ min$/i }));
  await flush();
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: new RegExp(`^démarrer ${dayName}$`, 'i') }),
  );
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
  const cell = screen.getByText(label).closest('.bilan-cell');
  if (!cell) throw new Error(`Cellule de bilan introuvable : ${label}`);
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
    expect(screen.getByRole('heading', { name: /bonjour ottman/i })).toBeInTheDocument();

    await startDayFromHome('Full Body A');

    // --- 1re série : échauffement, compteur de séries, exercice, suite annoncée.
    expect(screen.getByRole('heading', { level: 1, name: 'Coiffe des rotateurs' })).toBeInTheDocument();
    expect(screen.getByText('ÉCHAUFFEMENT · SÉRIE 1')).toBeInTheDocument();
    expect(screen.getByText(`1 / ${FULL_BODY_A_STEPS}`)).toBeInTheDocument();
    expect(screen.getByText(/ensuite : équilibre sur bosu/i)).toBeInTheDocument();

    await validateSet();

    // --- Série d'échauffement validée : on passe à l'exercice suivant, série 1.
    expect(screen.getByRole('heading', { level: 1, name: 'Équilibre sur bosu' })).toBeInTheDocument();
    expect(screen.getByText(`2 / ${FULL_BODY_A_STEPS}`)).toBeInTheDocument();
    expect(screen.getByText('ÉCHAUFFEMENT · SÉRIE 1')).toBeInTheDocument();
    expect(screen.getByText(/compteur tempo/i)).toBeInTheDocument();

    await validateSet();
    // --- Numéro de série qui progresse réellement à l'écran.
    expect(screen.getByText('ÉCHAUFFEMENT · SÉRIE 2')).toBeInTheDocument();
    expect(screen.getByText(`3 / ${FULL_BODY_A_STEPS}`)).toBeInTheDocument();

    await validateSet();
    expect(screen.getByText('ÉCHAUFFEMENT · SÉRIE 3')).toBeInTheDocument();
    await validateSet();
    expect(screen.getByRole('heading', { level: 1, name: 'Rameur' })).toBeInTheDocument();
    expect(screen.getByText(`5 / ${FULL_BODY_A_STEPS}`)).toBeInTheDocument();

    // --- Chrono de repos : après une série prescrite avec repos (30 s).
    await validateSet();
    expect(restBlockVisible()).toBe(true);
    expect(screen.getByText('00:30')).toBeInTheDocument();
    expect(screen.getByLabelText(/à préparer pendant ton repos/i)).toBeInTheDocument();
    await skipRest();
    expect(restBlockVisible()).toBe(false);

    // --- Série d'échauffement d'un exercice de force, puis série de travail.
    expect(screen.getByRole('heading', { level: 1, name: 'Presse à cuisse inclinée' })).toBeInTheDocument();
    expect(screen.getByText('SÉRIE D’ÉCHAUFFEMENT · SÉRIE 1')).toBeInTheDocument();
    await validateSet();
    expect(screen.getByText('01:15')).toBeInTheDocument();
    await skipRest();
    expect(screen.getByText('SÉRIE D’ÉCHAUFFEMENT · SÉRIE 2')).toBeInTheDocument();
    await validateSet();
    expect(screen.getByText('01:15')).toBeInTheDocument();
    await skipRest();

    // --- Série de TRAVAIL : charge saisie par l'utilisateur.
    expect(screen.getByText('SÉRIE DE TRAVAIL · SÉRIE 3')).toBeInTheDocument();
    expect(screen.getByText(`8 / ${FULL_BODY_A_STEPS}`)).toBeInTheDocument();
    expect(screen.getByText('Charge (kg)')).toBeInTheDocument();
    const loadInput = screen.getByDisplayValue('110');
    expect(loadInput).toHaveValue('110');
    // Les boutons de charge portent un libellé explicite pour les lecteurs d'écran,
    // et leurs paliers suivent le mouvement : 5 et 2,5 kg sur la presse à cuisse.
    fireEvent.click(screen.getByRole('button', { name: /augmenter la charge de 5 kg/i }));
    expect(screen.getByDisplayValue('115')).toHaveValue('115');
    expect(screen.getByRole('button', { name: /augmenter la charge de 2,5 kg/i })).toBeInTheDocument();

    await validateSet();
    // --- Repos long prescrit (135 s) affiché au chrono.
    expect(restBlockVisible()).toBe(true);
    expect(screen.getByText('02:15')).toBeInTheDocument();
    await skipRest();
    expect(screen.getByText('SÉRIE DE TRAVAIL · SÉRIE 4')).toBeInTheDocument();

    // --- Jusqu'à la fin de séance.
    await completeRemainingSets();

    expect(screen.getByText('SÉANCE TERMINÉE')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /bilan de full body a/i })).toBeInTheDocument();
    expect(within(bilanCell(/séries validées/i)).getByText(String(FULL_BODY_A_STEPS))).toBeInTheDocument();
    expect(within(bilanCell(/meilleure charge/i)).getByText('115 kg')).toBeInTheDocument();
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
    expect(screen.getByText(`3 / ${FULL_BODY_A_STEPS}`)).toBeInTheDocument();

    // Démonte puis remonte l'application (comme une fermeture / réouverture).
    unmount();
    render(<App />);
    await flush();

    // Pas de sélecteur de profil : le profil est mémorisé, la séance en cours est restaurée.
    expect(screen.queryByRole('heading', { name: /choisis ton profil/i })).toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: 'Équilibre sur bosu' })).toBeInTheDocument();
    expect(screen.getByText('ÉCHAUFFEMENT · SÉRIE 2')).toBeInTheDocument();
    expect(screen.getByText(`3 / ${FULL_BODY_A_STEPS}`)).toBeInTheDocument();

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
    expect(screen.getByText(`2 / ${FULL_BODY_A_STEPS}`)).toBeInTheDocument();

    // --- Mettre en pause : retour à l'accueil.
    fireEvent.click(screen.getByRole('button', { name: /quitter la séance/i }));
    await flush();
    fireEvent.click(screen.getByRole('button', { name: /mettre en pause/i }));
    await flush();

    expect(screen.getByRole('heading', { name: /bonjour ottman/i })).toBeInTheDocument();
    expect(screen.getByText(/séance mise en pause/i)).toBeInTheDocument();

    // --- L'accueil propose de reprendre, avec le nombre de séries déjà validées.
    const resumeButton = screen.getByRole('button', { name: /séance en cours/i });
    expect(resumeButton).toHaveTextContent(/1 séries déjà validées/);
    expect(resumeButton).toHaveTextContent(/reprendre là où tu t’es arrêté/i);
    // La même bannière propose de supprimer la séance, via une action distincte.
    expect(screen.getByRole('button', { name: /^supprimer la séance$/i })).toBeInTheDocument();

    // --- La reprise ramène au bon exercice, à la bonne série.
    fireEvent.click(resumeButton);
    await flush();
    expect(screen.getByRole('heading', { level: 1, name: 'Équilibre sur bosu' })).toBeInTheDocument();
    expect(screen.getByText('ÉCHAUFFEMENT · SÉRIE 1')).toBeInTheDocument();
    expect(screen.getByText(`2 / ${FULL_BODY_A_STEPS}`)).toBeInTheDocument();
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
    expect(screen.getByRole('heading', { name: /bonjour laura/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Historique' }));
    await flush();
    expect(screen.getByRole('heading', { name: /aucune séance enregistrée/i })).toBeInTheDocument();
    expect(screen.queryByText('Full Body A')).toBeNull();
    expect(screen.queryByText('Séance terminée')).toBeNull();

    // --- Bascule vers Ottman via l'interface : sa séance apparaît.
    fireEvent.click(screen.getByRole('button', { name: /retour à l’accueil/i }));
    await flush();
    // La confirmation est désormais un dialogue DE L'APPLICATION (plus de
    // window.confirm natif) : on le pilote comme un utilisateur.
    fireEvent.click(screen.getByRole('button', { name: /changer de profil/i }));
    await flush();
    const confirmDialog = screen.getByRole('alertdialog');
    expect(within(confirmDialog).getByRole('heading', { name: /changer de profil/i })).toBeInTheDocument();
    fireEvent.click(within(confirmDialog).getByRole('button', { name: /changer de profil/i }));
    await flush();
    fireEvent.click(screen.getByRole('button', { name: /ottman/i }));
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Historique' }));
    await flush();

    expect(screen.getByText('Full Body A')).toBeInTheDocument();
    expect(screen.getByText('Séance terminée')).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${FULL_BODY_A_STEPS} séries`))).toBeInTheDocument();

    // --- Isolation vérifiée aussi au niveau du dépôt.
    expect(await listSessions('ottman')).toHaveLength(1);
    expect(await listSessions('laura')).toHaveLength(0);
  });

  it('[4b] le sélecteur duo de Progression conserve l’écran de progression', async () => {
    await openAsOttman();
    fireEvent.click(screen.getByRole('button', { name: 'Progression' }));
    await flush();

    expect(screen.getByRole('heading', { level: 1, name: 'Ottman' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Laura' }));
    await flush();

    expect(screen.getByRole('heading', { level: 1, name: 'Laura' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Progression' })).toHaveAttribute('aria-current', 'page');
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
    expect(bilanCell(/meilleure charge/i)).toHaveTextContent('110 kg');
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

    expect(screen.getByRole('heading', { name: /bonjour ottman/i })).toBeInTheDocument();
    expect(screen.getByText(/bilan enregistré/i)).toBeInTheDocument();
    // Le créneau du jour est validé dans le rail de la semaine.
    expect(screen.getByRole('button', { name: /full body a — terminée/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Historique' }));
    await flush();
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

  /* ------------------------------------------------------------------------- *\
   |  DÉFAUT DOCUMENTÉ — test maintenu en `it.fails` tant que le défaut existe.  |
   |  Le jour où le comportement attendu est implémenté, ce test échouera et     |
   |  signalera qu'il faut le repasser en `it`.                                  |
   \* ------------------------------------------------------------------------- */

  it('[6] démarrer une 2e séance clôture la précédente : une seule séance reste en cours (orpheline corrigée)', async () => {
    await openAsOttman();
    await startDayFromHome('Full Body A');
    await validateSet(); // une série validée → la séance A existe en base

    // Mise en pause de la séance A : elle reste « en cours » dans le dépôt.
    fireEvent.click(screen.getByRole('button', { name: /quitter la séance/i }));
    await flush();
    fireEvent.click(screen.getByRole('button', { name: /mettre en pause/i }));
    await flush();

    // Depuis l'accueil, l'utilisateur peut démarrer un AUTRE créneau :
    // le bandeau de reprise n'empêche pas le rail de semaine d'être cliquable
    // et confirmWorkoutStart (App.tsx:279) ne vérifie aucune séance en cours.
    fireEvent.click(screen.getByRole('button', { name: /full body b/i }));
    await flush();
    fireEvent.click(screen.getByRole('button', { name: /démarrer full body b/i }));
    await flush();

    // La séance B est bien ouverte : les deux séances de musculation partagent
    // le même échauffement, on vérifie donc la séance réellement en base plutôt
    // qu'un titre d'exercice, plus robuste et plus proche du comportement attendu.
    expect(document.querySelector('.workout-shell')).not.toBeNull();
    const inProgress = (await listSessions('ottman')).filter((item) => !item.completedAt);
    expect(inProgress).toHaveLength(1);
    expect(inProgress[0].dayId).toBe('full-body-b');
    expect(inProgress[0].loggedSets).toHaveLength(0);
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

    expect(screen.getByRole('heading', { name: /bonjour ottman/i })).toBeInTheDocument();
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
});
