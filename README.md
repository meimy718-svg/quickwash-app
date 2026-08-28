# QuickWash

Mobile-first car wash booking app for mall parking locations. Customers scan a QR
code at their parking spot, book a wash with no login required, and get a 4-digit
OTP. Operators triage bookings in real time, workers verify the OTP and log
before/after photos, and admins manage locations, workers and daily reports.

## Tech stack

- **Frontend:** Next.js 14 (App Router) + Tailwind CSS
- **Backend:** Supabase (Postgres, Auth, Realtime, Storage)
- **QR codes:** [`qrcode`](https://www.npmjs.com/package/qrcode)
- **Hosting:** Vercel (auto-deploy on push to `main`)

## Roles

| Role     | Route        | Access |
|----------|--------------|--------|
| Customer | `/book`      | Public, no login |
| Operator | `/dashboard` | Supabase Auth, `profiles.role = 'operator'` (or `admin`) |
| Worker   | `/worker`    | Supabase Auth, `profiles.role = 'worker'`, sees only bookings assigned to their `worker_id` |
| Admin    | `/admin`     | Supabase Auth, `profiles.role = 'admin'` |

Route access is enforced in [`src/lib/supabase/middleware.ts`](src/lib/supabase/middleware.ts),
and again by Postgres Row Level Security policies in [`supabase/schema.sql`](supabase/schema.sql)
— the middleware keeps people out of the wrong UI, RLS keeps them out of the wrong data
even if they call Supabase directly.

## 1. Set up the Supabase project

1. Create/open your Supabase project (this one is provisioned in the Mumbai region at
   `https://rwbpuvtsgwjzhereeufw.supabase.co`).
2. In the SQL editor, run [`supabase/schema.sql`](supabase/schema.sql). It creates the
   `locations`, `workers`, `bookings` and `profiles` tables, enables Realtime on
   `bookings`, sets up Row Level Security policies for every role, and creates the
   public `car-photos` storage bucket.
3. Visit `/signup` and create the first **admin** account. This route only works while
   zero admins exist — once one is created, `/signup` redirects everyone else to
   `/login` and refuses further admin creation. (`/login` also shows a "Set up admin
   account" link automatically while no admin exists yet.)
4. From `/admin` you can then add **workers** and **operators** — each creates a real
   Supabase Auth login and `profiles` row and shows a one-time temporary password to
   share with them. No manual SQL needed for any of this.
5. Forgot a password? `/login` → **Forgot password?** sends a reset email (via
   `/forgot-password` → `/reset-password`).

## 2. Environment variables

Copy `.env.example` to `.env.local` and fill in the real values from
**Supabase → Project Settings → API**:

```bash
cp .env.example .env.local
```

| Variable | Where to find it |
|----------|-------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → `service_role` key (**server-only, never expose to the browser**) |
| `NEXTAUTH_SECRET` | Any random string — used as a general app secret |
| `NEXTAUTH_URL` | `http://localhost:3000` locally, your production URL on Vercel |

`.env.local` is gitignored and never committed.

## 3. Run locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`. Try the golden path:

1. Open `/book?location=Level2-GateA` and submit a booking → note the OTP.
2. Sign in as an operator at `/login` → watch the booking appear on `/dashboard`
   in real time (with an alert sound) → assign it to a worker.
3. Sign in as that worker at `/login` → open `/worker`, enter the OTP the customer
   received to start the job, upload before/after photos, then complete the job.
4. Sign in as admin at `/login` → `/admin` to generate a location QR code, manage
   workers, and export the daily CSV report.

## 4. Deploy to Vercel

1. In the [Vercel dashboard](https://vercel.com/new), **Import Project** and select
   the `meimy718-svg/quickwash-app` GitHub repository.
2. Add the same environment variables from `.env.local` (step 2) in
   **Project Settings → Environment Variables** — use your production
   `NEXTAUTH_URL` (your Vercel domain) instead of `localhost`.
3. Deploy. From then on, every push to `main` triggers an automatic redeploy.

## Project structure

```
src/
  app/
    book/                customer booking form + OTP success screen
    login/                staff login (Supabase Auth)
    signup/              one-time first-admin bootstrap
    forgot-password/      request a password reset email
    reset-password/        set a new password after following the email link
    auth/callback/          exchanges a Supabase auth code for a session
    dashboard/            operator dashboard (Realtime, key status, worker assignment)
    worker/                worker view (OTP verify, photo upload, start/complete job)
    admin/                QR generator, worker + operator management, daily report + CSV
    api/admin/workers/      provisions a worker's Supabase Auth login
    api/admin/operators/     provisions an operator's Supabase Auth login
    api/bootstrap/          status check + first-admin creation for /signup
  components/              shared UI (StaffHeader, StatusPill, DailyReport)
  lib/
    supabase/              browser / server / admin Supabase clients + auth middleware
    types.ts                shared TypeScript types
    playAlert.ts            Web Audio beep for new-booking alerts
supabase/
  schema.sql                full DB schema, RLS policies, storage bucket setup
```

## Git workflow

Each feature is committed with a tag prefix — `setup`, `db`, `feature`, `fix`, `docs` —
and pushed to `main`, which Vercel auto-deploys.
