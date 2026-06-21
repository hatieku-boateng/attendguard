import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "administrator",
  "lecturer",
  "student",
]);

export const accountStatusEnum = pgEnum("account_status", [
  "pending",
  "active",
  "suspended",
  "disabled",
]);

export const courseStatusEnum = pgEnum("course_status", [
  "draft",
  "active",
  "archived",
]);

export const enrolmentStatusEnum = pgEnum("enrolment_status", [
  "active",
  "withdrawn",
  "completed",
]);

export const attendanceSessionStatusEnum = pgEnum("attendance_session_status", [
  "draft",
  "open",
  "closed",
  "cancelled",
]);

export const attendanceStatusEnum = pgEnum("attendance_status", [
  "present",
  "late",
  "manually_present",
  "excused",
  "absent",
]);

export const verificationMethodEnum = pgEnum("verification_method", [
  "passkey_location",
  "manual",
  "system",
]);

export const attendanceAttemptResultEnum = pgEnum("attendance_attempt_result", [
  "accepted",
  "late",
  "rejected",
  "requires_review",
]);

export const rejectionReasonEnum = pgEnum("rejection_reason", [
  "invalid_passkey",
  "expired_passkey",
  "passkey_already_used",
  "outside_permitted_area",
  "poor_location_accuracy",
  "session_closed",
  "student_not_enrolled",
  "duplicate_attendance",
  "location_permission_denied",
  "account_mismatch",
  "invalid_location",
  "too_many_attempts",
]);

export const reviewStatusEnum = pgEnum("review_status", [
  "not_required",
  "pending",
  "approved",
  "rejected",
]);

export const studentCategoryEnum = pgEnum("student_category", [
  "regular",
  "weekend",
  "access",
]);

export const programmeLevelEnum = pgEnum("programme_level", [
  "diploma",
  "undergraduate",
  "postgraduate",
]);

const id = uuid("id").defaultRandom().primaryKey();
const createdAt = timestamp("created_at", { withTimezone: true })
  .notNull()
  .defaultNow();
const updatedAt = timestamp("updated_at", { withTimezone: true })
  .notNull()
  .defaultNow();

export const users = pgTable(
  "users",
  {
    id,
    name: varchar("name", { length: 160 }).notNull(),
    email: varchar("email", { length: 254 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    avatarUrl: text("avatar_url"),
    role: userRoleEnum("role").notNull(),
    status: accountStatusEnum("status").notNull().default("pending"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("users_email_unique").on(table.email),
    index("users_role_idx").on(table.role),
    index("users_status_idx").on(table.status),
  ],
);

export const faculties = pgTable(
  "faculties",
  {
    id,
    name: varchar("name", { length: 200 }).notNull(),
    code: varchar("code", { length: 40 }).notNull(),
    externalId: varchar("external_id", { length: 120 }),
    sourceSystem: varchar("source_system", { length: 80 }),
    description: text("description"),
    status: varchar("status", { length: 40 }).notNull().default("active"),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("faculties_name_unique").on(table.name),
    uniqueIndex("faculties_code_unique").on(table.code),
    uniqueIndex("faculties_source_external_unique").on(
      table.sourceSystem,
      table.externalId,
    ),
    index("faculties_status_idx").on(table.status),
  ],
);

export const departments = pgTable(
  "departments",
  {
    id,
    facultyId: uuid("faculty_id")
      .notNull()
      .references(() => faculties.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 200 }).notNull(),
    code: varchar("code", { length: 40 }).notNull(),
    externalId: varchar("external_id", { length: 120 }),
    sourceSystem: varchar("source_system", { length: 80 }),
    description: text("description"),
    status: varchar("status", { length: 40 }).notNull().default("active"),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("departments_faculty_name_unique").on(table.facultyId, table.name),
    uniqueIndex("departments_code_unique").on(table.code),
    uniqueIndex("departments_source_external_unique").on(
      table.sourceSystem,
      table.externalId,
    ),
    index("departments_faculty_id_idx").on(table.facultyId),
    index("departments_status_idx").on(table.status),
  ],
);

export const academicYears = pgTable(
  "academic_years",
  {
    id,
    startYear: integer("start_year").notNull(),
    endYear: integer("end_year").notNull(),
    displayName: varchar("display_name", { length: 20 }).notNull(),
    externalId: varchar("external_id", { length: 120 }),
    sourceSystem: varchar("source_system", { length: 80 }),
    isCurrent: boolean("is_current").notNull().default(false),
    status: varchar("status", { length: 40 }).notNull().default("active"),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("academic_years_display_name_unique").on(table.displayName),
    uniqueIndex("academic_years_source_external_unique").on(
      table.sourceSystem,
      table.externalId,
    ),
    index("academic_years_current_idx").on(table.isCurrent),
    index("academic_years_status_idx").on(table.status),
  ],
);

export const studentProfiles = pgTable(
  "student_profiles",
  {
    id,
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    studentIdNumber: varchar("student_id_number", { length: 80 }).notNull(),
    externalId: varchar("external_id", { length: 120 }),
    sourceSystem: varchar("source_system", { length: 80 }),
    studentCategory: studentCategoryEnum("student_category")
      .notNull()
      .default("regular"),
    programmeLevel: programmeLevelEnum("programme_level")
      .notNull()
      .default("undergraduate"),
    facultyId: uuid("faculty_id").references(() => faculties.id, {
      onDelete: "restrict",
    }),
    departmentId: uuid("department_id").references(() => departments.id, {
      onDelete: "restrict",
    }),
    academicYearId: uuid("academic_year_id").references(() => academicYears.id, {
      onDelete: "set null",
    }),
    programme: varchar("programme", { length: 160 }),
    level: varchar("level", { length: 50 }),
    classGroup: varchar("class_group", { length: 80 }),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("student_profiles_user_id_unique").on(table.userId),
    uniqueIndex("student_profiles_student_id_number_unique").on(
      table.studentIdNumber,
    ),
    uniqueIndex("student_profiles_source_external_unique").on(
      table.sourceSystem,
      table.externalId,
    ),
    index("student_profiles_programme_idx").on(table.programme),
    index("student_profiles_level_idx").on(table.level),
    index("student_profiles_class_group_idx").on(table.classGroup),
    index("student_profiles_faculty_id_idx").on(table.facultyId),
    index("student_profiles_department_id_idx").on(table.departmentId),
    index("student_profiles_academic_year_id_idx").on(table.academicYearId),
  ],
);

export const studentActivationTokens = pgTable(
  "student_activation_tokens",
  {
    id,
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt,
  },
  (table) => [
    uniqueIndex("student_activation_tokens_hash_unique").on(table.tokenHash),
    index("student_activation_tokens_user_id_idx").on(table.userId),
    index("student_activation_tokens_expires_at_idx").on(table.expiresAt),
  ],
);

export const lecturerProfiles = pgTable(
  "lecturer_profiles",
  {
    id,
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    staffId: varchar("staff_id", { length: 80 }),
    externalId: varchar("external_id", { length: 120 }),
    sourceSystem: varchar("source_system", { length: 80 }),
    department: varchar("department", { length: 160 }),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("lecturer_profiles_user_id_unique").on(table.userId),
    uniqueIndex("lecturer_profiles_staff_id_unique").on(table.staffId),
    uniqueIndex("lecturer_profiles_source_external_unique").on(
      table.sourceSystem,
      table.externalId,
    ),
    index("lecturer_profiles_department_idx").on(table.department),
  ],
);

export const courseCatalog = pgTable(
  "course_catalog",
  {
    id,
    courseCode: varchar("course_code", { length: 40 }).notNull(),
    courseTitle: varchar("course_title", { length: 200 }).notNull(),
    externalId: varchar("external_id", { length: 120 }),
    sourceSystem: varchar("source_system", { length: 80 }),
    programme: varchar("programme", { length: 160 }),
    level: varchar("level", { length: 50 }),
    academicYearId: uuid("academic_year_id").references(() => academicYears.id, {
      onDelete: "set null",
    }),
    facultyId: uuid("faculty_id").references(() => faculties.id, {
      onDelete: "restrict",
    }),
    departmentId: uuid("department_id").references(() => departments.id, {
      onDelete: "restrict",
    }),
    description: text("description"),
    status: courseStatusEnum("status").notNull().default("active"),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("course_catalog_code_unique").on(table.courseCode),
    uniqueIndex("course_catalog_source_external_unique").on(
      table.sourceSystem,
      table.externalId,
    ),
    index("course_catalog_status_idx").on(table.status),
    index("course_catalog_faculty_id_idx").on(table.facultyId),
    index("course_catalog_department_id_idx").on(table.departmentId),
    index("course_catalog_academic_year_id_idx").on(table.academicYearId),
  ],
);

export const courses = pgTable(
  "courses",
  {
    id,
    catalogCourseId: uuid("catalog_course_id").references(() => courseCatalog.id, {
      onDelete: "set null",
    }),
    courseCode: varchar("course_code", { length: 40 }).notNull(),
    courseTitle: varchar("course_title", { length: 200 }).notNull(),
    externalId: varchar("external_id", { length: 120 }),
    sourceSystem: varchar("source_system", { length: 80 }),
    programme: varchar("programme", { length: 160 }),
    level: varchar("level", { length: 50 }),
    semester: varchar("semester", { length: 60 }).notNull(),
    academicYear: varchar("academic_year", { length: 20 }).notNull(),
    classGroup: varchar("class_group", { length: 80 }).notNull().default("main"),
    lecturerId: uuid("lecturer_id")
      .notNull()
      .references(() => lecturerProfiles.id, { onDelete: "restrict" }),
    status: courseStatusEnum("status").notNull().default("draft"),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("courses_offering_unique").on(
      table.courseCode,
      table.academicYear,
      table.semester,
      table.classGroup,
    ),
    uniqueIndex("courses_source_external_unique").on(
      table.sourceSystem,
      table.externalId,
    ),
    index("courses_lecturer_id_idx").on(table.lecturerId),
    index("courses_status_idx").on(table.status),
    index("courses_code_idx").on(table.courseCode),
  ],
);

export const courseResources = pgTable(
  "course_resources",
  {
    id,
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    lecturerId: uuid("lecturer_id")
      .notNull()
      .references(() => lecturerProfiles.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    resourceType: varchar("resource_type", { length: 80 }).notNull(),
    resourceUrl: text("resource_url").notNull(),
    description: text("description"),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("course_resources_course_id_idx").on(table.courseId),
    index("course_resources_lecturer_id_idx").on(table.lecturerId),
  ],
);

export const enrolments = pgTable(
  "enrolments",
  {
    id,
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => studentProfiles.id, { onDelete: "cascade" }),
    status: enrolmentStatusEnum("status").notNull().default("active"),
    externalId: varchar("external_id", { length: 120 }),
    sourceSystem: varchar("source_system", { length: 80 }),
    enrolledAt: timestamp("enrolled_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("enrolments_course_student_unique").on(
      table.courseId,
      table.studentId,
    ),
    uniqueIndex("enrolments_source_external_unique").on(
      table.sourceSystem,
      table.externalId,
    ),
    index("enrolments_course_id_idx").on(table.courseId),
    index("enrolments_student_id_idx").on(table.studentId),
    index("enrolments_status_idx").on(table.status),
  ],
);

export const lectureHalls = pgTable(
  "lecture_halls",
  {
    id,
    name: varchar("name", { length: 160 }).notNull(),
    code: varchar("code", { length: 60 }).notNull(),
    building: varchar("building", { length: 160 }),
    roomNumber: varchar("room_number", { length: 80 }),
    latitude: numeric("latitude", {
      precision: 10,
      scale: 7,
    }).notNull(),
    longitude: numeric("longitude", {
      precision: 10,
      scale: 7,
    }).notNull(),
    locationAccuracyMeters: numeric("location_accuracy_meters", {
      precision: 8,
      scale: 2,
    }),
    geofenceRadiusMeters: integer("geofence_radius_meters").notNull().default(30),
    maxAcceptedAccuracyMeters: integer("max_accepted_accuracy_meters")
      .notNull()
      .default(50),
    notes: text("notes"),
    status: courseStatusEnum("status").notNull().default("active"),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("lecture_halls_code_unique").on(table.code),
    index("lecture_halls_status_idx").on(table.status),
  ],
);

export const attendanceSessions = pgTable(
  "attendance_sessions",
  {
    id,
    lectureHallId: uuid("lecture_hall_id").references(() => lectureHalls.id, {
      onDelete: "set null",
    }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    lecturerId: uuid("lecturer_id")
      .notNull()
      .references(() => lecturerProfiles.id, { onDelete: "restrict" }),
    sessionTitle: varchar("session_title", { length: 200 }).notNull(),
    sessionDate: timestamp("session_date", { withTimezone: true }).notNull(),
    lecturerLatitude: numeric("lecturer_latitude", {
      precision: 10,
      scale: 7,
    }).notNull(),
    lecturerLongitude: numeric("lecturer_longitude", {
      precision: 10,
      scale: 7,
    }).notNull(),
    lecturerLocationAccuracy: numeric("lecturer_location_accuracy", {
      precision: 8,
      scale: 2,
    }),
    geofenceRadiusMeters: integer("geofence_radius_meters").notNull(),
    maxAcceptedAccuracyMeters: integer("max_accepted_accuracy_meters")
      .notNull()
      .default(50),
    opensAt: timestamp("opens_at", { withTimezone: true }).notNull(),
    normalClosesAt: timestamp("normal_closes_at", {
      withTimezone: true,
    }).notNull(),
    finalClosesAt: timestamp("final_closes_at", {
      withTimezone: true,
    }).notNull(),
    status: attendanceSessionStatusEnum("status").notNull().default("draft"),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("attendance_sessions_course_id_idx").on(table.courseId),
    index("attendance_sessions_lecture_hall_id_idx").on(table.lectureHallId),
    index("attendance_sessions_lecturer_id_idx").on(table.lecturerId),
    index("attendance_sessions_status_idx").on(table.status),
    index("attendance_sessions_opens_at_idx").on(table.opensAt),
    index("attendance_sessions_final_closes_at_idx").on(table.finalClosesAt),
  ],
);

export const attendancePasskeys = pgTable(
  "attendance_passkeys",
  {
    id,
    sessionId: uuid("session_id")
      .notNull()
      .references(() => attendanceSessions.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => studentProfiles.id, { onDelete: "cascade" }),
    passkeyHash: text("passkey_hash").notNull(),
    passkeyCiphertext: text("passkey_ciphertext"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    used: boolean("used").notNull().default(false),
    usedAt: timestamp("used_at", { withTimezone: true }),
    regeneratedAt: timestamp("regenerated_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("attendance_passkeys_session_student_unique").on(
      table.sessionId,
      table.studentId,
    ),
    index("attendance_passkeys_session_id_idx").on(table.sessionId),
    index("attendance_passkeys_student_id_idx").on(table.studentId),
    index("attendance_passkeys_used_idx").on(table.used),
    index("attendance_passkeys_expires_at_idx").on(table.expiresAt),
  ],
);

export const attendanceRecords = pgTable(
  "attendance_records",
  {
    id,
    sessionId: uuid("session_id")
      .notNull()
      .references(() => attendanceSessions.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => studentProfiles.id, { onDelete: "cascade" }),
    checkInAt: timestamp("check_in_at", { withTimezone: true }).notNull(),
    studentLatitude: numeric("student_latitude", {
      precision: 10,
      scale: 7,
    }),
    studentLongitude: numeric("student_longitude", {
      precision: 10,
      scale: 7,
    }),
    locationAccuracyMeters: numeric("location_accuracy_meters", {
      precision: 8,
      scale: 2,
    }),
    calculatedDistanceMeters: numeric("calculated_distance_meters", {
      precision: 8,
      scale: 2,
    }),
    status: attendanceStatusEnum("status").notNull(),
    verificationMethod: verificationMethodEnum("verification_method").notNull(),
    lecturerRemarks: text("lecturer_remarks"),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("attendance_records_session_student_unique").on(
      table.sessionId,
      table.studentId,
    ),
    index("attendance_records_session_id_idx").on(table.sessionId),
    index("attendance_records_student_id_idx").on(table.studentId),
    index("attendance_records_status_idx").on(table.status),
    index("attendance_records_check_in_at_idx").on(table.checkInAt),
  ],
);

export const attendanceAttempts = pgTable(
  "attendance_attempts",
  {
    id,
    sessionId: uuid("session_id")
      .notNull()
      .references(() => attendanceSessions.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").references(() => studentProfiles.id, {
      onDelete: "set null",
    }),
    attemptedAt: timestamp("attempted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    studentLatitude: numeric("student_latitude", {
      precision: 10,
      scale: 7,
    }),
    studentLongitude: numeric("student_longitude", {
      precision: 10,
      scale: 7,
    }),
    locationAccuracyMeters: numeric("location_accuracy_meters", {
      precision: 8,
      scale: 2,
    }),
    calculatedDistanceMeters: numeric("calculated_distance_meters", {
      precision: 8,
      scale: 2,
    }),
    result: attendanceAttemptResultEnum("result").notNull(),
    rejectionReason: rejectionReasonEnum("rejection_reason"),
    reviewStatus: reviewStatusEnum("review_status")
      .notNull()
      .default("not_required"),
    reviewedByLecturerId: uuid("reviewed_by_lecturer_id").references(
      () => lecturerProfiles.id,
      { onDelete: "set null" },
    ),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    lecturerRemarks: text("lecturer_remarks"),
    ipAddress: varchar("ip_address", { length: 80 }),
    userAgent: text("user_agent"),
    createdAt,
  },
  (table) => [
    index("attendance_attempts_session_id_idx").on(table.sessionId),
    index("attendance_attempts_student_id_idx").on(table.studentId),
    index("attendance_attempts_result_idx").on(table.result),
    index("attendance_attempts_rejection_reason_idx").on(table.rejectionReason),
    index("attendance_attempts_review_status_idx").on(table.reviewStatus),
    index("attendance_attempts_attempted_at_idx").on(table.attemptedAt),
  ],
);

export const securityEvents = pgTable(
  "security_events",
  {
    id,
    eventType: varchar("event_type", { length: 120 }).notNull(),
    identifierHash: text("identifier_hash").notNull(),
    ipAddress: varchar("ip_address", { length: 80 }),
    userAgent: text("user_agent"),
    success: boolean("success").notNull().default(false),
    metadata: jsonb("metadata"),
    createdAt,
  },
  (table) => [
    index("security_events_type_identifier_created_idx").on(
      table.eventType,
      table.identifierHash,
      table.createdAt,
    ),
    index("security_events_created_at_idx").on(table.createdAt),
    index("security_events_success_idx").on(table.success),
  ],
);

export const studentAbsenceWarnings = pgTable(
  "student_absence_warnings",
  {
    id,
    studentId: uuid("student_id")
      .notNull()
      .references(() => studentProfiles.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    triggeringSessionId: uuid("triggering_session_id")
      .notNull()
      .references(() => attendanceSessions.id, { onDelete: "cascade" }),
    streakCount: integer("streak_count").notNull(),
    warningLevel: varchar("warning_level", { length: 40 }).notNull(),
    recipientEmail: varchar("recipient_email", { length: 254 }).notNull(),
    sent: boolean("sent").notNull().default(false),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    sendError: text("send_error"),
    createdAt,
  },
  (table) => [
    uniqueIndex("student_absence_warnings_unique").on(
      table.studentId,
      table.courseId,
      table.triggeringSessionId,
      table.warningLevel,
    ),
    index("student_absence_warnings_student_course_idx").on(
      table.studentId,
      table.courseId,
    ),
    index("student_absence_warnings_session_idx").on(table.triggeringSessionId),
    index("student_absence_warnings_sent_idx").on(table.sent),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id,
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: varchar("action", { length: 120 }).notNull(),
    entityType: varchar("entity_type", { length: 120 }).notNull(),
    entityId: uuid("entity_id"),
    previousValue: jsonb("previous_value"),
    newValue: jsonb("new_value"),
    reason: text("reason"),
    createdAt,
  },
  (table) => [
    index("audit_logs_user_id_idx").on(table.userId),
    index("audit_logs_entity_idx").on(table.entityType, table.entityId),
    index("audit_logs_action_idx").on(table.action),
    index("audit_logs_created_at_idx").on(table.createdAt),
  ],
);

export const usersRelations = relations(users, ({ one }) => ({
  studentProfile: one(studentProfiles),
  lecturerProfile: one(lecturerProfiles),
  activationToken: one(studentActivationTokens),
}));

export const facultiesRelations = relations(faculties, ({ many }) => ({
  departments: many(departments),
  students: many(studentProfiles),
  catalogEntries: many(courseCatalog),
}));

export const departmentsRelations = relations(departments, ({ one, many }) => ({
  faculty: one(faculties, {
    fields: [departments.facultyId],
    references: [faculties.id],
  }),
  students: many(studentProfiles),
  catalogEntries: many(courseCatalog),
}));

export const academicYearsRelations = relations(academicYears, ({ many }) => ({
  students: many(studentProfiles),
  catalogEntries: many(courseCatalog),
}));

export const studentProfilesRelations = relations(
  studentProfiles,
  ({ one, many }) => ({
    user: one(users, {
      fields: [studentProfiles.userId],
      references: [users.id],
    }),
    faculty: one(faculties, {
      fields: [studentProfiles.facultyId],
      references: [faculties.id],
    }),
    department: one(departments, {
      fields: [studentProfiles.departmentId],
      references: [departments.id],
    }),
    academicYear: one(academicYears, {
      fields: [studentProfiles.academicYearId],
      references: [academicYears.id],
    }),
    enrolments: many(enrolments),
    passkeys: many(attendancePasskeys),
    attendanceRecords: many(attendanceRecords),
    attendanceAttempts: many(attendanceAttempts),
  }),
);

export const studentActivationTokensRelations = relations(
  studentActivationTokens,
  ({ one }) => ({
    user: one(users, {
      fields: [studentActivationTokens.userId],
      references: [users.id],
    }),
  }),
);

export const lecturerProfilesRelations = relations(
  lecturerProfiles,
  ({ one, many }) => ({
    user: one(users, {
      fields: [lecturerProfiles.userId],
      references: [users.id],
    }),
    courses: many(courses),
    courseResources: many(courseResources),
    attendanceSessions: many(attendanceSessions),
    reviewedAttempts: many(attendanceAttempts),
  }),
);

export const lectureHallsRelations = relations(lectureHalls, ({ many }) => ({
  attendanceSessions: many(attendanceSessions),
}));

export const courseCatalogRelations = relations(courseCatalog, ({ one, many }) => ({
  faculty: one(faculties, {
    fields: [courseCatalog.facultyId],
    references: [faculties.id],
  }),
  department: one(departments, {
    fields: [courseCatalog.departmentId],
    references: [departments.id],
  }),
  academicYear: one(academicYears, {
    fields: [courseCatalog.academicYearId],
    references: [academicYears.id],
  }),
  offerings: many(courses),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  catalogCourse: one(courseCatalog, {
    fields: [courses.catalogCourseId],
    references: [courseCatalog.id],
  }),
  lecturer: one(lecturerProfiles, {
    fields: [courses.lecturerId],
    references: [lecturerProfiles.id],
  }),
  enrolments: many(enrolments),
  attendanceSessions: many(attendanceSessions),
  resources: many(courseResources),
}));

export const courseResourcesRelations = relations(courseResources, ({ one }) => ({
  course: one(courses, {
    fields: [courseResources.courseId],
    references: [courses.id],
  }),
  lecturer: one(lecturerProfiles, {
    fields: [courseResources.lecturerId],
    references: [lecturerProfiles.id],
  }),
}));

export const enrolmentsRelations = relations(enrolments, ({ one }) => ({
  course: one(courses, {
    fields: [enrolments.courseId],
    references: [courses.id],
  }),
  student: one(studentProfiles, {
    fields: [enrolments.studentId],
    references: [studentProfiles.id],
  }),
}));

export const attendanceSessionsRelations = relations(
  attendanceSessions,
  ({ one, many }) => ({
    course: one(courses, {
      fields: [attendanceSessions.courseId],
      references: [courses.id],
    }),
    lecturer: one(lecturerProfiles, {
      fields: [attendanceSessions.lecturerId],
      references: [lecturerProfiles.id],
    }),
    lectureHall: one(lectureHalls, {
      fields: [attendanceSessions.lectureHallId],
      references: [lectureHalls.id],
    }),
    passkeys: many(attendancePasskeys),
    attendanceRecords: many(attendanceRecords),
    attendanceAttempts: many(attendanceAttempts),
  }),
);

export const attendancePasskeysRelations = relations(
  attendancePasskeys,
  ({ one }) => ({
    session: one(attendanceSessions, {
      fields: [attendancePasskeys.sessionId],
      references: [attendanceSessions.id],
    }),
    student: one(studentProfiles, {
      fields: [attendancePasskeys.studentId],
      references: [studentProfiles.id],
    }),
  }),
);

export const attendanceRecordsRelations = relations(
  attendanceRecords,
  ({ one }) => ({
    session: one(attendanceSessions, {
      fields: [attendanceRecords.sessionId],
      references: [attendanceSessions.id],
    }),
    student: one(studentProfiles, {
      fields: [attendanceRecords.studentId],
      references: [studentProfiles.id],
    }),
  }),
);

export const attendanceAttemptsRelations = relations(
  attendanceAttempts,
  ({ one }) => ({
    session: one(attendanceSessions, {
      fields: [attendanceAttempts.sessionId],
      references: [attendanceSessions.id],
    }),
    student: one(studentProfiles, {
      fields: [attendanceAttempts.studentId],
      references: [studentProfiles.id],
    }),
    reviewedByLecturer: one(lecturerProfiles, {
      fields: [attendanceAttempts.reviewedByLecturerId],
      references: [lecturerProfiles.id],
    }),
  }),
);

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));
