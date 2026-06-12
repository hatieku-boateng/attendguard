CREATE TABLE "security_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" varchar(120) NOT NULL,
	"identifier_hash" text NOT NULL,
	"ip_address" varchar(80),
	"user_agent" text,
	"success" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_absence_warnings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"triggering_session_id" uuid NOT NULL,
	"streak_count" integer NOT NULL,
	"warning_level" varchar(40) NOT NULL,
	"recipient_email" varchar(254) NOT NULL,
	"sent" boolean DEFAULT false NOT NULL,
	"sent_at" timestamp with time zone,
	"send_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "student_absence_warnings" ADD CONSTRAINT "student_absence_warnings_student_id_student_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_absence_warnings" ADD CONSTRAINT "student_absence_warnings_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_absence_warnings" ADD CONSTRAINT "student_absence_warnings_triggering_session_id_attendance_sessions_id_fk" FOREIGN KEY ("triggering_session_id") REFERENCES "public"."attendance_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "security_events_type_identifier_created_idx" ON "security_events" USING btree ("event_type","identifier_hash","created_at");--> statement-breakpoint
CREATE INDEX "security_events_created_at_idx" ON "security_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "security_events_success_idx" ON "security_events" USING btree ("success");--> statement-breakpoint
CREATE UNIQUE INDEX "student_absence_warnings_unique" ON "student_absence_warnings" USING btree ("student_id","course_id","triggering_session_id","warning_level");--> statement-breakpoint
CREATE INDEX "student_absence_warnings_student_course_idx" ON "student_absence_warnings" USING btree ("student_id","course_id");--> statement-breakpoint
CREATE INDEX "student_absence_warnings_session_idx" ON "student_absence_warnings" USING btree ("triggering_session_id");--> statement-breakpoint
CREATE INDEX "student_absence_warnings_sent_idx" ON "student_absence_warnings" USING btree ("sent");