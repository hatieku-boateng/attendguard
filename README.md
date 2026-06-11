# AttendGuard

Full-stack attendance management system for administrator-managed lecturers,
course assignment, student enrolment, secure account activation, and
location-aware attendance sessions.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Drizzle ORM
- Neon PostgreSQL
- Gmail SMTP with Nodemailer

## Local Setup

Copy `.env.example` to `.env.local` and fill in real values before connecting external services.

At minimum, local database-backed routes require:

```bash
DATABASE_URL="postgresql://..."
AUTH_SECRET="a-long-random-secret"
APP_URL="http://localhost:3000"
EMAIL_SENDER="sender@gmail.com"
EMAIL_SENDER_NAME="AttendGuard"
GMAIL_APP_PASSWORD="gmail-app-password"
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Useful Commands

```bash
npm run lint
npm run typecheck
npm run build
npm run db:generate
npm run db:migrate
npm run db:studio
npm run db:seed
```

## Notes

- Keep database access in server-only files.
- Do not expose secrets with `NEXT_PUBLIC_`.
- Drizzle schema lives in `src/db/schema.ts`.
- The database client is lazily initialized in `src/db/client.ts` to keep Next.js builds safe.
- CSV student import expects headings: `student name`, `student id`, `email address`, with optional `programme`, `level`, and `class group`.
- Students imported by a lecturer receive a secure one-time activation link by email, confirm their student ID, then set a password.
- Passkeys are validated by hash and stored encrypted only for authenticated first-version delivery.
- More operational notes live in `PROJECT_INFORMATION.md`.

## Current Product Scope

- Admin-only lecturer account creation
- Admin course catalogue management
- Admin course-to-lecturer assignments
- Secure imported student account activation
- Lecturer class roster import
- Lecturer course resource publishing
- Attendance session creation with lecturer geolocation
- Student-specific passkey generation
- Student active-session check-in with location capture
- Server-side passkey, time, enrolment, duplicate, accuracy, and geofence validation
- Lecturer dashboard, session monitoring, manual review approval/rejection
- Student class list, active sessions, and attendance history
- CSV attendance report export

## Deploy on Vercel

Production is deployed on Vercel:

```bash
vercel deploy --prod --force --yes --scope harry-atieku-boateng-s-projects
```
