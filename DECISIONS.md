# Decisions

Small choices made while building. Architectural questions that the spec does not cover get asked before they are implemented.

## Phase 0

- Package name is `orka`, matching the repository. The product name in the interface is Kondis.
- npm is the package manager. `@types/node` tracks the Node 24 runtime.
- Application code lives in `src/`.
- Locales are `sv` and `en`. Swedish has no URL prefix (`localePrefix: "as-needed"`). The browser language does not change the locale (`localeDetection: false`); Swedish stays the default until a language setting exists. Formatting for Swedish uses `sv-SE`. English uses `en` until that locale is designed.
- UI strings live in `messages/sv.json` and `messages/en.json`. English may miss keys. It may not add keys that Swedish does not have.
- App data is stored in a hosted Supabase project. The phone and the laptop both use that project. Docker and a local database are not part of the setup. Firebase stays out: the spec's schema, row-level security, and nutrition import are Postgres.
- Supabase clients use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, the current public key name. The proxy refreshes the session with `getClaims()` and skips that step when the env vars are missing, so the app runs before the hosted project is configured.
- `supabase/config.toml` holds project settings for migrations (`project_id = "orka"`). `http://localhost:3000` is an auth redirect URL for local development against the hosted project.
- Cache Components and partial prefetching stay on, as created by Next.js 16.4.
- Vitest runs in the Node environment. Calculation tests will live next to the code they cover. Playwright covers the rendered shell at a 1440px desktop viewport and a 390×844 phone viewport.
- Prettier follows the Next.js scaffold: double quotes, semicolons, trailing commas.
- Typography, color, and the real screens wait for the Phase 1 design tokens. The current page is only there to prove the shell, the locale, and the theme preference.

## Phase 1, design first

- Display type is Barlow Condensed. Body type is Source Sans 3. Both include Swedish characters. Big numbers use the condensed face and tabular figures.
- Light is warm paper. Dark is a warm near-black, with its own ink and domain colors, not an inverted light theme.
- Domain colors are food, training, body weight, and recovery. Good, warning, and over-target sit beside them.
- The first controls are our own. They are on `/dev/components` for review before shadcn or product screens.
- Unknown URLs render the translated not-found screen from a catch-all page. Calling `notFound()` while Cache Components prerenders that route replaces the page with the dev error overlay, so the catch-all renders the screen directly. The response status is 200 for now.

## Phase 1, foundation

- Mifflin–St Jeor uses the two published equations, so sex is `male` or `female`. Activity factors are the common set: 1.2, 1.375, 1.55, 1.725 and 1.9. A cut is 80% of expenditure, maintenance is 100%, a bulk is 110%. Protein defaults to 2.0 g/kg (inside 1.8–2.2) and fat to 0.8 g/kg. Carbs fill the remaining calories and never go below zero. The weekly rate is `(kcal − expenditure) × 7 / 7700`. Age must be 15–100. The user can edit every target before it is saved.
- Goals are insert-only. A later change is a new row. The goal for a day is the newest row whose `effective_from` is on or before that day.
- Skipping onboarding writes no calorie target. `profiles.onboarding_completed_at` records that the steps were finished or skipped. Theme lives on the profile (`system`, `light`, `dark`) and is mirrored in `localStorage` so the first paint can match. The language choice is stored as `sv-SE` or `en` and in the `kondis-locale` cookie, which the proxy applies without reading the browser language.
- The selected day is the `datum` query (`YYYY-MM-DD`). A missing or invalid value means today in the profile timezone, default `Europe/Stockholm`.
- TanStack Query starts with the first optimistic log in Phase 2. Phase 1 writes go through server actions.
- `/dev/components` stays public. The product screens require a session.
- Sign-in is email and password, with separate sign-in and create-account actions. The magic link was replaced at the user's request. Google stays as a second option. Supabase still has to have **Confirm email** turned off, or creating an account waits on a confirmation message.
- Shared foods and exercises (`owner_user_id` null) are readable by any signed-in user. Only the service role can write Livsmedelsverket rows. Authenticated users can write their own foods. An Open Food Facts product is cached through the `cache_open_food` function, which inserts that source only and never marks it verified. Goals cannot be updated or deleted.

## Phase 2, food

- Livsmedelsverket publishes energy twice under the EuroFIR code `ENERC`, once in kcal and once in kJ. The importer keeps the kcal row. If only kJ is present, kcal = kJ / 4.184. Only values whose matrix unit is `W` (per 100 g edible portion) are used. A food with a missing kcal, protein, carbohydrate or fat value is skipped.
- The Livsmedelsverket API has no portion weights, so the importer does not invent servings. The amount step offers 100 g, the last logged amount, and any serving that exists on the food.
- A meal is chosen from the hour in the profile timezone: 05–09 breakfast, 10–13 lunch, 17–20 dinner, otherwise a snack.
- Low-calorie foods are those at or under 50 kcal per 100 g. Their sanity check allows 20 kcal of difference. Above that, the stated kcal may differ from the Atwater estimate by at most 15%.
- A logged amount must be above 0 g and at most 5 000 g.
- Typed search uses the Livsmedelsverket catalog (`data/livsmedel-names.json`, names from their API). The shown kcal and macros are that food's published per-100 g values, fetched when the result is built. A picked official food is stored with those source values.
- Branded search uses Open Food Facts products sold in Sweden (`se.openfoodfacts.org`, and the record must include `en:sweden`). Those hits are listed under the official foods. A picked product is cached the same way as a barcode, and the sanity check still applies. A scanned barcode opens the package that was scanned.
- TanStack Query holds the day log so a new entry shows before the save returns. The server action is still the write.
