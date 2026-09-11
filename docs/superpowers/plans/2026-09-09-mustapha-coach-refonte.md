# MUSTAPHA COACH Refonte Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add profile-driven 2/3-session programming, adaptive meals, configurable coach tone, and a professional MUSTAPHA-only UI refresh.

**Architecture:** Keep MUSTAPHA isolated behind `/mustapha`. Add pure domain generators and extend the existing local repository-compatible profile; keep immutable prescriptions and existing session persistence. Update the single current screen file incrementally to reduce regression risk, with CSS tokens and composition changes isolated to MUSTAPHA selectors.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, Dexie/IndexedDB, CSS.

## Global Constraints

- Do not modify Laura/Ottman behavior, storage, or deployment.
- Use only local data; no account, server, or remote nutrition API.
- Keep health and nutrition copy indicative, not medical.
- Preserve immutable training prescriptions.
- Publish only the `mustapha-coach` Cloudflare Pages project after verification.

---

### Task 1: Domain personalization

**Files:**
- Create: `src/mustapha/domain/programGenerator.ts`
- Create: `src/mustapha/domain/mealGenerator.ts`
- Create: `src/mustapha/domain/coachTone.ts`
- Modify: `src/mustapha/domain/types.ts`
- Test: `src/mustapha/personalization.test.ts`

- [ ] Add `weeklySessions: 2 | 3` and `coachTone: 'standard' | 'directive' | 'dictator-rp'` to `MustaphaProfile`.
- [ ] Implement pure `getTrainingDays(profile)` returning Monday/Wednesday/Saturday entries, exactly 2 or 3 according to `weeklySessions`.
- [ ] Implement pure `getMealPlanForProfile(profile)` filtering recipes by goal, allergies, and excluded foods.
- [ ] Implement pure `getCoachMessage(tone, event, name)` with safe fictional directive copy and standard fallback.
- [ ] Add tests for 2/3 sessions, constraints, and tone output.
- [ ] Run `npm test -- --run src/mustapha/personalization.test.ts`.

### Task 2: Persist profile choices through onboarding

**Files:**
- Modify: `src/mustapha/MustaphaApp.tsx`
- Modify: `src/mustapha/mustapha.test.tsx`

- [ ] Add onboarding choice for 2 vs 3 weekly sessions with clear tradeoff copy.
- [ ] Add coach tone choice with explicit RP activation and standard reset.
- [ ] Save both values in the profile object.
- [ ] Use generated training days and meals in dashboard/training/nutrition screens.
- [ ] Add UI tests asserting selected choices persist in IndexedDB.
- [ ] Run the focused and full test suites.

### Task 3: Professional MUSTAPHA UI/UX pass

**Files:**
- Modify: `src/styles.css`
- Modify: `src/mustapha/MustaphaApp.tsx`

- [ ] Replace the current decorative-heavy composition with a dashboard hierarchy: dominant next action, compact metrics, schedule rail, coach message, and meal action.
- [ ] Add desktop sidebar-like navigation while retaining an accessible mobile bottom nav.
- [ ] Use a single lime accent, sober dark surfaces, tighter typography, explicit focus/disabled/success states.
- [ ] Add short CSS transitions only; honor `prefers-reduced-motion`.
- [ ] Verify no broad `pointer-events: none` selector is introduced.
- [ ] Run build and browser click checks on onboarding, navigation, session start, meal, and shopping actions.

### Task 4: Verification and publication

**Files:**
- Modify: `docs/qa/pwa-verification.md` if evidence is added.

- [ ] Run `npm test -- --run` and record actual result.
- [ ] Run `npm run build` and confirm exit 0.
- [ ] Serve production build and verify at 390px plus desktop viewport.
- [ ] Check browser console for errors.
- [ ] Deploy only with `npx wrangler pages deploy dist --project-name mustapha-coach --commit-dirty=true`.
- [ ] Verify `https://mustapha-coach.pages.dev/mustapha`, manifest, and service worker.
- [ ] Confirm Laura/Ottman URL remains unchanged.
