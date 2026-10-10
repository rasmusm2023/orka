# Kondis

Personal training and nutrition tracker. The product name is Kondis. This repository is `orka`.

Swedish is the interface language. English exists as a second locale so the structure is ready, and it is allowed to lag behind.

## Prerequisites

- Node.js 24
- npm
- A hosted Supabase project. App data lives there, not on this computer.

## Setup

```bash
npm install
cp .env.example .env.local
npx playwright install chromium
```

On Windows PowerShell, copy the example env file with `Copy-Item .env.example .env.local`.

## Hosted Supabase

Create a project at [supabase.com](https://supabase.com). In **Project Settings → API Keys**, copy the project URL and the publishable key into `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

Restart `npm run dev` after saving that file. The app still starts without these variables. Auth and data calls wait until they are set.

Database migrations in `supabase/` are applied to that hosted project. Docker is not part of this setup.

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

The project ref is the subdomain of the project URL. `db push` asks for the database password from **Project Settings → Database**.

### Auth redirects

In the hosted project, open **Authentication → URL configuration** and set:

- Site URL: `http://localhost:3000`
- Redirect URLs: `http://localhost:3000/auth/callback` and `http://127.0.0.1:3000/auth/callback`

Sign-in is email and password. Creating an account uses the same fields. Google is optional and returns to `/auth/callback`, so the redirect URLs above are still required if you turn that provider on.

In **Authentication → Providers → Email**, turn off **Confirm email**. Otherwise Supabase tries to send a confirmation message before the account can sign in, and the built-in mailer only allows a couple of those an hour.

### Food catalog

After the migrations are applied, copy the secret key from **Project Settings → API Keys** into `.env.local` as `SUPABASE_SECRET_KEY`. Then import Livsmedelsverket:

```bash
npm run import:foods
```

The script reads the public food API and upserts verified foods. It does not invent nutrition values. Open Food Facts products are fetched later, when a barcode or an empty local search needs them.

## Develop

```bash
npm run dev
```

Open http://127.0.0.1:3000. That URL is Swedish. http://127.0.0.1:3000/en is English.

## Checks

```bash
npm run lint
npm run format:check
npm run typecheck
npm test
npm run test:e2e
npm run build
```

End-to-end tests run at 1440×900 and at 390×844.
