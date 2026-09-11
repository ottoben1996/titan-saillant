# PWA Coach Ottman / Laura Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a mobile-first offline PWA that guides Ottman and Laura through their PDF workout programs, timers, tutorials, local history, and backup/restore.

**Architecture:** React + TypeScript + Vite PWA. Domain data is immutable program JSON; IndexedDB stores profile-local sessions and preferences. UI is split into dashboard, workout runner, exercise detail, history, and settings/backup views.

**Tech Stack:** React, TypeScript, Vite, vite-plugin-pwa, IndexedDB via Dexie, Vitest, React Testing Library, CSS modules or scoped CSS, Web Speech API, Web Audio API, Vibration API, Screen Wake Lock API.

## Global Constraints

- Two local profiles: Ottman and Laura.
- No account, server, or automatic synchronization.
- Program prescriptions remain immutable; actual performance is stored separately.
- Core instructions work offline; external videos are optional.
- Mobile-first dark high-contrast interface with large touch targets.
- Autosave after every set and resumable interrupted sessions.
- Export/import JSON with confirmation before destructive actions.
- Preserve PDF differences in charges, repetitions, durations, and rest.

---

### Task 1: Scaffold the PWA and test harness

**Files:**
- Create: `package.json`, `vite.config.ts`, `index.html`
- Create: `src/main.tsx`, `src/App.tsx`, `src/styles.css`
- Create: `src/test/setup.ts`, `src/App.test.tsx`
- Create: `public/manifest.webmanifest`

**Interfaces:**
- Produces the runnable Vite app and test command used by all later tasks.

- [ ] Write a failing smoke test asserting the app renders the profile chooser.
- [ ] Run `npm test -- --run src/App.test.tsx`; expect failure because the app is absent.
- [ ] Add minimal React/Vite/Vitest setup and profile chooser shell.
- [ ] Run the smoke test and production build; expect PASS.

### Task 2: Model and seed both PDF programs

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/domain/programs.ts`
- Create: `src/domain/programs.test.ts`
- Create: `src/domain/tutorials.ts`

**Interfaces:**
- `ProfileId = 'ottman' | 'laura'`
- `WorkoutPlan`, `WorkoutDay`, `ExercisePrescription`, `SetPrescription`, `Tutorial`
- `getProgram(profileId: ProfileId): WorkoutPlan`

- [ ] Test that both profiles expose Full Body A, Full Body B, and Cardio.
- [ ] Test representative PDF differences: Ottman incline press work set 110 kg; Laura 70 kg; circuit/rest differences remain distinct.
- [ ] Implement typed immutable seed data and French tutorial metadata for every exercise.
- [ ] Run domain tests.

### Task 3: Add local persistence and backup/restore

**Files:**
- Create: `src/storage/db.ts`
- Create: `src/storage/sessionRepository.ts`
- Create: `src/storage/backup.ts`
- Create: `src/storage/storage.test.ts`

**Interfaces:**
- `saveSession(session: WorkoutSession): Promise<void>`
- `getActiveSession(profileId: ProfileId): Promise<WorkoutSession | undefined>`
- `listSessions(profileId: ProfileId): Promise<WorkoutSession[]>`
- `exportProfileData(profileId: ProfileId): Promise<string>`
- `importProfileData(json: string, profileId: ProfileId): Promise<void>`

- [ ] Test save/read of an interrupted session and profile isolation.
- [ ] Test export/import round trip.
- [ ] Implement Dexie tables for sessions and preferences.
- [ ] Run storage tests.

### Task 4: Implement workout runner state and timers

**Files:**
- Create: `src/workout/runner.ts`
- Create: `src/workout/timer.ts`
- Create: `src/workout/runner.test.ts`
- Create: `src/hooks/useWorkoutRunner.ts`

**Interfaces:**
- `createRunner(plan, profileId, dayId): WorkoutSession`
- `completeSet(session, exerciseId, setIndex, actual): WorkoutSession`
- `getNextStep(session): RunnerStep`
- `createCountdown(durationSeconds): CountdownController`

- [ ] Test progression through sets, exercise rest, circuit rest, pause/resume, and elapsed time.
- [ ] Test serializable state can be resumed after reload.
- [ ] Implement pure runner transitions and timer controller using timestamps rather than decrement-only counters.
- [ ] Run runner tests.

### Task 5: Build the mobile UI and guided session screen

**Files:**
- Modify: `src/App.tsx`
- Create: `src/components/ProfileChooser.tsx`
- Create: `src/components/Dashboard.tsx`
- Create: `src/components/WorkoutCard.tsx`
- Create: `src/components/WorkoutRunner.tsx`
- Create: `src/components/SetLogger.tsx`
- Create: `src/components/RestTimer.tsx`
- Create: `src/components/ExerciseTutorial.tsx`
- Create: `src/components/SessionSummary.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Components consume the domain types and `useWorkoutRunner`.

- [ ] Add component tests for selecting profile, starting a workout, logging a set, and showing rest.
- [ ] Implement the dashboard, runner, tutorial drawer/panel, circuit flow, and completion summary.
- [ ] Add audio/vibration controls and optional speech announcements with feature detection.
- [ ] Add wake-lock request/release while a session is active.
- [ ] Run component tests and build.

### Task 6: Add history, settings, and PWA resilience

**Files:**
- Create: `src/components/HistoryView.tsx`
- Create: `src/components/SettingsView.tsx`
- Create: `src/components/BackupControls.tsx`
- Create: `src/hooks/useInstallPrompt.ts`
- Modify: `vite.config.ts`, `public/manifest.webmanifest`, `src/App.tsx`
- Create: `src/components/HistoryView.test.tsx`

- [ ] Test history filtering by profile and backup controls.
- [ ] Implement history charts/list, settings, export/import, reset confirmation, install prompt, service worker, offline fallback.
- [ ] Run all tests and production build.

### Task 7: Verify against PDFs and mobile behavior

**Files:**
- Create: `scripts/verify-program-data.mjs`
- Create: `docs/qa/pwa-verification.md`

- [ ] Run the program verification script against checked seed values from both PDFs.
- [ ] Run unit/component tests and production build.
- [ ] Serve the production build and verify mobile viewport interactions, offline reload, resume, export/import, and timer completion.
- [ ] Record confirmed results and unresolved limitations in the QA document.
