import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";

import {
  courses,
  enrolments,
  lecturerProfiles,
  studentProfiles,
  users,
} from "../src/db/schema";
import * as schema from "../src/db/schema";

config({ path: ".env.local" });

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const db = drizzle(neon(process.env.DATABASE_URL), { schema });
  const passwordHash = await bcrypt.hash("Password123", 12);

  const [lecturerUser] = await db
    .insert(users)
    .values({
      name: "Demo Lecturer",
      email: "lecturer@example.com",
      passwordHash,
      role: "lecturer",
      status: "active",
      emailVerifiedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: users.email,
      set: { passwordHash, status: "active", updatedAt: new Date() },
    })
    .returning();

  const [lecturerProfile] = await db
    .insert(lecturerProfiles)
    .values({
      userId: lecturerUser.id,
      staffId: "STAFF-001",
      department: "Computer Science",
    })
    .onConflictDoUpdate({
      target: lecturerProfiles.userId,
      set: { department: "Computer Science", updatedAt: new Date() },
    })
    .returning();

  const [studentUser] = await db
    .insert(users)
    .values({
      name: "Demo Student",
      email: "student@example.com",
      passwordHash,
      role: "student",
      status: "active",
      emailVerifiedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: users.email,
      set: { passwordHash, status: "active", updatedAt: new Date() },
    })
    .returning();

  const [studentProfile] = await db
    .insert(studentProfiles)
    .values({
      userId: studentUser.id,
      studentIdNumber: "STU-001",
      programme: "BSc Computer Science",
      level: "200",
      classGroup: "main",
    })
    .onConflictDoUpdate({
      target: studentProfiles.userId,
      set: { programme: "BSc Computer Science", updatedAt: new Date() },
    })
    .returning();

  const existingCourse = await db
    .select()
    .from(courses)
    .where(eq(courses.courseCode, "CSM201"))
    .limit(1);

  const [course] = existingCourse.length
    ? existingCourse
    : await db
        .insert(courses)
        .values({
          courseCode: "CSM201",
          courseTitle: "Attendance Systems",
          programme: "BSc Computer Science",
          level: "200",
          semester: "Semester 1",
          academicYear: "2026/2027",
          classGroup: "main",
          lecturerId: lecturerProfile.id,
          status: "active",
        })
        .returning();

  await db
    .insert(enrolments)
    .values({
      courseId: course.id,
      studentId: studentProfile.id,
      status: "active",
    })
    .onConflictDoUpdate({
      target: [enrolments.courseId, enrolments.studentId],
      set: { status: "active", updatedAt: new Date() },
    });

  console.log("Seed complete.");
  console.log("Lecturer: lecturer@example.com / Password123");
  console.log("Student: student@example.com / Password123");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
