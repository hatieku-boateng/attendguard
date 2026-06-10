CREATE TYPE "public"."account_status" AS ENUM('pending', 'active', 'suspended', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."attendance_attempt_result" AS ENUM('accepted', 'late', 'rejected', 'requires_review');--> statement-breakpoint
CREATE TYPE "public"."attendance_session_status" AS ENUM('draft', 'open', 'closed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."attendance_status" AS ENUM('present', 'late', 'manually_present', 'excused', 'absent');--> statement-breakpoint
CREATE TYPE "public"."course_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."enrolment_status" AS ENUM('active', 'withdrawn', 'completed');--> statement-breakpoint
CREATE TYPE "public"."rejection_reason" AS ENUM('invalid_passkey', 'expired_passkey', 'passkey_already_used', 'outside_permitted_area', 'poor_location_accuracy', 'session_closed', 'student_not_enrolled', 'duplicate_attendance', 'location_permission_denied', 'account_mismatch', 'invalid_location', 'too_many_attempts');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('not_required', 'pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('administrator', 'lecturer', 'student');--> statement-breakpoint
CREATE TYPE "public"."verification_method" AS ENUM('passkey_location', 'manual', 'system');--> statement-breakpoint
CREATE TABLE "attendance_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"student_id" uuid,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"student_latitude" numeric(10, 7),
	"student_longitude" numeric(10, 7),
	"location_accuracy_meters" numeric(8, 2),
	"calculated_distance_meters" numeric(8, 2),
	"result" "attendance_attempt_result" NOT NULL,
	"rejection_reason" "rejection_reason",
	"review_status" "review_status" DEFAULT 'not_required' NOT NULL,
	"reviewed_by_lecturer_id" uuid,
	"reviewed_at" timestamp with time zone,
	"lecturer_remarks" text,
	"ip_address" varchar(80),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_passkeys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"passkey_hash" text NOT NULL,
	"passkey_ciphertext" text,
	"expires_at" timestamp with time zone NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"used_at" timestamp with time zone,
	"regenerated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"check_in_at" timestamp with time zone NOT NULL,
	"student_latitude" numeric(10, 7),
	"student_longitude" numeric(10, 7),
	"location_accuracy_meters" numeric(8, 2),
	"calculated_distance_meters" numeric(8, 2),
	"status" "attendance_status" NOT NULL,
	"verification_method" "verification_method" NOT NULL,
	"lecturer_remarks" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"lecturer_id" uuid NOT NULL,
	"session_title" varchar(200) NOT NULL,
	"session_date" timestamp with time zone NOT NULL,
	"lecturer_latitude" numeric(10, 7) NOT NULL,
	"lecturer_longitude" numeric(10, 7) NOT NULL,
	"lecturer_location_accuracy" numeric(8, 2),
	"geofence_radius_meters" integer NOT NULL,
	"max_accepted_accuracy_meters" integer DEFAULT 50 NOT NULL,
	"opens_at" timestamp with time zone NOT NULL,
	"normal_closes_at" timestamp with time zone NOT NULL,
	"final_closes_at" timestamp with time zone NOT NULL,
	"status" "attendance_session_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" varchar(120) NOT NULL,
	"entity_type" varchar(120) NOT NULL,
	"entity_id" uuid,
	"previous_value" jsonb,
	"new_value" jsonb,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_code" varchar(40) NOT NULL,
	"course_title" varchar(200) NOT NULL,
	"programme" varchar(160),
	"level" varchar(50),
	"semester" varchar(60) NOT NULL,
	"academic_year" varchar(20) NOT NULL,
	"class_group" varchar(80) DEFAULT 'main' NOT NULL,
	"lecturer_id" uuid NOT NULL,
	"status" "course_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enrolments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"status" "enrolment_status" DEFAULT 'active' NOT NULL,
	"enrolled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lecturer_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"staff_id" varchar(80),
	"department" varchar(160),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"student_id_number" varchar(80) NOT NULL,
	"programme" varchar(160),
	"level" varchar(50),
	"class_group" varchar(80),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"email" varchar(254) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" NOT NULL,
	"status" "account_status" DEFAULT 'pending' NOT NULL,
	"email_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance_attempts" ADD CONSTRAINT "attendance_attempts_session_id_attendance_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."attendance_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_attempts" ADD CONSTRAINT "attendance_attempts_student_id_student_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_attempts" ADD CONSTRAINT "attendance_attempts_reviewed_by_lecturer_id_lecturer_profiles_id_fk" FOREIGN KEY ("reviewed_by_lecturer_id") REFERENCES "public"."lecturer_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_passkeys" ADD CONSTRAINT "attendance_passkeys_session_id_attendance_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."attendance_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_passkeys" ADD CONSTRAINT "attendance_passkeys_student_id_student_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_session_id_attendance_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."attendance_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_student_id_student_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_lecturer_id_lecturer_profiles_id_fk" FOREIGN KEY ("lecturer_id") REFERENCES "public"."lecturer_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_lecturer_id_lecturer_profiles_id_fk" FOREIGN KEY ("lecturer_id") REFERENCES "public"."lecturer_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrolments" ADD CONSTRAINT "enrolments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrolments" ADD CONSTRAINT "enrolments_student_id_student_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lecturer_profiles" ADD CONSTRAINT "lecturer_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attendance_attempts_session_id_idx" ON "attendance_attempts" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "attendance_attempts_student_id_idx" ON "attendance_attempts" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "attendance_attempts_result_idx" ON "attendance_attempts" USING btree ("result");--> statement-breakpoint
CREATE INDEX "attendance_attempts_rejection_reason_idx" ON "attendance_attempts" USING btree ("rejection_reason");--> statement-breakpoint
CREATE INDEX "attendance_attempts_review_status_idx" ON "attendance_attempts" USING btree ("review_status");--> statement-breakpoint
CREATE INDEX "attendance_attempts_attempted_at_idx" ON "attendance_attempts" USING btree ("attempted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_passkeys_session_student_unique" ON "attendance_passkeys" USING btree ("session_id","student_id");--> statement-breakpoint
CREATE INDEX "attendance_passkeys_session_id_idx" ON "attendance_passkeys" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "attendance_passkeys_student_id_idx" ON "attendance_passkeys" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "attendance_passkeys_used_idx" ON "attendance_passkeys" USING btree ("used");--> statement-breakpoint
CREATE INDEX "attendance_passkeys_expires_at_idx" ON "attendance_passkeys" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_records_session_student_unique" ON "attendance_records" USING btree ("session_id","student_id");--> statement-breakpoint
CREATE INDEX "attendance_records_session_id_idx" ON "attendance_records" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "attendance_records_student_id_idx" ON "attendance_records" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "attendance_records_status_idx" ON "attendance_records" USING btree ("status");--> statement-breakpoint
CREATE INDEX "attendance_records_check_in_at_idx" ON "attendance_records" USING btree ("check_in_at");--> statement-breakpoint
CREATE INDEX "attendance_sessions_course_id_idx" ON "attendance_sessions" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "attendance_sessions_lecturer_id_idx" ON "attendance_sessions" USING btree ("lecturer_id");--> statement-breakpoint
CREATE INDEX "attendance_sessions_status_idx" ON "attendance_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "attendance_sessions_opens_at_idx" ON "attendance_sessions" USING btree ("opens_at");--> statement-breakpoint
CREATE INDEX "attendance_sessions_final_closes_at_idx" ON "attendance_sessions" USING btree ("final_closes_at");--> statement-breakpoint
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "courses_offering_unique" ON "courses" USING btree ("course_code","academic_year","semester","class_group");--> statement-breakpoint
CREATE INDEX "courses_lecturer_id_idx" ON "courses" USING btree ("lecturer_id");--> statement-breakpoint
CREATE INDEX "courses_status_idx" ON "courses" USING btree ("status");--> statement-breakpoint
CREATE INDEX "courses_code_idx" ON "courses" USING btree ("course_code");--> statement-breakpoint
CREATE UNIQUE INDEX "enrolments_course_student_unique" ON "enrolments" USING btree ("course_id","student_id");--> statement-breakpoint
CREATE INDEX "enrolments_course_id_idx" ON "enrolments" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "enrolments_student_id_idx" ON "enrolments" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "enrolments_status_idx" ON "enrolments" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "lecturer_profiles_user_id_unique" ON "lecturer_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lecturer_profiles_staff_id_unique" ON "lecturer_profiles" USING btree ("staff_id");--> statement-breakpoint
CREATE INDEX "lecturer_profiles_department_idx" ON "lecturer_profiles" USING btree ("department");--> statement-breakpoint
CREATE UNIQUE INDEX "student_profiles_user_id_unique" ON "student_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "student_profiles_student_id_number_unique" ON "student_profiles" USING btree ("student_id_number");--> statement-breakpoint
CREATE INDEX "student_profiles_programme_idx" ON "student_profiles" USING btree ("programme");--> statement-breakpoint
CREATE INDEX "student_profiles_level_idx" ON "student_profiles" USING btree ("level");--> statement-breakpoint
CREATE INDEX "student_profiles_class_group_idx" ON "student_profiles" USING btree ("class_group");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "users_status_idx" ON "users" USING btree ("status");