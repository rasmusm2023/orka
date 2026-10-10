---

## 0. Your role and how to work

You are a senior full-stack engineer and product designer building a production-quality app. You care as much about how it feels to use as about whether the code works. People drop fitness apps because logging is tedious, so friction is the main thing we're fighting.

How to work:

- **Build in the phases in section 10, in order.** At the end of each phase, stop. Summarize what you built, list what I should test by hand (on desktop and on a phone-sized window), and wait for my go-ahead.
- **Ask before making architectural decisions that aren't covered here.** Make small decisions yourself and note them in `DECISIONS.md`.
- **Never invent nutrition data.** Every calorie and macro value must come from a real source (section 5) or from the user. No placeholder numbers in the database, no "approximately" seed data.
- **Write tests for all calculation logic** (section 9) before wiring it to the UI.
- **No hardcoded UI strings.** All text goes through the i18n layer from day one (section 7).
- Keep the codebase boring and readable: TypeScript strict mode, small components, no clever abstractions.

---

## 1. The product

**Kondis** (working name) is a personal training and nutrition tracker. It answers three questions every day:

1. What have I eaten, and how does it compare to my calorie and protein targets?
2. What should I lift today, and how did I do compared to last time?
3. Am I making progress (weight, intake, strength) over weeks and months?

**Primary user:** me. A Swedish UX/UI designer who spends most of the day at a computer and also wants to log from the phone at the gym and in the kitchen. So the app must be excellent on **both desktop (keyboard and mouse) and mobile (one thumb)**, with the same data on both.

**The bar:** it should feel faster to log in Kondis than to skip logging. If a common action takes more than a few seconds, the design is wrong.

**Language:** Swedish first (sv-SE). English comes later, so the architecture must support it from the start.

---

## 2. Non-negotiables

1. **Data persists permanently and syncs across devices.** Log on the phone, see it on the laptop. Nothing lives only in one browser.
2. **Nutrition numbers are correct.** Totals must match what you'd get by hand from the source data. See section 5.
3. **Logging food: 3 taps or fewer** for something I've eaten before. Under 10 seconds for something new.
4. **Logging a set: 1 tap** when I'm repeating what the app suggests.
5. **Works offline at the gym** (basements have bad signal). Writes queue and sync when back online. (Phase 5, but design the data layer for it from the start.)
6. **Installable as a PWA** on desktop and phone, opening straight into the app.
7. **Fast.** Interactions respond instantly (optimistic updates). No spinners for local actions.

---

## 3. Tech stack

Use these unless you have a strong reason not to (if so, ask first):

- **Next.js** (latest stable, App Router) + **TypeScript** (strict)
- **Supabase**: Postgres, Auth (email magic link + Google), Row Level Security on every table
- **TanStack Query** for server state with optimistic mutations
- **Tailwind CSS** + **shadcn/ui** as a starting point, restyled to our design tokens (it must not look like default shadcn)
- **next-intl** for i18n
- **Recharts** (or visx) for charts
- **Zod** for validating all input and all external API data
- **Vitest** for unit tests, **Playwright** for end-to-end tests (run at a desktop viewport and at 390×844)
- **Serwist** (or equivalent) for the PWA and offline support
- Barcode scanning: the browser `BarcodeDetector` API with `@zxing/browser` as a fallback

---

## 4. Data model

Postgres via Supabase. Every user-owned table has `user_id uuid references auth.users` and an RLS policy so a user can only read and write their own rows. Use `uuid` primary keys, `created_at` and `updated_at` timestamps.

**Dates:** a log belongs to the user's _local calendar date_. Store `log_date date` (not a timestamp) plus `logged_at timestamptz`. The user's IANA timezone (default `Europe/Stockholm`) lives on their profile. Weeks start on Monday.

**Numbers:** store raw values as `numeric`. Round only when displaying.

### Tables

**profiles**
`user_id`, `display_name`, `locale` (default `sv-SE`), `timezone`, `sex`, `birth_date`, `height_cm`, `activity_level`, `unit_system` (metric only for now)

**goals** (versioned, never overwritten, so history stays correct)
`id`, `user_id`, `effective_from date`, `kcal`, `protein_g`, `carbs_g`, `fat_g`, `goal_type` (cut / maintain / bulk), `target_rate_kg_per_week`
The goal for a given day = the latest row where `effective_from <= that day`.

**foods** (shared catalog plus each user's own foods)
`id`, `source` (`livsmedelsverket` | `openfoodfacts` | `user`), `source_id`, `owner_user_id` (null for shared foods), `name_sv`, `name_en`, `brand`, `barcode`,
per 100 g: `kcal`, `protein_g`, `carbs_g`, `fat_g`, `fiber_g`, `sugar_g`, `salt_g`, `alcohol_g`,
`is_verified boolean`, `source_version`, `last_synced_at`

**food_servings**
`id`, `food_id`, `label_sv`, `label_en` (e.g. "1 st", "1 dl", "1 msk", "1 portion"), `grams`

**food_log_entries**
`id`, `user_id`, `log_date`, `meal` (`frukost` | `lunch` | `middag` | `mellanmal`), `food_id`, `serving_id` (nullable), `quantity`, `grams`,
**a snapshot of the food's per-100 g values at the time of logging** (`kcal_100`, `protein_100`, `carbs_100`, `fat_100`, …),
`logged_at`.
Totals are always computed from `grams × snapshot / 100`. This way, if a food is corrected later, old logs don't silently change.

**quick_entries** (log calories and macros without a food, e.g. a restaurant meal)
`id`, `user_id`, `log_date`, `meal`, `label`, `kcal`, `protein_g`, `carbs_g`, `fat_g`

**saved_meals** and **saved_meal_items** (e.g. "Min frukost" = havregryn 60 g + mjölk 2 dl + banan): log all items in one tap.

**favorite_foods** (`user_id`, `food_id`)

**body_metrics**
`id`, `user_id`, `log_date`, `weight_kg`, `waist_cm` (optional), `note`. One weight per day (upsert).

**exercises** (shared catalog plus user-created)
`id`, `owner_user_id` (nullable), `name_sv`, `name_en`, `primary_muscle`, `equipment`, `is_bodyweight`, `default_increment_kg` (2.5 for barbell, 1–2 for dumbbells)

**workout_templates** and **template_exercises**
template: `id`, `user_id`, `name`, `sort_order`
template_exercise: `template_id`, `exercise_id`, `sort_order`, `target_sets`, `target_reps_min`, `target_reps_max`, `rest_seconds`

**workout_sessions**
`id`, `user_id`, `log_date`, `template_id` (nullable), `started_at`, `ended_at`, `note`

**workout_sets**
`id`, `session_id`, `exercise_id`, `set_index`, `weight_kg`, `reps`, `rpe` (optional), `is_warmup`, `completed_at`

Later phase (design for it, don't build yet): **daily_metrics** for water, steps, sleep.

---

## 5. Nutrition accuracy

This is what makes the app trustworthy. Get it exactly right.

### Sources, in priority order

1. **Livsmedelsverket's food database (Livsmedelsdatabasen).** About 2,500 foods with 50+ nutrients each, published as open data under CC BY 4.0. REST API with Swagger docs at `https://dataportal.livsmedelsverket.se/livsmedel/swagger/index.html`. Relevant endpoints: `/api/v1/livsmedel` (list) and `/api/v1/livsmedel/{nummer}/naringsvarden` (nutrients for one food).
   - **Import it into our own `foods` table with a script** (`scripts/import-livsmedelsverket.ts`). Don't call their API live from the app.
   - Check the current API shape in the Swagger docs before writing the importer. Validate every response with Zod.
   - Map nutrients by their EuroFIR component codes, not by display name.
   - Mark these foods `is_verified = true`.
   - Show the required attribution ("Källa: Livsmedelsverkets livsmedelsdatabas") in the food detail view and on an About page.
2. **Open Food Facts**, for packaged products and barcode scans (Swedish supermarket products: ICA, Coop, Arla, etc.). Fetch on demand when a barcode or brand search finds nothing locally, then cache in `foods`.
   - This data is crowd-sourced. Run the sanity check below before saving. If it fails, show the food with a "Kontrollera mot förpackningen" warning and let me correct the values.
3. **User-created foods.** Entered from the nutrition label (per 100 g), with the same sanity check.

### Calculation rules

- Stored values are **per 100 g**. Entry total = `grams / 100 × value_per_100g`.
- **Use the source's energy value (kcal) directly.** Don't recompute kcal from macros. If a source gives only kJ, convert with kcal = kJ / 4.184.
- **Sanity check** (for Open Food Facts and user foods): Atwater estimate = 4×protein + 4×carbs + 9×fat + 7×alcohol + 2×fiber. Flag if the stated kcal differs from that estimate by more than 15% (or more than 20 kcal per 100 g for low-calorie foods).
- **Sum raw values; round only for display.** Day totals are the sum of unrounded entry values. Display kcal as integers and grams with at most one decimal.
- Serving units (st, dl, msk, tsk, portion, skiva) always resolve to grams through `food_servings`. Liquids need a gram weight per dl, not an assumed 1:1.
- Store the snapshot on each log entry (section 4).
- **Cover all of this with unit tests**, including edge cases: 0 g, very large amounts, kJ-only sources, missing macros, and summing many small entries without rounding drift.

### Targets

- **Starting targets** from Mifflin–St Jeor BMR × activity factor, adjusted for the goal (cut ≈ −20%, bulk ≈ +10%). Protein 1.8–2.2 g/kg body weight, fat ≈ 0.8 g/kg, carbs fill the rest. Let me override every number by hand.
- **Phase 4: adaptive TDEE.** After at least 14 days of weight and intake data, estimate real energy expenditure from the trend: TDEE ≈ average daily intake − (change in trend weight in kg × 7,700 kcal / number of days). Suggest a target adjustment. Never apply it automatically.

---

## 6. Features and UX, screen by screen

### Navigation

- **Mobile:** bottom tab bar with Idag, Mat, Träning and Framsteg; Inställningar behind an icon in the header. Thumb-reachable primary actions.
- **Desktop:** left sidebar with the same sections, plus a **command palette (⌘K / Ctrl+K)** to log food, start a workout, log weight or jump to any date.
- **Date switcher** at the top of Idag and Mat: previous/next day, a week strip with dots on logged days, and "Idag" to jump back.

### Idag (dashboard)

- Calories left (big), with eaten vs target as a ring or bar. Protein, carbs and fat progress underneath. Protein should be the most prominent macro.
- Today's meals, collapsed per meal with kcal subtotals; tap to expand.
- Today's workout: the planned template, or a summary of what's been logged.
- Today's weight, with a one-tap input.
- Every card has one obvious primary action. No dead ends.

### Mat (food logging): least friction possible

The logging flow, in priority order:

1. **Search opens instantly with focus in the field.** Before typing, show recent foods, favorites and saved meals for the current meal (chosen from the time of day, easy to change).
2. **Search** is fast, typo-tolerant and Swedish-aware (å, ä, ö; "kvarg" finds "Kvarg naturell"). Use Postgres full-text search with the Swedish config plus trigram similarity. Rank by: my recent and frequent foods first, then verified foods, then the rest.
3. **Choosing an amount:** default to the last amount I used for this food, otherwise the most common serving. Show serving chips (1 st, 1 dl, 100 g, my last amount) and a grams input. Show the live kcal and macro result as I type.
4. **Barcode scan** button in the search bar (mobile camera; on desktop, type the barcode).
5. **Copy:** "Kopiera från igår" per meal, and "Logga igen" on any past entry.
6. **Saved meals:** save the current meal as a reusable combo in one action.
7. **Quick add:** kcal plus optional macros, for restaurant meals.
8. **Editing:** tap an entry to change the amount inline. **Delete with an undo toast, not a confirm dialog.**

Keyboard on desktop: `/` focuses search, ↑/↓ move through results, Enter selects, Enter again logs, Esc closes.

### Träning (workout planner and logger)

**Planning:**

- Templates such as "Push", "Pull", "Ben" or "Helkropp", each an ordered list of exercises with target sets, a rep range and rest time.
- Building a template: search exercises, add, drag to reorder. Simple. Ship a sensible exercise catalog in Swedish (knäböj, marklyft, bänkpress, militärpress, skivstångsrodd, latsdrag, chins, etc.).
- Optional weekly schedule (e.g. Mon Push, Wed Pull, Fri Ben) so Idag can say what's planned.

**Logging (an active session screen):**

- Starting a template opens a focused session view, one exercise at a time or as a scrollable list (pick one design and justify it).
- **Each set is prefilled from last time** (weight × reps). Logging it as suggested is a single tap ("✓").
- Steppers for weight (± the exercise's increment) and reps (± 1), large enough for a sweaty thumb.
- **Progression suggestion:** if every set hit the top of the rep range last time, suggest the weight plus one increment.
- "Senast" (last time) shown per exercise; PR badge when an estimated 1RM (Epley: weight × (1 + reps/30)) beats the previous best.
- **Rest timer** starts automatically after each set, stays visible as the screen changes, with +30 s and Skip. Vibrate on mobile when done (if supported).
- Swap an exercise, add one ad hoc, mark sets as warm-up (excluded from volume and PRs).
- Finishing a session shows a summary: duration, sets, total volume, PRs, and a comparison with last time.
- Keyboard on desktop: Enter logs the current set; Tab moves between weight and reps.

### Framsteg (analytics)

Ranges: 4 weeks, 3 months, 6 months, 1 year, everything.

- **Weight:** daily weigh-ins as dots plus a **7-day moving-average trend line**. Show the current trend weight, the change per week, and progress toward the goal weight. Missing days must not break the line.
- **Intake:** daily kcal vs the target that applied that day (from the versioned goals), weekly averages, protein adherence (% of days hitting target), average macro split.
- **Training:** weekly volume (excluding warm-ups), sessions per week, and a per-exercise view with estimated 1RM over time and a PR history.
- **Consistency:** a calendar heatmap of logged days.
- Phase 4: the adaptive TDEE estimate with a plain-language explanation ("Du har ätit i snitt 2 350 kcal och din trendvikt har minskat 0,3 kg/vecka, så din förbrukning är ungefär 2 680 kcal").
- Every chart: correct scales, labeled units, readable in both themes, and tooltips with exact values. An empty state that tells me what to log to see the chart.
- Export all my data as CSV and JSON.

### Inställningar

Profile, goals (with the calculator, and the history of goal changes), templates, my foods, saved meals, units, theme (system / light / dark), language (Swedish now, English later), data export, delete account.

### Onboarding

At most 4 short steps: goal, body stats, activity level, then review calculated targets (editable). Then land on Idag with clear prompts to log the first meal and the first weight. Skippable, with sensible defaults.

---

## 7. Language and localization

- **All UI text in Swedish** for now, through `next-intl` message files (`messages/sv.json`, with `messages/en.json` kept in sync but allowed to be incomplete). Zero hardcoded strings in components.
- Use natural Swedish fitness language, not literal translations: Idag, Mat, Träning, Framsteg, Inställningar; Frukost, Lunch, Middag, Mellanmål; Kalorier, Protein, Kolhydrater, Fett; Set, Reps, Vikt, Vila; "Logga", "Kopiera från igår", "Senast", "Nytt rekord".
- Format with `Intl` for sv-SE: decimal comma (82,4 kg), space as thousands separator (2 350 kcal), 24-hour time, dates like "lör 10 okt", weeks starting Monday.
- Foods and exercises have `name_sv` and `name_en`; show the one that matches the locale, falling back to the other.

---

## 8. Design, UI and UX

**This is the most important section.** The app lives or dies on whether logging feels effortless and the screens feel calm and clear.

### Principles

- **Fewest possible steps.** Before building any flow, count the taps. Remove one.
- **Smart defaults everywhere:** the meal from the time of day, the amount from last time, the weight from the last session.
- **Undo instead of confirm.** Confirmation dialogs only for irreversible bulk actions (deleting an account).
- **Optimistic UI:** every log appears instantly. Show sync status quietly, never block.
- **One primary action per screen**, visually obvious.
- **Numbers are the hero.** Big, tabular, legible at a glance mid-workout.
- **Consistency:** the same component for every "add" flow, the same placement for primary actions.
- **Empty states teach:** each one says what will appear and offers the action to make it appear.

### Visual direction

- Clean, confident and calm, closer to a well-made training notebook than a neon gym app. No gradients for decoration, no emoji as icons, no stock "fitness" imagery.
- **Each domain has one color, used consistently** in every chart and badge (food, training, body weight, recovery). Use semantic colors (good/warning/over target) separately from the accent.
- **Typography:** a condensed or sporty display face for big numbers and headings, paired with a highly legible sans for body text. `font-variant-numeric: tabular-nums` on every number.
- **Light and dark themes**, both designed (not just inverted), following the system setting by default.
- Generous touch targets (at least 44×44 px), clear focus states, WCAG AA contrast.
- Restrained motion: quick, purposeful transitions (logging confirmation, the progress ring filling). Respect `prefers-reduced-motion`.

### Deliverable before building screens

At the start of Phase 1, create `/design`: a design tokens file (colors for both themes, type scale, spacing, radii, shadows) and a `/dev/components` page showing every core component in both themes (buttons, inputs, steppers, cards, list rows, progress ring, macro bars, chips, toasts, bottom sheet, empty state). **Show me this page before building features.**

### Responsive behavior

- **Mobile (< 768 px):** single column, bottom tab bar, bottom sheets for adding things, primary actions within thumb reach.
- **Desktop (≥ 1024 px):** sidebar, multi-column dashboard, side panel instead of bottom sheets, full keyboard support, command palette, hover states.
- Test every screen at 390 px and 1440 px wide.

---

## 9. Quality bar

- **Unit tests (Vitest):** nutrition math, serving conversions, kJ→kcal, the sanity check, day/week aggregation, goal-for-date lookup, Epley 1RM, progression suggestions, moving average with gaps, TDEE calculations, date handling around midnight and DST in `Europe/Stockholm`.
- **E2E tests (Playwright),** at desktop and mobile viewports: sign in → log a food by search → edit the amount → undo a delete → see the totals update; start a template → log sets → finish → see the PR; log weight → see it in Framsteg.
- **RLS tests:** user A can never read or write user B's data.
- No TypeScript errors, no ESLint warnings, no console errors.
- Lighthouse: Performance ≥ 90 and Accessibility ≥ 95 on mobile.
- Seed script for development: one demo user with 8 weeks of realistic logs, **using real foods from the imported Livsmedelsverket data** (never invented values).

---

## 10. Build phases

Stop after each phase for my review.

**Phase 0: Setup**
Repo, Next.js, TypeScript, Tailwind, ESLint/Prettier, Vitest, Playwright, Supabase project and local dev, next-intl with Swedish messages, README with setup steps.

**Phase 1: Foundation**
Design tokens and the `/dev/components` page (review with me first). Auth. Full database schema with RLS and migrations. App shell: navigation for mobile and desktop, date switcher, theme. Onboarding and goal calculator.

**Phase 2: Food**
Livsmedelsverket import script and search. Logging flow (recents, favorites, servings, quick add, copy from yesterday, saved meals, inline edit, undo). Daily totals on Idag. Open Food Facts plus barcode scanning. User-created foods with the sanity check. All nutrition tests.

**Phase 3: Training**
Exercise catalog, templates and the template builder, weekly schedule, active session screen with prefills, steppers, progression suggestions, rest timer, PRs and the session summary.

**Phase 4: Body and analytics**
Weight logging and the trend line, intake analytics using the versioned goals, training analytics, the consistency heatmap, adaptive TDEE suggestions, CSV and JSON export.

**Phase 5: Polish, PWA and offline**
Installable PWA, offline queue for logs (especially during workouts) with conflict-safe sync, the command palette, keyboard shortcuts everywhere, a performance pass, an accessibility pass, and a Swedish copy review of every string.

**Later (not now):** English version, water/steps/sleep tracking, habits, reminders, Apple Health / Google Fit import.

---

## 11. Definition of done

The app is done when I can, on both my laptop and my phone:

- Log a typical day of eating in under a minute total, with totals that match a hand calculation from Livsmedelsverket's values.
- Run a full gym session logging every set with one tap each when I hit the suggested numbers.
- Open Framsteg after a month and clearly see my weight trend, average intake vs target and strength progress.
- Close the laptop, open the phone, and see everything exactly where I left it.
- Want to open it again tomorrow.
