# AttendGuard Project Information

## Live Services

- Production app: https://attendguard.vercel.app
- GitHub repository: https://github.com/hatieku-boateng/attendguard
- Vercel project: `attendguard`
- Vercel scope: `harry-atieku-boateng-s-projects`
- Database: Neon PostgreSQL connected through Vercel environment variables

## Admin Access

- Admin console: https://attendguard.vercel.app/admin/dashboard
- Admin email: `admin@attendguard.app`
- Admin password: stored outside the repository

## Environment Variables

Required runtime variables:

```text
DATABASE_URL
AUTH_SECRET
APP_URL
EMAIL_SENDER
EMAIL_SENDER_NAME
GMAIL_APP_PASSWORD
```

Notes:

- Real values must live only in Vercel Environment Variables or a local ignored `.env.local`.
- Do not commit plaintext secrets, app passwords, database URLs, OAuth secrets, or tokens.
- Gmail sending uses `EMAIL_SENDER` plus `GMAIL_APP_PASSWORD`.
- `.env.example` documents variable names only.

## Email Flow

- Lecturers import students by CSV.
- Required CSV headings: `student name`, `student id`, `email address`.
- Optional CSV headings: `programme`, `level`, `class group`.
- New imported students are created as pending users.
- Each pending student receives a secure one-time activation link by email.
- The activation link contains a random token.
- Only a SHA-256 hash of the token is stored in the database.
- The student must confirm their student ID before creating a password.
- Activation tokens expire after 72 hours and are single-use.

## Main Workflows

- Administrators create lecturer accounts.
- Administrators maintain a course catalogue.
- Administrators assign catalogue courses to lecturers.
- Lecturers import/enrol students into assigned courses.
- Lecturers add course resources for students.
- Lecturers create attendance sessions.
- Students activate their account from an emailed link.
- Students check in to open attendance sessions.

## Useful Commands

```powershell
npm run lint
npm run typecheck
npm run build
npm run db:generate
npm run db:migrate
vercel deploy --prod --force --yes --scope harry-atieku-boateng-s-projects
```

## Cleanup Policy

Keep these out of the repository and, where possible, out of the workspace:

```text
.env.local
.env.backup.local
SECRETS_PLAINTEXT_DO_NOT_COMMIT.local.txt
*.png temporary screenshots
extracted scratch notes
```
