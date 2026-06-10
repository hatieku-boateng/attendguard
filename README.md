# AttendGuard

Full-stack attendance management application foundation based on the project specification in the parent folder.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Drizzle ORM
- Neon PostgreSQL
- Better Auth
- Resend

## Local Setup

Copy `.env.example` to `.env.local` and fill in real values before connecting external services.

At minimum, local database-backed routes require:

```bash
DATABASE_URL="postgresql://..."
AUTH_SECRET="a-long-random-secret"
APP_URL="http://localhost:3000"
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
- Students imported by a lecturer can use `/activate-account` to match their email and student ID, then set a password.
- Passkeys are validated by hash and stored encrypted only for authenticated first-version delivery.

## Current Product Scope

- Lecturer and student account registration
- Imported student account activation
- Lecturer course creation and class roster import
- Attendance session creation with lecturer geolocation
- Student-specific passkey generation
- Student active-session check-in with location capture
- Server-side passkey, time, enrolment, duplicate, accuracy, and geofence validation
- Lecturer dashboard, session monitoring, manual review approval/rejection
- Student class list, active sessions, and attendance history
- CSV attendance report export

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
