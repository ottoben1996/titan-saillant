# UX, Coaching Adaptatif et Responsive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or **superpowers:executing-plans** to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver premium responsive UX, one clear home action, and explainable offline-safe per-exercise coaching for strength, timed, and cardio work.

**Architecture:** Keep calculations pure in `src/workout`, preserve immutable prescriptions/history, and integrate recommendations as explicit current-session choices. Improve layout through existing CSS tokens and screen-specific styles, not a new UI framework.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, CSS media queries, Dexie/IndexedDB, PWA.

**Spec:** `docs/superpowers/specs/2026-10-18-ux-coaching-responsive-design.md`

## Global Constraints

- Local/offline-first; training data never leaves device.
- No silent mutation of prescribed program or historical sessions.
- Pain, repeated high effort, low energy, incomplete data, and incomplete sets never authorize increases.
- Existing backups and old sessions remain importable.
- Keep MUSTAPHA isolated unless verified shared-style regression exists.
- Preserve French copy, accessibility, reduced motion, focus, and 44 px touch targets.
- No cloud service or dependency added.

## Review Focus

- Done/upcoming slots must not accidentally start as today: test state labels and callbacks.
- Pain, incomplete sets, missing history never yield increase: table-driven coaching tests.
- Timed/cardio exercises use duration logic, not silent omission.
- Long French labels at 320 px do not overflow horizontally: viewport validation.
- Storage failure is visible and retryable: ProfileChooser tests.

---

### Task 1: Baseline tests and fixtures

**Files:** Create/modify `src/workout/coaching.test.ts`, `src/components/screens/HomeScreen.test.tsx`; inspect existing screen and style tests.

**Interfaces:** Fixtures use existing `WorkoutSession`, `WorkoutDay`, `getProgram`; later tasks rely on explicit expected states.

- [ ] Add tests for no-increase safety, done/upcoming rail semantics, profile rejection, timed recommendations, and missing-data behavior.
- [ ] Run focused baseline:

```bash
npx vitest run src/workout/coaching.test.ts src/components/screens/HomeScreen.test.tsx
```

- [ ] Commit baseline tests:

```bash
git add src/workout/coaching.test.ts src/components/screens/HomeScreen.test.tsx && git commit -m "test: define responsive UX and coaching baselines"
```

---

### Task 2: Explicit profile and home states

**Files:** Modify `src/components/screens/ProfileChooser.tsx:21-79`, `src/components/screens/HomeScreen.tsx:142-375`; test `ProfileChooser.test.tsx`, `HomeScreen.test.tsx`.

**Interfaces:** Produce loading/error/ready status markup and one dominant home CTA while preserving existing callbacks.

- [ ] Test pending `listSessions` announces loading; rejection shows French error plus `Réessayer`; retry shows counts.
- [ ] Replace nullable counts with `{status: 'loading'|'ready'|'error'; counts?: Record<ProfileId, number>}` and keep cancellation guard.
- [ ] Test measurement/recovery does not compete with today start; workout action has one dominant CTA; loading has accessible status; seven-day metric has no all-time footnote; done/upcoming slots have explicit semantics.
- [ ] Implement `NextBestAction` as source of primary branch. `today` starts, `done` reviews/restarts explicitly, `upcoming` previews or uses secondary wording. Add visible `role="status"`; align metric periods.
- [ ] Run:

```bash
npx vitest run src/components/screens/ProfileChooser.test.tsx src/components/screens/HomeScreen.test.tsx
```

- [ ] Commit:

```bash
git add src/components/screens/ProfileChooser.tsx src/components/screens/ProfileChooser.test.tsx src/components/screens/HomeScreen.tsx src/components/screens/HomeScreen.test.tsx && git commit -m "fix: clarify profile and home actions"
```

---

### Task 3: Navigation context and session ergonomics

**Files:** Modify `src/components/layout/BottomNav.tsx`, `src/components/screens/WorkoutScreen.tsx`, `src/styles/matiere.css`, `src/styles/workout.css`, `src/styles/mobile.css`; test corresponding component files.

**Interfaces:** Produce contextual active navigation and sticky validation with progressive disclosure; preserve callbacks and input values.

- [ ] Test followup/bilan parent active state and session labels.
- [ ] Add pure `navigationParent(screen: Screen): Screen` mapping; use it only for active state.
- [ ] Test validation after dense controls and quick/advanced inputs forwarding unchanged values.
- [ ] Remove only validation-button static-position override; preserve topbar sticky selector. Add safe-area bottom reserve, opaque fallback, `aria-expanded` advanced controls, one visible quick path.
- [ ] Run:

```bash
npx vitest run src/components/layout/BottomNav.test.tsx src/components/screens/WorkoutScreen.test.tsx
npx biome check src/components/layout/BottomNav.tsx src/components/screens/WorkoutScreen.tsx
```

- [ ] Commit:

```bash
git add src/components/layout/BottomNav.tsx src/components/layout/BottomNav.test.tsx src/components/screens/WorkoutScreen.tsx src/components/screens/WorkoutScreen.test.tsx src/styles/matiere.css src/styles/workout.css src/styles/mobile.css && git commit -m "fix: improve session action ergonomics"
```

---

### Task 4: Prescription completeness and pure coaching engine

**Files:** Modify `src/domain/programs.ts` only for confirmed gaps, `src/workout/progressionEngine.ts`, `src/workout/coaching.ts`; test domain/programs and workout coaching/progression tests.

**Interfaces:** Add `getExerciseRecommendation(exercise, history, options): ExerciseRecommendation | null`, returning `exerciseId`, `kind`, `action`, optional `suggestedLoadKg`/`suggestedDurationSeconds`, `reason`, `confidence`, `signals`, and `safety`. Keep `getAdaptiveAdvice` and existing overload behavior compatible.

- [ ] Add test iterating profiles, weeks 1–8, exercises; require finite active load/duration or explicit fallback.
- [ ] Run `npx vitest run src/domain/programs.test.ts`; fix only confirmed S6–S8 gaps, preferring explicit safe fallback and preserving manual override precedence.
- [ ] Add table tests: 2–4 successful same-exercise exposures increase boundedly; pain/repeated RPE >=9/low energy reduce or recover; missing history/load/incomplete sets maintain low confidence; timed/cardio increases duration capped; newest failed exposure blocks older success; different exercise/profile ignored.
- [ ] Implement normalization, completed/same-exercise filtering, minimum-observation confidence, existing increments, work-set filtering, timed/cardio branch, explicit reasons/signals, and no load suggestion for timed/cardio.
- [ ] Run:

```bash
npx vitest run src/domain/programs.test.ts src/workout/progressionEngine.test.ts src/workout/coaching.test.ts
npm run typecheck
```

- [ ] Commit:

```bash
git add src/domain/programs.ts src/domain/programs.test.ts src/workout/progressionEngine.ts src/workout/progressionEngine.test.ts src/workout/coaching.ts src/workout/coaching.test.ts && git commit -m "feat: add safe per-exercise coaching rules"
```

---

### Task 5: Integrate opt-in recommendations

**Files:** Modify `src/components/screens/WorkoutScreen.tsx`; only if needed `src/App.tsx`, `src/domain/types.ts`; test workout/session-flow files.

**Interfaces:** Consume `getExerciseRecommendation`; produce `Appliquer à cette séance`, `Garder la prescription`, and manual override without changing constants/history.

- [ ] Test safe recommendation displays reason/confidence; apply changes current input only; keep preserves prescription; pain hides increase; timed recommendation controls duration.
- [ ] Derive recommendation with `useMemo` for current exercise/history; keep state local unless optional backup-compatible field is proven necessary.
- [ ] Apply load/duration only to current entry state; manual edits win; dismiss is explicit.
- [ ] Run `npx vitest run src/components/screens/WorkoutScreen.test.tsx src/components/session-flow.test.tsx`.
- [ ] Commit:

```bash
git add src/components/screens/WorkoutScreen.tsx src/components/screens/WorkoutScreen.test.tsx src/components/session-flow.test.tsx src/App.tsx src/domain/types.ts && git commit -m "feat: surface opt-in coaching in workouts"
```

---

### Task 6: Premium responsive visual system

**Files:** Modify `src/styles.css`, `src/styles/tokens.css`, `src/styles/mobile.css`, `src/styles/matiere.css`, and screen-owned CSS only.

**Interfaces:** Consume stabilized class names; produce readable text measure, controlled wrapping, responsive grids, contrast-safe surfaces, opaque fallbacks, and no horizontal overflow.

- [ ] Add static guards for token bounds and absence of validation sticky override where project conventions support it.
- [ ] Set readable max measure; normalize heading/body/meta/button line heights; add `min-width: 0`, `overflow-wrap: anywhere`, and constrained flex/grid children; use tablet two-column layouts only where readable; preserve mobile single-column and safe areas.
- [ ] Flatten/darken gradient if contrast fails; set opaque top/bottom fallback before translucency; make offline/privacy meaning text/icon based; preserve reduced motion/performance fallbacks.
- [ ] Build and inspect 320x640, 375x812, 390x844, 430x932, 768x1024, desktop for wrapping, CTA, nav overlap, sticky action, modal safe area, and horizontal scroll.
- [ ] Commit:

```bash
git add src/styles.css src/styles/tokens.css src/styles/mobile.css src/styles/matiere.css && git commit -m "fix: polish responsive visual system"
```

---

### Task 7: Full verification

**Files:** Only verified-failure fixes; test full repository and manual offline/viewport flows.

- [ ] Run `npm run verify`.
- [ ] Rerun focused profile/home/workout/coaching tests.
- [ ] Verify offline cache, pause/reload/resume, old backup import, and unchanged base prescription after recommendation reload.
- [ ] Review `git diff main...HEAD --stat` and `git diff main...HEAD -- src/mustapha` for scope.
- [ ] Fix only verified failures, rerun affected tests and `npm run verify`.
- [ ] Commit final fixes:

```bash
git add . && git commit -m "test: verify responsive coaching release"
```
