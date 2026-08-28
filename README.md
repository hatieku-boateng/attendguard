# Pentecost University Attendance System

A secure digital attendance management platform for Pentecost
University. It transitions paper-based registers into verified, auditable
attendance records with administrator-managed lecturers, course assignments,
student enrolment, account activation, and continuously rotating QR verification.

## Core Features

### Role-Based Portals

* **Administrator Console**: Manage faculties and their departments, lecturers,
  course catalogues, course assignments, student enrolment, and lecture schedules.
* **Lecturer Workspace**: View administrator-managed rosters, publish course
  resources, display the live QR code for scheduled lectures, monitor the roster,
  and export registers.
* **Student Interface**: Activate an imported account, scan the current classroom
  QR code, and view personal attendance history.

### Secure Verification Architecture

* **Rotating QR Check-ins**: Each open session displays a signed QR code that
  changes every five seconds. The server accepts only the current or immediately
  previous code to tolerate normal camera and network delay.
* **Account-Bound Attendance**: A successful scan is credited only to the signed-in
  student when they are enrolled in the course and have not already checked in.
* **Student Activation Flow**: Imported students receive secure activation links,
  confirm their student ID, and create their password.
* **Audit Trail**: Attendance records, rejected attempts, manual approvals, and
  session changes are stored for review and reporting.

## Technology Stack

* **Framework**: Next.js App Router
* **Language**: TypeScript
* **Styling**: Tailwind CSS and shadcn/ui
* **Database and ORM**: Drizzle ORM with Neon PostgreSQL
* **Mail and SMTP**: Gmail SMTP configured with Nodemailer

## Local Development Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and define the required variables:

   ```bash
   DATABASE_URL="postgresql://..."
   AUTH_SECRET="your-long-random-secret"
   APP_URL="http://localhost:3000"
   EMAIL_SENDER="sender@gmail.com"
   EMAIL_SENDER_NAME="PU Attendance"
   GMAIL_APP_PASSWORD="your-gmail-app-password"
   ```

3. Prepare the database:

   ```bash
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Useful Commands

* `npm run lint` - Lint the codebase.
* `npm run typecheck` - Run TypeScript compile-time checks.
* `npm run build` - Build the production optimized bundle.
* `npm run db:studio` - Open Drizzle Studio.

## Production Deployment

Production builds are compiled and deployed to Vercel:

```bash
vercel deploy --prod --force --yes --scope harry-atieku-boateng-s-projects
```

Production URL:

https://attendance-management-system-two-omega.vercel.app
