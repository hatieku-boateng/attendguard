import { and, desc, eq, gte, lte, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { getDb } from "@/db/client";
import {
  attendanceRecords,
  attendanceSessions,
  courses,
  departments,
  faculties,
  lectureHalls,
  lecturerProfiles,
  studentProfiles,
  users,
} from "@/db/schema";

const creditedStatuses = new Set(["present", "late", "manually_present"]);

function text(value: string | null) {
  return value?.trim() ?? "";
}

function upper(value: string | null) {
  return text(value).toUpperCase();
}

function dateParam(value: string | null, endOfDay = false) {
  const raw = text(value);
  if (!raw) return null;

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    date.setUTCHours(endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  }

  return date;
}

function attendanceRate(credited: number, total: number) {
  return total > 0 ? Number(((credited / total) * 100).toFixed(2)) : 0;
}

function addFilter(filters: SQL[], condition: SQL | undefined) {
  if (condition) filters.push(condition);
}

export type AttendanceReportRow = Awaited<ReturnType<typeof getAttendanceReport>>["records"][number];

export async function getAttendanceReport(searchParams: URLSearchParams) {
  const db = getDb();
  const studentUsers = alias(users, "student_users");
  const lecturerUsers = alias(users, "lecturer_users");
  const filters: SQL[] = [];
  const fromDate = dateParam(searchParams.get("from"));
  const toDate = dateParam(searchParams.get("to"), true);

  addFilter(filters, fromDate ? gte(attendanceSessions.sessionDate, fromDate) : undefined);
  addFilter(filters, toDate ? lte(attendanceSessions.sessionDate, toDate) : undefined);
  addFilter(filters, text(searchParams.get("courseId")) ? eq(courses.id, text(searchParams.get("courseId"))) : undefined);
  addFilter(filters, upper(searchParams.get("courseCode")) ? eq(courses.courseCode, upper(searchParams.get("courseCode"))) : undefined);
  addFilter(filters, text(searchParams.get("courseExternalId")) ? eq(courses.externalId, text(searchParams.get("courseExternalId"))) : undefined);
  addFilter(filters, text(searchParams.get("sessionId")) ? eq(attendanceSessions.id, text(searchParams.get("sessionId"))) : undefined);
  addFilter(filters, upper(searchParams.get("studentIdNumber")) ? eq(studentProfiles.studentIdNumber, upper(searchParams.get("studentIdNumber"))) : undefined);
  addFilter(filters, text(searchParams.get("studentExternalId")) ? eq(studentProfiles.externalId, text(searchParams.get("studentExternalId"))) : undefined);
  addFilter(filters, text(searchParams.get("lecturerExternalId")) ? eq(lecturerProfiles.externalId, text(searchParams.get("lecturerExternalId"))) : undefined);
  addFilter(filters, text(searchParams.get("lecturerEmail")) ? eq(lecturerUsers.email, text(searchParams.get("lecturerEmail")).toLowerCase()) : undefined);
  addFilter(filters, text(searchParams.get("programme")) ? eq(courses.programme, text(searchParams.get("programme"))) : undefined);
  addFilter(filters, upper(searchParams.get("level")) ? eq(courses.level, upper(searchParams.get("level"))) : undefined);
  addFilter(filters, upper(searchParams.get("facultyCode")) ? eq(faculties.code, upper(searchParams.get("facultyCode"))) : undefined);
  addFilter(filters, upper(searchParams.get("departmentCode")) ? eq(departments.code, upper(searchParams.get("departmentCode"))) : undefined);

  const records = await db
    .select({
      courseId: courses.id,
      courseExternalId: courses.externalId,
      courseCode: courses.courseCode,
      courseTitle: courses.courseTitle,
      programme: courses.programme,
      level: courses.level,
      semester: courses.semester,
      academicYear: courses.academicYear,
      classGroup: courses.classGroup,
      lecturerId: lecturerProfiles.id,
      lecturerExternalId: lecturerProfiles.externalId,
      lecturerName: lecturerUsers.name,
      lecturerEmail: lecturerUsers.email,
      sessionId: attendanceSessions.id,
      sessionTitle: attendanceSessions.sessionTitle,
      sessionDate: attendanceSessions.sessionDate,
      sessionStatus: attendanceSessions.status,
      opensAt: attendanceSessions.opensAt,
      normalClosesAt: attendanceSessions.normalClosesAt,
      finalClosesAt: attendanceSessions.finalClosesAt,
      geofenceRadiusMeters: attendanceSessions.geofenceRadiusMeters,
      maxAcceptedAccuracyMeters: attendanceSessions.maxAcceptedAccuracyMeters,
      lectureHallName: lectureHalls.name,
      lectureHallCode: lectureHalls.code,
      studentId: studentProfiles.id,
      studentExternalId: studentProfiles.externalId,
      studentIdNumber: studentProfiles.studentIdNumber,
      studentName: studentUsers.name,
      studentEmail: studentUsers.email,
      studentProgramme: studentProfiles.programme,
      studentLevel: studentProfiles.level,
      studentClassGroup: studentProfiles.classGroup,
      facultyName: faculties.name,
      facultyCode: faculties.code,
      departmentName: departments.name,
      departmentCode: departments.code,
      checkInAt: attendanceRecords.checkInAt,
      status: attendanceRecords.status,
      verificationMethod: attendanceRecords.verificationMethod,
      distanceMeters: attendanceRecords.calculatedDistanceMeters,
      accuracyMeters: attendanceRecords.locationAccuracyMeters,
      lecturerRemarks: attendanceRecords.lecturerRemarks,
    })
    .from(attendanceRecords)
    .innerJoin(attendanceSessions, eq(attendanceRecords.sessionId, attendanceSessions.id))
    .innerJoin(courses, eq(attendanceSessions.courseId, courses.id))
    .innerJoin(lecturerProfiles, eq(courses.lecturerId, lecturerProfiles.id))
    .innerJoin(lecturerUsers, eq(lecturerProfiles.userId, lecturerUsers.id))
    .innerJoin(studentProfiles, eq(attendanceRecords.studentId, studentProfiles.id))
    .innerJoin(studentUsers, eq(studentProfiles.userId, studentUsers.id))
    .leftJoin(faculties, eq(studentProfiles.facultyId, faculties.id))
    .leftJoin(departments, eq(studentProfiles.departmentId, departments.id))
    .leftJoin(lectureHalls, eq(attendanceSessions.lectureHallId, lectureHalls.id))
    .where(filters.length > 0 ? and(...filters) : sql`true`)
    .orderBy(desc(attendanceSessions.sessionDate), courses.courseCode, studentProfiles.studentIdNumber);

  const totals = {
    records: records.length,
    present: 0,
    late: 0,
    manuallyPresent: 0,
    excused: 0,
    absent: 0,
    credited: 0,
    attendanceRate: 0,
  };

  for (const record of records) {
    if (record.status === "present") totals.present += 1;
    if (record.status === "late") totals.late += 1;
    if (record.status === "manually_present") totals.manuallyPresent += 1;
    if (record.status === "excused") totals.excused += 1;
    if (record.status === "absent") totals.absent += 1;
    if (creditedStatuses.has(record.status)) totals.credited += 1;
  }

  totals.attendanceRate = attendanceRate(totals.credited, totals.records);

  return {
    filters: Object.fromEntries(searchParams.entries()),
    generatedAt: new Date().toISOString(),
    totals,
    records,
  };
}

export function summarizeByCourse(records: AttendanceReportRow[]) {
  const summary = new Map<
    string,
    {
      courseId: string;
      courseExternalId: string | null;
      courseCode: string;
      courseTitle: string;
      programme: string | null;
      level: string | null;
      semester: string;
      academicYear: string;
      sessionsCount: Set<string>;
      attendanceRecords: number;
      credited: number;
      absent: number;
      excused: number;
      attendanceRate: number;
    }
  >();

  for (const record of records) {
    const item =
      summary.get(record.courseId) ??
      {
        courseId: record.courseId,
        courseExternalId: record.courseExternalId,
        courseCode: record.courseCode,
        courseTitle: record.courseTitle,
        programme: record.programme,
        level: record.level,
        semester: record.semester,
        academicYear: record.academicYear,
        sessionsCount: new Set<string>(),
        attendanceRecords: 0,
        credited: 0,
        absent: 0,
        excused: 0,
        attendanceRate: 0,
      };

    item.sessionsCount.add(record.sessionId);
    item.attendanceRecords += 1;
    if (creditedStatuses.has(record.status)) item.credited += 1;
    if (record.status === "absent") item.absent += 1;
    if (record.status === "excused") item.excused += 1;
    summary.set(record.courseId, item);
  }

  return Array.from(summary.values()).map((item) => ({
    ...item,
    sessionsHeld: item.sessionsCount.size,
    sessionsCount: undefined,
    attendanceRate: attendanceRate(item.credited, item.attendanceRecords),
  }));
}

export function summarizeByStudent(records: AttendanceReportRow[]) {
  const summary = new Map<
    string,
    {
      studentId: string;
      studentExternalId: string | null;
      studentIdNumber: string;
      studentName: string;
      studentEmail: string;
      programme: string | null;
      level: string | null;
      classGroup: string | null;
      attendanceRecords: number;
      credited: number;
      absent: number;
      excused: number;
      attendanceRate: number;
    }
  >();

  for (const record of records) {
    const item =
      summary.get(record.studentId) ??
      {
        studentId: record.studentId,
        studentExternalId: record.studentExternalId,
        studentIdNumber: record.studentIdNumber,
        studentName: record.studentName,
        studentEmail: record.studentEmail,
        programme: record.studentProgramme,
        level: record.studentLevel,
        classGroup: record.studentClassGroup,
        attendanceRecords: 0,
        credited: 0,
        absent: 0,
        excused: 0,
        attendanceRate: 0,
      };

    item.attendanceRecords += 1;
    if (creditedStatuses.has(record.status)) item.credited += 1;
    if (record.status === "absent") item.absent += 1;
    if (record.status === "excused") item.excused += 1;
    summary.set(record.studentId, item);
  }

  return Array.from(summary.values()).map((item) => ({
    ...item,
    attendanceRate: attendanceRate(item.credited, item.attendanceRecords),
  }));
}

export function summarizeBySession(records: AttendanceReportRow[]) {
  const summary = new Map<
    string,
    {
      sessionId: string;
      sessionTitle: string;
      sessionDate: Date;
      sessionStatus: string;
      courseCode: string;
      courseTitle: string;
      lectureHallName: string | null;
      lectureHallCode: string | null;
      attendanceRecords: number;
      credited: number;
      absent: number;
      excused: number;
      attendanceRate: number;
    }
  >();

  for (const record of records) {
    const item =
      summary.get(record.sessionId) ??
      {
        sessionId: record.sessionId,
        sessionTitle: record.sessionTitle,
        sessionDate: record.sessionDate,
        sessionStatus: record.sessionStatus,
        courseCode: record.courseCode,
        courseTitle: record.courseTitle,
        lectureHallName: record.lectureHallName,
        lectureHallCode: record.lectureHallCode,
        attendanceRecords: 0,
        credited: 0,
        absent: 0,
        excused: 0,
        attendanceRate: 0,
      };

    item.attendanceRecords += 1;
    if (creditedStatuses.has(record.status)) item.credited += 1;
    if (record.status === "absent") item.absent += 1;
    if (record.status === "excused") item.excused += 1;
    summary.set(record.sessionId, item);
  }

  return Array.from(summary.values()).map((item) => ({
    ...item,
    attendanceRate: attendanceRate(item.credited, item.attendanceRecords),
  }));
}
