import { useEffect, useState } from 'react';
import { BilanScreen } from './components/screens/BilanScreen';
import { FollowupScreen } from './components/screens/FollowupScreen';
import { equipmentAlternatives } from './domain/alternatives';
import type { WeeklyMeasurement } from './domain/measurements';
import type { AccentId } from './domain/palettes';
import { getProgram } from './domain/programs';
import { tutorials } from './domain/tutorials';
import type { ProfileId, SessionTimerState, WorkoutDay, WorkoutSession } from './domain/types';
import { enregistrerAccent, lireAccent } from './storage/accentPreference';
import { telechargerSauvegarde } from './storage/backupFile';
import { etatSauvegarde, reporterSauvegarde } from './storage/backupReminder';
import { STORAGE_UNAVAILABLE_MESSAGE, withStorageGuard } from './storage/guard';
import { listMeasurements, saveMeasurement, seedMeasurementsIfEmpty } from './storage/measurementRepository';
import { enregistrerSemaineProgramme, lireSemaineProgramme } from './storage/programWeek';
import { deleteSession, getActiveSession, listSessions, saveSession } from './storage/sessionRepository';
import { playTimerChime, timerTitle, vibrateTimer } from './workout/alerts';
import { serieAssiduite } from './workout/assiduite';
import { completeSet, createRunner, getNextStep, getWorkoutExercises } from './workout/runner';
import { restoreRemainingSeconds } from './workout/timer';

// L'espace MUSTAPHA est aiguillé depuis main.tsx, avant le montage : un retour
// anticipé ici placerait tous les hooks de cette application sous condition.

import { BottomNav, type Screen } from './components/layout/BottomNav';
import { TopBar } from './components/layout/TopBar';
import { AlternativeModal } from './components/modals/AlternativeModal';
import { EnergyCheckinModal, type EnergyLevel } from './components/modals/EnergyCheckinModal';
import { ExitWorkoutDialog } from './components/modals/ExitWorkoutDialog';
import { TutorialModal } from './components/modals/TutorialModal';
import { HistoryScreen } from './components/screens/HistoryScreen';
import { HomeScreen } from './components/screens/HomeScreen';
import { ProfileChooser } from './components/screens/ProfileChooser';
import { ProgressionScreen } from './components/screens/ProgressionScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { WorkoutScreen } from './components/screens/WorkoutScreen';
import { ConfirmDialog } from './components/ui/ConfirmDialog';
import { Check } from './components/ui/Icons';
import { useSensEcran } from './components/ui/transitionEcran';
import { useEnTeteReplie } from './components/ui/useEnTeteReplie';
import { useRetourAuBord } from './components/ui/useRetourAuBord';

const profileKey = 'coach-active-profile';
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export default function App() {
  const [profile, setProfile] = useState<ProfileId | null>(() => {
    const saved = localStorage.getItem(profileKey);
    return saved === 'ottman' || saved === 'laura' ? saved : null;
  });

  /**
   * L'accent de l'application suit le profil actif : lime pour Ottman, lilas
   * pastel pour Laura. Tout passe par l'attribut `data-profile` sur <html> et
   * les variables CSS — les composants n'ont rien à savoir du profil.
   * La couleur de la barre système suit aussi, sinon le navigateur garderait
   * le vert lime au-dessus d'une interface lilas.
   */
  /** Couleur d'affichage du profil actif, choisie dans les réglages. */
  const [accent, setAccent] = useState<AccentId>(() => (profile ? lireAccent(profile) : 'vert'));

  useEffect(() => {
    const root = document.documentElement;
    if (profile) {
      root.dataset.profile = profile;
      // La couleur choisie dans les réglages prend le pas sur celle du profil.
      root.dataset.accent = accent;
    } else {
      delete root.dataset.profile;
      delete root.dataset.accent;
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      const accentApplique = getComputedStyle(root).getPropertyValue('--accent').trim();
      if (accentApplique) meta.setAttribute('content', accentApplique);
    }
  }, [profile, accent]);

  /** À chaque changement de profil, on reprend la couleur que ce profil a choisie. */
  useEffect(() => {
    if (profile) setAccent(lireAccent(profile));
  }, [profile]);

  const changerAccent = (choisi: AccentId) => {
    setAccent(choisi);
    if (profile) enregistrerAccent(profile, choisi);
  };

  const [screen, setScreen] = useState<Screen>('home');
  /** Points hebdomadaires du profil actif, du plus ancien au plus récent. */
  const [measurements, setMeasurements] = useState<WeeklyMeasurement[]>([]);
  /** Semaine ouverte dans le bilan imprimable. */
  const [bilanTarget, setBilanTarget] = useState<WeeklyMeasurement | null>(null);
  const [selectedDay, setSelectedDay] = useState<WorkoutDay | null>(null);
  const [pendingDay, setPendingDay] = useState<WorkoutDay | null>(null);
  const [restMultiplier, setRestMultiplier] = useState<number>(1.0);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [history, setHistory] = useState<WorkoutSession[]>([]);
  /** Semaine de charges choisie pour les prochaines séances du profil. */
  const [programWeek, setProgramWeek] = useState(1);

  /**
   * Faut-il proposer une sauvegarde ? La décision appartient au module de
   * rappel : huit séances minimum, une fois par mois, et une semaine de silence
   * après un « plus tard ».
   */
  useEffect(() => {
    if (!profile) {
      setRappelSauvegarde({ proposer: false });
      return;
    }
    const terminees = history.filter((item) => item.completedAt).length;
    setRappelSauvegarde(etatSauvegarde(profile, terminees));
  }, [profile, history]);

  const exporterSauvegarde = async () => {
    if (!profile) return;
    await telechargerSauvegarde(profile);
    setRappelSauvegarde({ proposer: false });
    setNotice('Sauvegarde exportée.');
    window.setTimeout(() => setNotice(''), 3500);
  };

  const reporterSauvegardePlusTard = () => {
    if (!profile) return;
    reporterSauvegarde(profile);
    setRappelSauvegarde({ proposer: false });
  };

  const [tutorialId, setTutorialId] = useState<string | null>(null);
  const [alternativeId, setAlternativeId] = useState<string | null>(null);
  const [restSeconds, setRestSeconds] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [notice, setNotice] = useState('');
  /** Rappel de sauvegarde : proposé seulement quand les données valent la peine. */
  /** Faux jusqu'à la première lecture de l'historique. */
  const [historiqueCharge, setHistoriqueCharge] = useState(false);
  const [rappelSauvegarde, setRappelSauvegarde] = useState<{ proposer: boolean; joursDepuisExport?: number }>({
    proposer: false,
  });
  const [exitPromptOpen, setExitPromptOpen] = useState(false);

  const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [offlineReady, setOfflineReady] = useState(false);
  const [serviceWorkerReady, setServiceWorkerReady] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  );

  const [storageMessage, setStorageMessage] = useState('');
  const [updateReady, setUpdateReady] = useState(false);
  const [confirmSwitchOpen, setConfirmSwitchOpen] = useState(false);
  const [abandonOpen, setAbandonOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  const onStorageFailure = () => setStorageMessage(STORAGE_UNAVAILABLE_MESSAGE);

  // La barre du haut se pose et le grand titre s'efface : tout est du CSS,
  // piloté par un attribut sur la racine.
  useEnTeteReplie();

  /** Ce qu'un lecteur d'écran annonce quand on change d'écran. */
  const libellesEcran: Record<Screen, string> = {
    home: 'Accueil',
    workout: 'Séance en cours',
    history: 'Historique des séances',
    progression: 'Progression',
    followup: 'Point du samedi',
    bilan: 'Bilan de la semaine',
    settings: 'Réglages',
  };
  const libelleEcran = `${profile === 'laura' ? 'Espace de Laura' : profile === 'ottman' ? 'Espace d\u2019Ottman' : 'Choix du profil'}, ${libellesEcran[screen] ?? ''}`;

  const persist = (sessionToSave: WorkoutSession) =>
    void withStorageGuard(saveSession(sessionToSave), onStorageFailure, undefined);

  const refreshHistory = async (id: ProfileId) => {
    setHistory(await withStorageGuard(listSessions(id), onStorageFailure, []));
    // L'écran d'accueil attend cette première lecture : tant qu'elle n'est pas
    // revenue, il montre une silhouette plutôt qu'une page qui se remplit.
    setHistoriqueCharge(true);
  };

  useEffect(() => {
    if (!profile) return;
    setProgramWeek(lireSemaineProgramme(profile));
    setHistoriqueCharge(false);
    void refreshHistory(profile);
    // Reprise de l'historique de la feuille de suivi au premier lancement, puis
    // lecture des points enregistrés (revalider une semaine remplace la valeur).
    void withStorageGuard(seedMeasurementsIfEmpty(profile), onStorageFailure, 0).then(() =>
      withStorageGuard(listMeasurements(profile), onStorageFailure, []).then(setMeasurements),
    );
    void withStorageGuard(getActiveSession(profile), onStorageFailure, undefined).then((active) => {
      if (!active) return;
      const restoredTimer = active.activeTimer
        ? { ...active.activeTimer, remainingSeconds: restoreRemainingSeconds(active.activeTimer) }
        : undefined;
      const restored = restoredTimer ? { ...active, activeTimer: restoredTimer } : active;
      setSession(restored);

      // Reprise directe anti-crash : restauration immédiate sur la séance en cours
      if (!active.completedAt) {
        const prog = getProgram(profile, active.programWeek ?? lireSemaineProgramme(profile));
        const day = prog.days.find((d) => d.id === active.dayId);
        if (day) {
          setSelectedDay(day);
          setScreen('workout');
        }
      }

      if (restored.activeTimer?.kind === 'rest' && restored.activeTimer.remainingSeconds > 0) {
        setRestSeconds(restored.activeTimer.remainingSeconds);
        setIsResting(true);
      } else {
        setRestSeconds(0);
        setIsResting(false);
      }
      if (restoredTimer && restoredTimer.remainingSeconds <= 0) {
        persist({ ...restored, activeTimer: undefined, updatedAt: new Date().toISOString() });
      }
    });
  }, [profile]);

  useEffect(() => {
    const onOfflineReady = () => setOfflineReady(true);
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('coach-offline-ready', onOfflineReady);
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.ready.then(() => setServiceWorkerReady(true));
    }
    return () => {
      window.removeEventListener('coach-offline-ready', onOfflineReady);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
    };
  }, []);

  useEffect(() => {
    // L'application signale au service worker qu'une séance est en cours :
    // une mise à jour attend alors au lieu de recharger l'écran.
    document.documentElement.dataset.coachBusy = screen === 'workout' ? 'true' : 'false';
  }, [screen]);

  useEffect(() => {
    const onUpdatePending = () => setUpdateReady(true);
    window.addEventListener('coach-update-pending', onUpdatePending);
    return () => window.removeEventListener('coach-update-pending', onUpdatePending);
  }, []);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    const persistBeforePageHide = () => {
      if (session) persist({ ...session, updatedAt: new Date().toISOString() });
    };
    window.addEventListener('pagehide', persistBeforePageHide);
    return () => window.removeEventListener('pagehide', persistBeforePageHide);
  }, [session]);

  // Wake Lock résilient avec ré-acquisition automatique
  useEffect(() => {
    if (screen !== 'workout') return;
    let released = false;
    let sentinel: {
      release: () => Promise<void>;
      addEventListener?: (type: string, listener: () => void) => void;
      removeEventListener?: (type: string, listener: () => void) => void;
    } | null = null;

    const requestWakeLock = async () => {
      const wakeLock = (
        navigator as Navigator & {
          wakeLock?: { request: (type: 'screen') => Promise<typeof sentinel> };
        }
      ).wakeLock;

      if (!wakeLock || document.visibilityState !== 'visible' || released) return;
      try {
        sentinel = await wakeLock.request('screen');
        sentinel?.addEventListener?.('release', () => {
          sentinel = null;
          if (!released && document.visibilityState === 'visible') {
            void requestWakeLock();
          }
        });
      } catch {
        /* économie d'énergie */
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void requestWakeLock();
    };

    void requestWakeLock();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pageshow', onVisibility);

    return () => {
      released = true;
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pageshow', onVisibility);
      const current = sentinel;
      sentinel = null;
      if (current) void current.release();
    };
  }, [screen]);

  /**
   * Enregistrement d'un point hebdomadaire.
   *
   * L'état est mis à jour tout de suite, l'écriture en base suit : une semaine
   * revalidée remplace la précédente, jamais ne la duplique.
   */
  const saveFollowup = (measurement: WeeklyMeasurement) => {
    setMeasurements((current) =>
      [...current.filter((item) => item.id !== measurement.id), measurement].sort((a, b) =>
        a.cycle === b.cycle ? a.week - b.week : a.cycle - b.cycle,
      ),
    );
    void withStorageGuard(saveMeasurement(measurement), onStorageFailure, undefined);
  };

  const chooseProfile = (next: ProfileId) => {
    localStorage.setItem(profileKey, next);
    setProfile(next);
    setScreen('home');
    setSession(null);
  };

  const leaveProfile = () => {
    localStorage.removeItem(profileKey);
    setProfile(null);
    setSession(null);
    setHistory([]);
  };

  const switchDuoProfile = async (target: ProfileId, fallbackScreen: Screen = 'home') => {
    if (target === profile) return;
    if (session) {
      await withStorageGuard(
        saveSession({ ...session, updatedAt: new Date().toISOString() }),
        onStorageFailure,
        undefined,
      );
    }
    localStorage.setItem(profileKey, target);
    setProfile(target);
    const targetWeek = lireSemaineProgramme(target);
    setProgramWeek(targetWeek);
    const targetHistory = await listSessions(target);
    setHistory(targetHistory);
    const active = await getActiveSession(target);
    const targetProgram = getProgram(target, targetWeek);
    if (active) {
      const restoredTimer = active.activeTimer
        ? { ...active.activeTimer, remainingSeconds: restoreRemainingSeconds(active.activeTimer) }
        : undefined;
      const restored = restoredTimer ? { ...active, activeTimer: restoredTimer } : active;
      setSession(restored);
      const day = targetProgram.days.find((item) => item.id === restored.dayId);
      if (day) setSelectedDay(day);
      if (restored.activeTimer?.kind === 'rest' && restored.activeTimer.remainingSeconds > 0) {
        setRestSeconds(restored.activeTimer.remainingSeconds);
        setIsResting(true);
      } else {
        setRestSeconds(0);
        setIsResting(false);
      }
      setScreen('workout');
    } else {
      setSession(null);
      setSelectedDay(null);
      setScreen(fallbackScreen);
      setNotice(`Session ${target === 'ottman' ? 'Ottman' : 'Laura'} : choisis ta séance.`);
      window.setTimeout(() => setNotice(''), 3000);
    }
  };

  // Sens du passage entre écrans : iOS commute net entre onglets, mais fait
  // venir un écran ouvert depuis la droite. Le geste de retour au bord, lui,
  // agit exactement comme le bouton de la barre du haut.
  const sensEcran = useSensEcran(screen);
  const retourBord = useRetourAuBord({ actif: screen !== 'home', onRetour: handleTopbarBack });

  if (!profile) return <ProfileChooser onChoose={chooseProfile} />;

  const program = getProgram(profile, programWeek);

  const changeProgramWeek = (week: number) => {
    if (session && !session.completedAt) {
      setNotice('Termine ou mets en pause la séance avant de changer de semaine.');
      window.setTimeout(() => setNotice(''), 3500);
      return;
    }
    setProgramWeek(week);
    enregistrerSemaineProgramme(profile, week);
  };

  const handleInitiateStart = (day: WorkoutDay) => {
    setPendingDay(day);
  };

  const confirmWorkoutStart = (energy: EnergyLevel, multiplier: number) => {
    if (!pendingDay) return;

    // Une seule séance peut rester en cours. Sans cette clôture, démarrer un autre
    // créneau laissait deux séances « en cours » : la première devenait impossible
    // à terminer ou à supprimer depuis l'interface. Ses séries validées, elles,
    // sont réelles et restent dans l'historique.
    if (session && !session.completedAt) {
      const closed: WorkoutSession = {
        ...session,
        completedAt: new Date().toISOString(),
        activeTimer: undefined,
        updatedAt: new Date().toISOString(),
      };
      void withStorageGuard(saveSession(closed), onStorageFailure, undefined);
      setNotice('Séance précédente clôturée. Ses séries validées restent dans l’historique.');
      window.setTimeout(() => setNotice(''), 4000);
    }

    const fresh = createRunner(pendingDay, profile, programWeek);
    setSelectedDay(pendingDay);
    setRestMultiplier(multiplier);
    setSession(fresh);
    persist(fresh);
    setPendingDay(null);
    setScreen('workout');

    if (energy === 'low') {
      setNotice('Mode Récupération actif : repos allongés (+20%).');
      window.setTimeout(() => setNotice(''), 3500);
    }
  };

  const resumeWorkout = () => {
    if (!session) return;
    const sessionProgram = getProgram(profile, session.programWeek ?? programWeek);
    const day = sessionProgram.days.find((item) => item.id === session.dayId);
    if (!day) return;
    const restoredTimer = session.activeTimer
      ? { ...session.activeTimer, remainingSeconds: restoreRemainingSeconds(session.activeTimer) }
      : undefined;
    const currentSession = restoredTimer ? { ...session, activeTimer: restoredTimer } : session;
    if (currentSession.activeTimer?.kind === 'rest' && currentSession.activeTimer.remainingSeconds > 0) {
      setRestSeconds(currentSession.activeTimer.remainingSeconds);
      setIsResting(true);
    } else {
      setIsResting(false);
      setRestSeconds(0);
    }
    setSession(currentSession);
    setSelectedDay(day);
    setScreen('workout');
  };

  const pauseWorkout = () => {
    if (!session) return;
    persist(session);
    setExitPromptOpen(false);
    setScreen('home');
    setSelectedDay(null);
    setIsResting(false);
    setNotice('Séance mise en pause. Tu peux la reprendre quand tu veux.');
    window.setTimeout(() => setNotice(''), 3500);
  };

  /**
   * Annule la séance en cours : elle a souvent été lancée par erreur, ou la
   * journée ne s'y prête plus. Ses séries validées sont supprimées et elle ne
   * rejoint ni l'historique ni la progression — contrairement à la mise en
   * pause, qui conserve tout pour reprendre plus tard.
   */
  const abandonWorkout = async () => {
    const target = session;
    setAbandonOpen(false);
    setExitPromptOpen(false);
    setSession(null);
    setSelectedDay(null);
    setIsResting(false);
    setScreen('home');
    if (target) {
      await withStorageGuard(deleteSession(target.id), onStorageFailure, undefined);
      if (profile) await refreshHistory(profile);
    }
    setNotice('Séance annulée. Elle n’apparaîtra ni dans l’historique ni dans ta progression.');
    window.setTimeout(() => setNotice(''), 4000);
  };

  /** Retire une séance de l'historique (lancée par erreur, doublon, séance abandonnée). */
  const removeSession = async (sessionId: string) => {
    setSessionToDelete(null);
    await withStorageGuard(deleteSession(sessionId), onStorageFailure, undefined);
    if (session?.id === sessionId) {
      setSession(null);
      setSelectedDay(null);
      setScreen('home');
    }
    if (profile) await refreshHistory(profile);
    setNotice('Séance supprimée.');
    window.setTimeout(() => setNotice(''), 3500);
  };

  /**
   * Recherche une mise à jour à la demande, depuis Réglages : un geste
   * explicite quand on veut vérifier au lieu d'attendre la vérification
   * automatique (au retour au premier plan).
   */
  const checkForUpdate = () => {
    if (!('serviceWorker' in navigator)) {
      setNotice('Mise à jour indisponible dans ce navigateur.');
      window.setTimeout(() => setNotice(''), 3500);
      return;
    }
    const show = (message: string) => {
      setNotice(message);
      window.setTimeout(() => setNotice(''), 4500);
    };

    void (async () => {
      try {
        // Comparaison directe avec la version publiée : le manifeste du service
        // worker en ligne nomme le lot de code attendu. Plus fiable que le cycle
        // d'installation, qui peut rester bloqué sur un vieux cache.
        const running = performance
          .getEntriesByType('resource')
          .map((entry) => entry.name)
          .find((name) => /assets\/index-[A-Za-z0-9_-]+\.js/.test(name));
        const swSource = await (await fetch(`${import.meta.env.BASE_URL}sw.js`, { cache: 'no-store' })).text();
        const published = swSource.match(/assets\/index-[A-Za-z0-9_-]+\.js/)?.[0];

        if (published && running && !running.includes(published)) {
          show('Nouvelle version trouvée : rechargement…');
          window.setTimeout(() => window.dispatchEvent(new Event('coach-force-update')), 700);
          return;
        }

        const registration = await navigator.serviceWorker.getRegistration();
        await registration?.update();
        show('Application à jour.');
      } catch {
        show('Recherche impossible (connexion indisponible).');
      }
    })();
  };

  const finishSet = async (values: { repetitions?: number; durationSeconds?: number; loadKg?: number }) => {
    if (!session || !selectedDay) return;
    const step = getNextStep(session, selectedDay);
    if (step.kind !== 'exercise' || step.exerciseIndex === undefined || step.setIndex === undefined) return;
    const exercise = getWorkoutExercises(selectedDay, session)[step.exerciseIndex];
    const updated = completeSet(session, selectedDay, {
      exerciseId: exercise.id,
      setIndex: step.setIndex,
      actualRepetitions: values.repetitions,
      actualDurationSeconds: values.durationSeconds,
      actualLoadKg: values.loadKg,
    });
    setSession(updated);
    await withStorageGuard(saveSession(updated), onStorageFailure, undefined);
    await refreshHistory(profile);

    const rawPrescribedRest = exercise.sets[step.setIndex]?.restSeconds ?? exercise.restAfterSeconds ?? 0;
    const effectiveRest = Math.round(rawPrescribedRest * restMultiplier);

    if (effectiveRest > 0 && !updated.completedAt) {
      const withTimer: WorkoutSession = {
        ...updated,
        activeTimer: {
          kind: 'rest',
          exerciseId: exercise.id,
          setIndex: step.setIndex,
          remainingSeconds: effectiveRest,
          paused: false,
          updatedAt: new Date().toISOString(),
        },
      };
      setSession(withTimer);
      await withStorageGuard(saveSession(withTimer), onStorageFailure, undefined);
      setRestSeconds(effectiveRest);
      setIsResting(true);
    }
  };

  const markAlternativeUsed = (alternativeExerciseId: string, suggestedLoadKg?: number) => {
    if (!session) return;
    const used = session.alternativesUsed ?? [];
    if (used.includes(alternativeExerciseId)) return;
    const updated: WorkoutSession = {
      ...session,
      alternativesUsed: [...used, alternativeExerciseId],
      updatedAt: new Date().toISOString(),
    };
    setSession(updated);
    persist(updated);
    if (suggestedLoadKg) {
      setNotice(`Alternative activée (charge suggérée : ${suggestedLoadKg} kg)`);
      window.setTimeout(() => setNotice(''), 3500);
    }
  };

  const revertAlternative = (exerciseId: string) => {
    if (!session) return;
    const used = (session.alternativesUsed ?? []).filter((id) => id !== exerciseId);
    const updated: WorkoutSession = {
      ...session,
      alternativesUsed: used,
      updatedAt: new Date().toISOString(),
    };
    setSession(updated);
    persist(updated);
    setNotice('Retour au mouvement original.');
    window.setTimeout(() => setNotice(''), 3000);
  };

  const handleTimerStateChange = (state: SessionTimerState | null) => {
    if (!session) return;
    const previousRemaining = session.activeTimer?.remainingSeconds ?? 0;
    const isStateTransition =
      !state ||
      session.activeTimer?.paused !== state.paused ||
      session.activeTimer?.kind !== state.kind ||
      state.remainingSeconds === 0 ||
      (Boolean(session.activeTimer) && state.remainingSeconds > previousRemaining);

    const updated = { ...session, activeTimer: state ?? undefined, updatedAt: new Date().toISOString() };
    setSession(updated);

    if (isStateTransition) {
      persist(updated);
    }

    if (state?.kind !== 'rest' || state.remainingSeconds <= 0) {
      setIsResting(false);
      setRestSeconds(0);
    } else {
      setRestSeconds(state.remainingSeconds);
    }
  };

  const notifyTimerDone = (kind: 'rest' | 'tempo' = 'rest') => {
    const message =
      kind === 'tempo'
        ? 'Temps terminé. Tu peux valider la série.'
        : 'Repos terminé. Tu peux reprendre la prochaine série.';

    vibrateTimer(kind);
    playTimerChime(kind);

    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification(kind === 'tempo' ? 'Coach · tempo terminé' : 'Coach · repos terminé', {
          body: message,
          icon: `${import.meta.env.BASE_URL}icons/logo-mark.png`,
          tag: 'coach-timer',
        });
      } catch {
        /* notifications */
      }
    }

    const previousTitle = document.title;
    const alertTitle = timerTitle(kind);
    document.title = alertTitle;
    window.setTimeout(() => {
      if (document.title === alertTitle) {
        document.title = previousTitle;
      }
    }, 3500);
  };

  const installApp = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const enableNotifications = async () => {
    if (typeof Notification === 'undefined') {
      setNotificationPermission('unsupported');
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    setNotice(permission === 'granted' ? 'Alertes activées.' : 'Alertes non activées.');
    window.setTimeout(() => setNotice(''), 3500);
  };

  const finishWorkout = async (
    feedback?: Pick<
      WorkoutSession,
      'perceivedExertion' | 'energy' | 'pain' | 'painLocation' | 'loadConsigne' | 'notes'
    >,
  ) => {
    if (session) {
      const updated: WorkoutSession = {
        ...session,
        ...feedback,
        activeTimer: undefined,
        updatedAt: new Date().toISOString(),
      };
      setSession(updated);
      await withStorageGuard(saveSession(updated), onStorageFailure, undefined);
      await refreshHistory(profile);
    }
    setExitPromptOpen(false);
    setScreen('home');
    setSelectedDay(null);
    setSession(null);
    setIsResting(false);
    setNotice(feedback ? 'Bilan enregistré. Beau travail.' : 'Séance enregistrée. Beau travail.');
    window.setTimeout(() => setNotice(''), 3500);
  };

  // Déclaration hissée, et non constante : les hooks qui suivent l'appellent,
  // et ils doivent être appelés avant le retour anticipé du choix de profil.
  function handleTopbarBack() {
    if (tutorialId) return setTutorialId(null);
    if (alternativeId) return setAlternativeId(null);
    if (screen === 'workout') return setExitPromptOpen(true);
    if (screen === 'home') {
      // Confirmation dans l'application : le dialogue natif du navigateur sort du
      // design system et bloque la page sur mobile.
      setConfirmSwitchOpen(true);
      return;
    }
    setScreen('home');
  }

  const topbarLabel =
    tutorialId || alternativeId
      ? 'Retour à la séance'
      : screen === 'workout'
        ? 'Quitter la séance'
        : screen === 'home'
          ? 'Changer de profil'
          : 'Retour à l’accueil';

  const currentExerciseForAlternative =
    alternativeId && selectedDay && session
      ? getWorkoutExercises(selectedDay, session).find((e) => e.id === alternativeId)
      : null;

  return (
    <main
      className={`app-shell ${screen === 'workout' ? 'workout-shell' : ''}`}
      data-sens={sensEcran}
      {...retourBord.props}
      style={retourBord.decalage ? { translate: `${retourBord.decalage}px` } : undefined}
    >
      {/* Un lecteur d'écran ne voit pas un changement de page : il faut le dire.
          `polite` attend la fin de la phrase en cours, `role="status"` évite
          d'interrompre une saisie. */}
      <p className="sr-only" role="status" aria-live="polite">
        {libelleEcran}
      </p>
      <TopBar
        onBack={handleTopbarBack}
        backLabel={topbarLabel}
        isOnline={isOnline}
        titre={libellesEcran[screen]}
        onOpenSettings={() => setScreen('settings')}
      />

      {updateReady && screen !== 'workout' && (
        <div className="update-banner" role="status">
          <span>Une version plus récente est prête.</span>
          <button type="button" onClick={() => window.dispatchEvent(new Event('coach-force-update'))}>
            Mettre à jour
          </button>
        </div>
      )}

      {storageMessage && (
        <div className="storage-alert" role="alert">
          {storageMessage}
        </div>
      )}

      {notice && (
        <div className="toast" role="status">
          <Check size={18} /> {notice}
        </div>
      )}

      {screen === 'home' && (
        <HomeScreen
          profile={profile}
          program={program}
          history={history}
          chargement={!historiqueCharge}
          activeSession={session}
          onStart={handleInitiateStart}
          onResume={resumeWorkout}
          onDiscard={() => setAbandonOpen(true)}
          serie={serieAssiduite(history, program, new Date())}
          programWeek={programWeek}
          onProgramWeekChange={changeProgramWeek}
          sauvegarde={
            rappelSauvegarde.proposer
              ? {
                  sessions: history.filter((item) => item.completedAt).length,
                  joursDepuisExport: rappelSauvegarde.joursDepuisExport,
                  onExport: () => void exporterSauvegarde(),
                  onLater: reporterSauvegardePlusTard,
                }
              : undefined
          }
        />
      )}

      {screen === 'workout' && selectedDay && session && (
        <WorkoutScreen
          profile={profile}
          onSwitchDuoProfile={(target) => switchDuoProfile(target)}
          day={selectedDay}
          session={session}
          history={history}
          resting={isResting}
          restSeconds={restSeconds}
          /* Seuls les panneaux ouverts dans l'application suspendent le chrono.
             Le passage en arrière-plan, lui, ne l'arrête plus : le temps réel
             continue de s'écouler (voir ExerciseTimer et RestTimer). */
          timerSuspended={Boolean(tutorialId || alternativeId)}
          modalOpen={Boolean(tutorialId || alternativeId)}
          onTimerStateChange={handleTimerStateChange}
          onTimerDone={notifyTimerDone}
          onCompleteSet={finishSet}
          onTutorial={setTutorialId}
          onAlternative={setAlternativeId}
          onRevertAlternative={revertAlternative}
          onFinish={finishWorkout}
        />
      )}

      {screen === 'history' && (
        <HistoryScreen
          history={history}
          onBack={() => setScreen('home')}
          onDelete={(sessionId) => setSessionToDelete(sessionId)}
        />
      )}

      {screen === 'progression' && (
        <ProgressionScreen
          history={history}
          profile={profile}
          measurements={measurements}
          onBack={() => setScreen('home')}
          onOpenFollowup={() => setScreen('followup')}
          onSwitchDuoProfile={(target) => switchDuoProfile(target, 'progression')}
        />
      )}
      {screen === 'followup' && profile && (
        <FollowupScreen
          profileId={profile}
          measurements={measurements}
          sessionsThisWeek={history.filter((session) => session.completedAt).length}
          onSave={saveFollowup}
          onOpenBilan={(measurement) => {
            setBilanTarget(measurement);
            setScreen('bilan');
          }}
          onBack={() => setScreen('progression')}
        />
      )}
      {screen === 'bilan' && profile && bilanTarget && (
        <BilanScreen
          profileId={profile}
          measurements={measurements}
          current={bilanTarget}
          sessions={history}
          onBack={() => setScreen('followup')}
        />
      )}

      {screen === 'settings' && (
        <SettingsScreen
          profile={profile}
          accent={accent}
          onAccentChange={changerAccent}
          onBack={() => setScreen('home')}
          onSwitch={leaveProfile}
          onNotice={setNotice}
          onImported={() => void refreshHistory(profile)}
          isOnline={isOnline}
          offlineReady={offlineReady}
          serviceWorkerReady={serviceWorkerReady}
          installAvailable={Boolean(installPrompt)}
          onInstall={() => void installApp()}
          notificationPermission={notificationPermission}
          onEnableNotifications={() => void enableNotifications()}
          onCheckUpdate={checkForUpdate}
        />
      )}

      {/* Le bilan est un document : aucune navigation ne doit apparaître dessus. */}
      {screen !== 'workout' && screen !== 'bilan' && <BottomNav currentScreen={screen} onNavigate={setScreen} />}

      {tutorialId && tutorials[tutorialId] && (
        <TutorialModal tutorial={tutorials[tutorialId]} onClose={() => setTutorialId(null)} />
      )}

      {alternativeId && selectedDay && session && equipmentAlternatives[alternativeId] && (
        <AlternativeModal
          exerciseId={alternativeId}
          exerciseName={currentExerciseForAlternative?.name ?? 'Cet exercice'}
          prescribedLoadKg={currentExerciseForAlternative?.sets[0]?.loadKg}
          alternative={equipmentAlternatives[alternativeId]}
          onClose={() => setAlternativeId(null)}
          onUse={markAlternativeUsed}
        />
      )}

      {exitPromptOpen && (
        <ExitWorkoutDialog
          onCancel={() => setExitPromptOpen(false)}
          onPause={pauseWorkout}
          onAbandon={() => {
            setExitPromptOpen(false);
            setAbandonOpen(true);
          }}
        />
      )}

      {abandonOpen && (
        <ConfirmDialog
          eyebrow="SÉANCE EN COURS"
          title="Annuler cette séance ?"
          description="Les séries déjà validées seront supprimées : la séance ne figurera ni dans l’historique ni dans ta progression. Pour la reprendre plus tard, choisis plutôt « mettre en pause »."
          confirmLabel="Annuler la séance"
          cancelLabel="Garder la séance"
          onConfirm={() => void abandonWorkout()}
          onCancel={() => setAbandonOpen(false)}
        />
      )}

      {sessionToDelete && (
        <ConfirmDialog
          eyebrow="HISTORIQUE"
          title="Supprimer cette séance ?"
          description="Elle disparaîtra de l’historique et de tes statistiques. Les autres séances ne sont pas touchées."
          confirmLabel="Supprimer"
          cancelLabel="Conserver"
          onConfirm={() => void removeSession(sessionToDelete)}
          onCancel={() => setSessionToDelete(null)}
        />
      )}

      {confirmSwitchOpen && (
        <ConfirmDialog
          eyebrow="ESPACE PERSONNEL"
          title="Changer de profil ?"
          description="Tes données resteront séparées : chaque profil garde son historique sur cet appareil."
          confirmLabel="Changer de profil"
          cancelLabel="Rester ici"
          onConfirm={() => {
            setConfirmSwitchOpen(false);
            leaveProfile();
          }}
          onCancel={() => setConfirmSwitchOpen(false)}
        />
      )}

      {pendingDay && (
        <EnergyCheckinModal
          day={pendingDay}
          profileName={profile}
          onConfirm={confirmWorkoutStart}
          onSkip={() => confirmWorkoutStart('normal', 1.0)}
        />
      )}
    </main>
  );
}
