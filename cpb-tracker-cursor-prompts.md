# CPB Tracker — Cursor Build Prompts

A personal, single-user PWA to run a 90-day CPB diet (Jeremy Ethier's Chicken-Potato-Broccoli reset) with phased food reintroduction, daily meal + exercise check-ins, and achievements.

## How to use this doc

1. Paste the **Project Context** block into a new `.cursorrules` file (or `PROJECT.md`) at the repo root. This is the source of truth Cursor reads on every prompt.
2. Run the numbered prompts **in order** in Cursor's agent/composer. Each builds on the last. Don't skip ahead — later prompts assume earlier ones landed.
3. After each prompt, run the app (`npm run dev`) and eyeball it before moving on.

**Stack:** Vite + React + TypeScript, Tailwind CSS, Dexie (IndexedDB), `vite-plugin-pwa`, `date-fns`, `recharts`, `zustand` (light UI state). Local-first, no backend, no auth. Single user (you).

---

## Phase + food reference (the diet logic, baked in)

The app computes `dayNumber = daysBetween(startDate, today) + 1` (1-indexed, capped at 90) and maps it to a phase. Allowed foods are **cumulative** — each phase keeps everything from earlier phases and adds more.

| Phase | Days | Label | Adds |
|---|---|---|---|
| 1 | 1–28 | Strict Reset | Chicken breast, potatoes, broccoli, carrots, 2 eggs/day, 1 tbsp olive oil/day |
| 2 | 29–35 | Veg & Fruit | Leafy greens + other low-sugar veg (peppers, zucchini, cauliflower, green beans, tomato), fruit (berries, banana) |
| 3 | 36–42 | Fish & Protein | Fatty fish (salmon, sardines, mackerel), wider lean protein (turkey, lean beef) |
| 4 | 43–49 | Fats & Calcium | Nuts, seeds, avocado, olives, Greek yogurt, cottage cheese, milk, cheese; relaxed olive oil |
| 5 | 50–56 | Carb Variety | Rice, oats, quinoa, beans/lentils, sweet potato, whole grains |
| 6 | 57–90 | Integration | Deliberate treat reintroduction one-at-a-time (dark chocolate, desserts, restaurant meals) |

**Global rules (all phases):** no liquid calories, no diet sodas, no artificial sweeteners. Seasoning and sugar-free sauces allowed. These are display reminders, not enforced.

---

## Project Context (paste into `.cursorrules`)

```
You are building "CPB Tracker", a single-user personal PWA for tracking a 90-day CPB diet (Chicken/Potato/Broccoli reset by Jeremy Ethier) with phased food reintroduction.

STACK (do not deviate without asking):
- Vite + React 18 + TypeScript
- Tailwind CSS for all styling
- Dexie (IndexedDB) for ALL persistence — no backend, no auth, no API calls
- vite-plugin-pwa for installable offline PWA
- date-fns for all date math
- recharts for the weight trend chart
- zustand only for ephemeral UI state (not persisted data)

PRINCIPLES:
- Single user. No login, no accounts, no multi-tenant anything.
- Local-first: everything works offline. Data lives in IndexedDB.
- Mobile-first UI. This lives on a phone home screen. Big tap targets, thumb-reachable bottom nav.
- Clean, calm, legible. Dark UI is fine. No clutter.
- Dates are stored and keyed as 'yyyy-MM-dd' strings (local date, NOT UTC ISO timestamps) to avoid timezone drift on daily logs.

DOMAIN — PHASES (cumulative allowed foods, computed from startDate):
Phase 1, days 1-28, "Strict Reset": chicken breast, potatoes, broccoli, carrots, 2 eggs/day, 1 tbsp olive oil/day.
Phase 2, days 29-35, "Veg & Fruit": + leafy greens, peppers, zucchini, cauliflower, green beans, tomato, berries, banana.
Phase 3, days 36-42, "Fish & Protein": + salmon, sardines, mackerel, turkey, lean beef.
Phase 4, days 43-49, "Fats & Calcium": + nuts, seeds, avocado, olives, Greek yogurt, cottage cheese, milk, cheese; relaxed olive oil.
Phase 5, days 50-56, "Carb Variety": + rice, oats, quinoa, beans, lentils, sweet potato, whole grains.
Phase 6, days 57-90, "Integration": + dark chocolate and treats, reintroduced deliberately.
Global rules shown as reminders: no liquid calories, no diet sodas, no artificial sweeteners; seasoning + sugar-free sauces OK.

DOMAIN — DATA MODEL (Dexie tables):
- settings: { id: 1, startDate: 'yyyy-MM-dd', weightUnit: 'kg' | 'lb', mealSlots: string[] }  (single row)
- days: { date: 'yyyy-MM-dd' (PK), notes?: string }
- meals: { id, date, slot, eaten: boolean, onPlan: boolean }  (one row per meal slot per day)
- exercise: { id, date, didExercise: boolean, type?: 'walking'|'padel'|'boxing'|'gym'|'other', minutes?: number, note?: string }
- checkins: { date (PK), weight?: number, energy?: 1-5, cravings?: 1-5, mood?: 1-5 }
- achievements: { id (string PK), earnedAt?: 'yyyy-MM-dd' | null }

Default mealSlots: ['Breakfast', 'Lunch', 'Dinner', 'Snack'].

NAVIGATION (bottom tab bar): Today | Progress | Achievements | Settings.

Keep components small and typed. Put the phase engine and Dexie db in /src/lib. No premature abstraction.
```

---

## Prompt 1 — Scaffold + PWA shell

```
Set up the project from scratch in the current empty directory.

1. Scaffold a Vite + React + TypeScript app.
2. Install and configure: tailwindcss, @tailwindcss/postcss (or the standard tailwind+postcss+autoprefixer setup for the installed Vite version), dexie, dexie-react-hooks, date-fns, recharts, zustand, vite-plugin-pwa.
3. Configure Tailwind. Set up a dark, calm theme: near-black background, soft off-white text, one warm accent color (amber/yellow ~#FACC15 to echo the "CPB" branding). Define it via Tailwind theme extension and a few CSS variables.
4. Configure vite-plugin-pwa with registerType 'autoUpdate', a manifest (name "CPB Tracker", short_name "CPB", theme_color #FACC15, background_color #0a0a0a, display 'standalone', portrait orientation), and placeholder 192/512 icons (generate simple solid-color PNG placeholders with "CPB" text for now).
5. Build the app shell: a fixed bottom tab bar with four tabs (Today, Progress, Achievements, Settings) using simple inline SVG or lucide-react icons, and a routed main area. Use a tiny hand-rolled router or react-router — your call, keep it light. Each tab renders a placeholder page for now.
6. Make the layout mobile-first with a max-width container centered on larger screens.

Verify `npm run dev` runs and the PWA is installable in build preview. Don't build features yet.
```

---

## Prompt 2 — Data layer + phase engine

```
Create the persistence and core logic layers. No UI changes beyond what's needed to verify.

1. /src/lib/db.ts — define the Dexie database with the exact tables and types from .cursorrules (settings, days, meals, exercise, checkins, achievements). Export typed interfaces for each row.

2. On first run, seed a settings row (id 1) with startDate = today ('yyyy-MM-dd'), weightUnit 'kg', and the default mealSlots. Provide a helper getSettings() and updateSettings().

3. /src/lib/phases.ts — define the six phases as a typed const array, each with: id, label, startDay, endDay, and addedFoods (string[]). Also store cumulativeFoods computed at module load (phase N = its foods + all earlier phases). Export:
   - getDayNumber(startDate, today=now): number  (1-indexed, min 1, max 90, using date-fns differenceInCalendarDays on local 'yyyy-MM-dd')
   - getPhaseForDay(dayNumber): Phase
   - getAllowedFoods(dayNumber): string[]  (cumulative)
   - getGlobalRules(): string[]

4. /src/lib/dates.ts — helpers: todayKey() -> 'yyyy-MM-dd', formatKey(date), keyToDate(key). All local-time, no UTC surprises.

5. Write a few quick assertions (a temporary throwaway is fine, or a tiny vitest if easy) confirming day 1, 28, 29, 56, 57, 90 map to the right phases and that food lists are cumulative.

Keep everything strongly typed. Export a useLiveQuery-friendly API where helpful.
```

---

## Prompt 3 — Today screen (phase banner + meal check-ins)

```
Build the Today tab — the daily home screen. Use dexie-react-hooks useLiveQuery for reactive reads.

Layout top to bottom:
1. Header: today's date, the current day number out of 90, and a slim progress bar across the whole 90 days.
2. Phase card: current phase label (e.g. "Phase 1 · Strict Reset"), days remaining in this phase, and an expandable "Allowed foods" list showing the cumulative allowed foods for today as chips. Below it, a muted line listing the global rules (no liquid calories / no sweeteners / seasoning OK).
3. Meals section: render one row per meal slot from settings.mealSlots. Each row has the slot name and two toggles:
   - "Eaten" (the meal happened)
   - "On plan" (stayed within allowed foods) — only enabled once Eaten is on
   Tapping writes/updates the matching meals row for today (create on first tap). Show a subtle check state. Make tap targets large.
4. A daily notes field (textarea) that saves to days.notes for today (debounced autosave).

A day counts as "compliant" if every meal slot for that day is either marked Eaten+OnPlan, OR explicitly skipped (add a small "skip" affordance per meal so an unused Snack doesn't break a streak). Expose a helper isDayCompliant(date) in /src/lib for reuse by streaks/achievements later.

Make sure switching the device date (next day) shows a fresh empty Today without affecting prior days.
```

---

## Prompt 4 — Exercise logging

```
Add exercise logging to the Today screen, below the meals section.

1. An "Exercise" card with a primary toggle: "Did you exercise today?" (yes/no).
2. When yes: reveal a dropdown/select with options exactly: Walking, Padel, Boxing, Gym, Other. Default none-selected, required if "yes".
3. Optional fields when yes: minutes (number input) and a short note (text).
4. Persist to the exercise table (one row per day; upsert by date). When toggled back to no, clear type/minutes/note but keep the didExercise=false record.
5. Show a small weekly summary chip somewhere on Today: "Exercised X/7 this week" computed from the last 7 days.

Keep it one-tap-fast: the common case is "yes → Padel → done".
```

---

## Prompt 5 — Progress tab (check-ins + weight trend)

```
Build the Progress tab. Two parts: a daily check-in and a trend view.

Daily check-in card (writes to checkins table, keyed by date, upsert):
- Weight (number, unit from settings; show kg/lb label). Optional.
- Energy: 1–5 selector (tap a row of 5).
- Cravings: 1–5 selector.
- Mood: 1–5 selector.
Autosave on change.

Trend view:
- A recharts line chart of weight over time (x = date, y = weight), pulling all checkins with a weight value, sorted by date. Handle gaps gracefully (connectNulls). If fewer than 2 weight points, show an empty-state message instead of a broken chart.
- A "This week" summary: average energy, average cravings, number of compliant days (use isDayCompliant), exercise days. 
- A compliance heatmap-style strip or simple calendar grid for the current phase showing each day's status: compliant (accent), logged-but-not-compliant (muted), missed/unlogged (faint). Tapping a day could later open it, but for now just display.

Keep the chart readable on a narrow phone screen. Use the accent color for the weight line.
```

---

## Prompt 6 — Achievements

```
Build an achievements system, surfaced on the Achievements tab plus a toast when one unlocks.

1. /src/lib/achievements.ts — define an array of achievement definitions, each: id (string), title, description, icon (emoji or lucide name), and a check(ctx) function returning boolean. ctx provides helpers/data: dayNumber, currentPhaseId, a function to query compliant-day streak, total logged days, total exercise days, weigh-in count, etc. Pull what each check needs via Dexie.

   Seed these achievements:
   - first_log: "Day One" — logged your first day.
   - streak_3: "Getting Going" — 3-day compliance streak.
   - streak_7: "One Week Strong" — 7-day compliance streak.
   - streak_14: "Two Weeks In" — 14-day compliance streak.
   - phase1_done: "Reset Complete" — reached day 29 (survived strict phase 1).
   - phase_2 / phase_3 / phase_4 / phase_5 / phase_6: "New Foods Unlocked" — reached the first day of each later phase (one achievement per phase entry).
   - move_10: "Mover" — logged exercise on 10 days total.
   - padel_5: "Padel Regular" — 5 exercise days with type Padel.
   - weigh_7: "Tracking the Trend" — recorded weight on 7 days.
   - perfect_week: "Flawless Seven" — 7 consecutive fully-compliant days with all meals Eaten+OnPlan (no skips).
   - halfway: "Halfway There" — reached day 45.
   - finished: "90 Days Done" — reached day 90.

2. Evaluation: on app load and after any relevant write (meal/exercise/checkin/day change), run all unearned achievements' checks. When one passes, set earnedAt = today in the achievements table and fire a toast ("Achievement unlocked: <title>"). Never re-fire an already-earned one. Use a small zustand store or event for the toast.

3. Achievements tab UI: grid of cards. Earned = full color + earned date. Unearned = greyed with description as a hint. Show an "X / total earned" header and a progress bar.

Make the unlock toast feel good but brief — slide in, auto-dismiss after ~3s.
```

---

## Prompt 7 — Settings + PWA polish

```
Finish the Settings tab and tighten the PWA.

Settings tab:
- Show/edit start date (date picker). Warn that changing it shifts all phase calculations.
- Weight unit toggle (kg/lb).
- Edit meal slots (add/remove/rename from the default Breakfast/Lunch/Dinner/Snack).
- "Export data" button: dump all Dexie tables to a downloadable JSON file (your only backup, since there's no server).
- "Import data" button: restore from that JSON.
- "Reset everything" button with a confirm dialog (wipes IndexedDB, re-seeds settings).
- A small "About" line: current day, current phase, app version.

PWA polish:
- Replace placeholder icons with proper 192/512 maskable PNGs (simple amber "CPB" mark on dark background — generate them).
- Add an apple-touch-icon and themed status bar meta for iOS standalone.
- Confirm offline: after first load, the app should fully work with no network (service worker precaches the shell; all data is local anyway).
- Add a lightweight "install app" hint that appears once if not already installed (use beforeinstallprompt where supported; on iOS show a one-line "Add to Home Screen via Share" tip).

Do a final pass: check every tab works offline, daily logs persist across reloads, and the day rollover at local midnight produces a clean new Today.
```

---

## Optional — later, if you want phone↔laptop sync

If single-device local storage stops being enough, the cleanest add is a thin Supabase layer: one table per current Dexie table keyed by a fixed user id, with a manual "sync now" or on-app-focus push/pull. Keep Dexie as the local source of truth and treat Supabase as backup/mirror so the app stays fully offline-capable. Ask me for that prompt when you're there.

---

## A note on the plan itself

You're running this for 90 days, which is longer than the diet's intended ~30-day reset, so the reintroduction phases (5 onward) are doing real nutritional work — don't shortcut them. A one-time dietitian check-in is still worth it. The app is a tracker, not medical advice.
