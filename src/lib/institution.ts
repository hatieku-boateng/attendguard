export const studentCategories = [
  { value: "regular", label: "Regular Student" },
  { value: "weekend", label: "Weekend Student" },
  { value: "access", label: "Access Student" },
] as const;

export const programmeLevels = [
  { value: "diploma", label: "Diploma" },
  { value: "undergraduate", label: "Undergraduate" },
  { value: "postgraduate", label: "Postgraduate" },
] as const;

export type StudentCategory = (typeof studentCategories)[number]["value"];
export type ProgrammeLevel = (typeof programmeLevels)[number]["value"];

export function normalizeStudentCategory(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase().replace(/[\s_-]+/g, " ") ?? "";

  if (["regular", "regular student"].includes(normalized)) {
    return "regular" as const;
  }

  if (["weekend", "weekend student"].includes(normalized)) {
    return "weekend" as const;
  }

  if (["access", "access student"].includes(normalized)) {
    return "access" as const;
  }

  return null;
}

export function normalizeProgrammeLevel(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase().replace(/[\s_-]+/g, " ") ?? "";

  if (["diploma"].includes(normalized)) {
    return "diploma" as const;
  }

  if (["undergraduate", "undergrad", "undergraduate student", "degree", "ug"].includes(normalized)) {
    return "undergraduate" as const;
  }

  if (["postgraduate", "postgrad", "masters", "master", "pg"].includes(normalized)) {
    return "postgraduate" as const;
  }

  return null;
}

export function studentCategoryLabel(value?: string | null) {
  return studentCategories.find((category) => category.value === value)?.label ?? "-";
}

export function programmeLevelLabel(value?: string | null) {
  return programmeLevels.find((level) => level.value === value)?.label ?? "-";
}

export function academicYearDisplayName(startYear: number) {
  return `${startYear}/${startYear + 1}`;
}

export function parseAcademicYear(value: string | null | undefined) {
  const match = value?.trim().match(/^(\d{4})\/(\d{4})$/);

  if (!match) {
    return null;
  }

  const startYear = Number(match[1]);
  const endYear = Number(match[2]);

  if (endYear !== startYear + 1) {
    return null;
  }

  return { startYear, endYear, displayName: academicYearDisplayName(startYear) };
}

export function currentAcademicYearStartYear(date = new Date()) {
  const configuredMonth = Number(process.env.ACADEMIC_YEAR_START_MONTH ?? "9");
  const startMonth = Number.isInteger(configuredMonth)
    ? Math.min(Math.max(configuredMonth, 1), 12)
    : 9;
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  return month >= startMonth ? year : year - 1;
}

export function generatedAcademicYearOptions(date = new Date()) {
  const current = currentAcademicYearStartYear(date);

  return [current - 1, current, current + 1].map((startYear) => ({
    startYear,
    endYear: startYear + 1,
    displayName: academicYearDisplayName(startYear),
    isCurrent: startYear === current,
  }));
}
