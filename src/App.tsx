import { useEffect, useState } from 'react';
import type { ProfileId, SessionTimerState, WorkoutDay, WorkoutSession } from './domain/types';
import { getProgram } from './domain/programs';
import { tutorials } from './domain/tutorials';
import { equipmentAlternatives } from './domain/alternatives';
import { createRunner, completeSet, getNextStep, getWorkoutExercises } from './workout/runner';
import { playTimerChime, timerTitle, vibrateTimer } from './workout/alerts';
import { restoreRemainingSeconds } from './workout/timer';
import { getActiveSession, listSessions, saveSession } from './storage/sessionRepository';
import MustaphaApp from './mustapha/MustaphaApp';

import { TopBar } from './components/layout/TopBar';
import { BottomNav, type Screen } from './components/layout/BottomNav';
import { ProfileChooser } from './components/screens/ProfileChooser';
import { HomeScreen } from './components/screens/HomeScreen';
import { WorkoutScreen } from './components/screens/WorkoutScreen';
import { HistoryScreen } from './components/screens/HistoryScreen';
import { ProgressionScreen } from './components/screens/ProgressionScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { TutorialModal } from './components/modals/TutorialModal';
import { AlternativeModal } from './components/modals/AlternativeModal';
import { ExitWorkoutDialog } from './components/modals/ExitWorkoutDialog';
import { EnergyCheckinModal, type EnergyLevel } from './components/modals/EnergyCheckinModal';
import { Check } from './components/ui/Icons';

const profileKey = 'coach-active-profile';
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export default function App() {
  if (window.location.pathname === '/mustapha' || window.location.pathname.startsWith('/mustapha/')) {
    return <MustaphaApp />;
  }

  const [profile, setProfile] = useState<ProfileId | null>(() => {
    const saved = localStorage.getItem(profileKey);
    return saved === 'ottman' || saved === 'laura' ? saved : null;
  });

  const [screen, setScreen] = useState<Screen>('home');
  const [selectedDay, setSelectedDay] = useState<WorkoutDay | null>(null);
  const [pendingDay, setPendingDay] = useState<WorkoutDay | null>(null);
  const [restMultiplier, setRestMultiplier] = useState<number>(1.0);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [history, setHistory] = useState<WorkoutSession[]>([]);
  const [tutorialId, setTutorialId] = useState<string | null>(null);
  const [alternativeId, setAlternativeId] = useState<string | null>(null);
  const [restSeconds, setRestSeconds] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [notice, setNotice] = useState('');
  const [exitPromptOpen, setExitPromptOpen] = useState(false);

  const [documentHidden, setDocumentHidden] = useState(() => document.visibilityState !== 'visible');
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [offlineReady, setOfflineReady] = useState(false);
  const [serviceWorkerReady, setServiceWorkerReady] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
  );

  const refreshHistory = async (id: ProfileId) => setHistory(await listSessions(id));

  useEffect(() => {
    if (!profile) return;
    void refreshHistory(profile);
    void getActiveSession(profile).then((active) => {
      if (!active) return;
      const restoredTimer = active.activeTimer
        ? { ...active.activeTimer, remainingSeconds: restoreRemainingSeconds(active.activeTimer) }
        : undefined;
      const restored = restoredTimer ? { ...active, activeTimer: restoredTimer } : active;
      setSession(restored);

      // Reprise directe anti-crash : restauration immédiate sur la séance en cours
      if (!active.completedAt) {
        const prog = getProgram(profile);
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
        void saveSession({ ...restored, activeTimer: undefined, updatedAt: new Date().toISOString() });
      }
    });
  }, [profile]);

  useEffect(() => {
    const syncVisibility = () => setDocumentHidden(document.visibilityState !== 'visible');
    const onPageShow = () => setDocumentHidden(false);
    const onPageHide = () => setDocumentHidden(true);
    document.addEventListener('visibilitychange', syncVisibility);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', syncVisibility);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, []);

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
      if (session) void saveSession({ ...session, updatedAt: new Date().toISOString() });
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

  const switchDuoProfile = async (target: ProfileId) => {
    if (target === profile) return;
    if (session) {
      await saveSession({ ...session, updatedAt: new Date().toISOString() });
    }
    localStorage.setItem(profileKey, target);
    setProfile(target);
    const targetHistory = await listSessions(target);
    setHistory(targetHistory);
    const active = await getActiveSession(target);
    const targetProgram = getProgram(target);
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
      setScreen('home');
      setNotice(`Session ${target === 'ottman' ? 'Ottman' : 'Laura'} : choisis ta séance.`);
      window.setTimeout(() => setNotice(''), 3000);
    }
  };

  if (!profile) return <ProfileChooser onChoose={chooseProfile} />;

  const program = getProgram(profile);

  const handleInitiateStart = (day: WorkoutDay) => {
    setPendingDay(day);
  };

  const confirmWorkoutStart = (energy: EnergyLevel, multiplier: number) => {
    if (!pendingDay) return;
    const fresh = createRunner(pendingDay, profile);
    setSelectedDay(pendingDay);
    setRestMultiplier(multiplier);
    setSession(fresh);
    void saveSession(fresh);
    setPendingDay(null);
    setScreen('workout');

    if (energy === 'low') {
      setNotice('Mode Récupération actif : repos allongés (+20%).');
      window.setTimeout(() => setNotice(''), 3500);
    }
  };

  const resumeWorkout = () => {
    if (!session) return;
    const day = program.days.find((item) => item.id === session.dayId);
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
    void saveSession(session);
    setExitPromptOpen(false);
    setScreen('home');
    setSelectedDay(null);
    setIsResting(false);
    setNotice('Séance mise en pause. Tu peux la reprendre quand tu veux.');
    window.setTimeout(() => setNotice(''), 3500);
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
    await saveSession(updated);
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
      await saveSession(withTimer);
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
    void saveSession(updated);
    if (suggestedLoadKg) {
      setNotice(`Alternative activée (charge suggérée : ${suggestedLoadKg} kg)`);
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
    void saveSession(updated);
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
      void saveSession(updated);
    }

    if (!state || state.kind !== 'rest' || state.remainingSeconds <= 0) {
      setIsResting(false);
      setRestSeconds(0);
    } else {
      setRestSeconds(state.remainingSeconds);
    }
  };

  const notifyTimerDone = (kind: 'rest' | 'tempo' = 'rest') => {
    const message =
      kind === 'tempo' ? 'Temps terminé. Tu peux valider la série.' : 'Repos terminé. Tu peux reprendre la prochaine série.';

    vibrateTimer(kind);
    playTimerChime(kind);

    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification(kind === 'tempo' ? 'Coach · tempo terminé' : 'Coach · repos terminé', {
          body: message,
          icon: '/icon.svg',
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

  const finishWorkout = async (feedback?: Pick<WorkoutSession, 'perceivedExertion' | 'energy' | 'pain' | 'notes'>) => {
    if (session) {
      const updated: WorkoutSession = {
        ...session,
        ...feedback,
        activeTimer: undefined,
        updatedAt: new Date().toISOString(),
      };
      setSession(updated);
      await saveSession(updated);
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

  const handleTopbarBack = () => {
    if (tutorialId) return setTutorialId(null);
    if (alternativeId) return setAlternativeId(null);
    if (screen === 'workout') return setExitPromptOpen(true);
    if (screen === 'home') {
      if (window.confirm('Changer de profil ? Tes données resteront séparées.')) leaveProfile();
      return;
    }
    setScreen('home');
  };

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
    <main className={`app-shell ${screen === 'workout' ? 'workout-shell' : ''}`}>
      <TopBar
        onBack={handleTopbarBack}
        backLabel={topbarLabel}
        isOnline={isOnline}
        onOpenSettings={() => setScreen('settings')}
      />

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
          activeSession={session}
          onStart={handleInitiateStart}
          onResume={resumeWorkout}
          onHistory={() => setScreen('history')}
          onProgression={() => setScreen('progression')}
        />
      )}

      {screen === 'workout' && selectedDay && session && (
        <WorkoutScreen
          profile={profile}
          onSwitchDuoProfile={switchDuoProfile}
          day={selectedDay}
          session={session}
          history={history}
          resting={isResting}
          restSeconds={restSeconds}
          timerSuspended={documentHidden || Boolean(tutorialId || alternativeId)}
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

      {screen === 'history' && <HistoryScreen history={history} onBack={() => setScreen('home')} />}

      {screen === 'progression' && (
        <ProgressionScreen history={history} profile={profile} onBack={() => setScreen('home')} />
      )}

      {screen === 'settings' && (
        <SettingsScreen
          profile={profile}
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
        />
      )}

      {screen !== 'workout' && <BottomNav currentScreen={screen} onNavigate={setScreen} />}

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

      {exitPromptOpen && <ExitWorkoutDialog onCancel={() => setExitPromptOpen(false)} onPause={pauseWorkout} />}

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
