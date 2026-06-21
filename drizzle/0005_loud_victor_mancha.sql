CREATE TABLE "lecture_halls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"code" varchar(60) NOT NULL,
	"building" varchar(160),
	"room_number" varchar(80),
	"latitude" numeric(10, 7) NOT NULL,
	"longitude" numeric(10, 7) NOT NULL,
	"location_accuracy_meters" numeric(8, 2),
	"geofence_radius_meters" integer DEFAULT 30 NOT NULL,
	"max_accepted_accuracy_meters" integer DEFAULT 50 NOT NULL,
	"notes" text,
	"status" "course_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD COLUMN "lecture_hall_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "lecture_halls_code_unique" ON "lecture_halls" USING btree ("code");--> statement-breakpoint
CREATE INDEX "lecture_halls_status_idx" ON "lecture_halls" USING btree ("status");--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_lecture_hall_id_lecture_halls_id_fk" FOREIGN KEY ("lecture_hall_id") REFERENCES "public"."lecture_halls"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attendance_sessions_lecture_hall_id_idx" ON "attendance_sessions" USING btree ("lecture_hall_id");