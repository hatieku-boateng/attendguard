import "server-only";

import { and, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { academicYears, departments, faculties } from "@/db/schema";
import {
  academicYearDisplayName,
  generatedAcademicYearOptions,
  parseAcademicYear,
} from "@/lib/institution";

const defaultFaculty = {
  name: "Faculty of Engineering, Science and Computing",
  code: "FESC",
};

const defaultDepartment = {
  name: "Information Technology",
  code: "IT",
};

export async function ensureDefaultFacultyDepartment() {
  const db = getDb();
  const [existingFaculty] = await db
    .select()
    .from(faculties)
    .where(eq(faculties.code, defaultFaculty.code))
    .limit(1);
  const [faculty] = existingFaculty
    ? [existingFaculty]
    : await db
        .insert(faculties)
        .values({
          ...defaultFaculty,
          description: "Default faculty classification for existing course catalogue records.",
          status: "active",
        })
        .returning();

  const [existingDepartment] = await db
    .select()
    .from(departments)
    .where(
      and(
        eq(departments.facultyId, faculty.id),
        eq(departments.code, defaultDepartment.code),
      ),
    )
    .limit(1);
  const [department] = existingDepartment
    ? [existingDepartment]
    : await db
        .insert(departments)
        .values({
          ...defaultDepartment,
          facultyId: faculty.id,
          description: "Default department classification for existing course catalogue records.",
          status: "active",
        })
        .returning();

  return { faculty, department };
}

export async function ensureAcademicYear(displayName?: string | null) {
  const parsed = parseAcademicYear(displayName ?? null);
  const fallbackStartYear = generatedAcademicYearOptions().find((option) => option.isCurrent)!
    .startYear;
  const target = parsed ?? {
    startYear: fallbackStartYear,
    endYear: fallbackStartYear + 1,
    displayName: academicYearDisplayName(fallbackStartYear),
  };
  const db = getDb();
  const [existing] = await db
    .select()
    .from(academicYears)
    .where(eq(academicYears.displayName, target.displayName))
    .limit(1);

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(academicYears)
    .values({
      startYear: target.startYear,
      endYear: target.endYear,
      displayName: target.displayName,
      isCurrent: target.startYear === fallbackStartYear,
      status: "active",
    })
    .returning();

  return created;
}

export async function ensureGeneratedAcademicYears() {
  const db = getDb();
  const generated = generatedAcademicYearOptions();
  const rows = [];

  for (const option of generated) {
    const [existing] = await db
      .select()
      .from(academicYears)
      .where(eq(academicYears.displayName, option.displayName))
      .limit(1);

    if (existing) {
      rows.push(existing);
      continue;
    }

    const [created] = await db
      .insert(academicYears)
      .values({
        startYear: option.startYear,
        endYear: option.endYear,
        displayName: option.displayName,
        isCurrent: option.isCurrent,
        status: "active",
      })
      .returning();
    rows.push(created);
  }

  const [existingCurrent] = await db
    .select({ id: academicYears.id })
    .from(academicYears)
    .where(eq(academicYears.isCurrent, true))
    .limit(1);

  if (!existingCurrent) {
    const generatedCurrent = generated.find((option) => option.isCurrent)!;
    await db
      .update(academicYears)
      .set({ isCurrent: true, status: "active", updatedAt: new Date() })
      .where(eq(academicYears.displayName, generatedCurrent.displayName));
  }

  return rows;
}
