# Pentecost University Attendance System

A high-performance, secure, and location-aware digital attendance management platform custom-tailored for **Pentecost University**. It transitions paper-based registers into a verified, auditable attendance console featuring automated student enrolment, device passkey binding, and geofenced coordinate verification.

## Core Features

### 👤 Role-Based Portals
* **Administrator Console**: Manage lecturers, academic years, faculties, departments, and course-to-lecturer assignments.
* **Lecturer Workspace**: Import student class lists (via CSV), publish course resources, initiate geofenced attendance sessions, review student check-in coordinates, and export registers.
* **Student Interface**: Check in to active lectures, generate/manage secure device passkeys, and view personal attendance history.

### 🔒 Secure Verification Architecture
* **Geofenced Check-ins**: Location perimeters validate student coordinates against lecturer coordinates during check-in.
* **Device Passkey Binding**: Authenticates and binds student profiles to individual devices during account activation, preventing proxy attendance.
* **Student Activation Flow**: Imported students receive unique activation links, confirm their Student ID, and activate their device profile.

---

## Technology Stack

* **Framework**: Next.js (App Router, Turbopack)
* **Language**: TypeScript
* **Styling**: Tailwind CSS (v4) & shadcn/ui
* **Database & ORM**: Drizzle ORM with Neon PostgreSQL
* **Mail & SMTP**: Gmail SMTP configured with Nodemailer

---

## Local Development Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Configuration**:
   Copy `.env.example` to `.env.local` and define the required variables:
   ```bash
   DATABASE_URL="postgresql://..."
   AUTH_SECRET="your-long-random-secret"
   APP_URL="http://localhost:3000"
   EMAIL_SENDER="no-reply@pentvars.edu.gh"
   EMAIL_SENDER_NAME="PU Attendance System"
   GMAIL_APP_PASSWORD="your-gmail-app-password"
   ```

3. **Database Setup**:
   Generate migrations, push them to your database, and seed initial records:
   ```bash
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## Utility Commands

* `npm run lint` — Lint codebase for code style and formatting.
* `npm run typecheck` — Run TypeScript compile-time type-safety check.
* `npm run build` — Build production optimized bundle.
* `npm run db:studio` — Open interactive database studio interface (Drizzle Studio).

---

## Production Deployment

Production builds are compiled and deployed to Vercel:
```bash
vercel deploy --prod --force --yes --scope harry-atieku-boateng-s-projects
```
