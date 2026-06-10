CREATE TABLE "course_catalog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_code" varchar(40) NOT NULL,
	"course_title" varchar(200) NOT NULL,
	"programme" varchar(160),
	"level" varchar(50),
	"description" text,
	"status" "course_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"lecturer_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"resource_type" varchar(80) NOT NULL,
	"resource_url" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "catalog_course_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_url" text;--> statement-breakpoint
ALTER TABLE "course_resources" ADD CONSTRAINT "course_resources_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_resources" ADD CONSTRAINT "course_resources_lecturer_id_lecturer_profiles_id_fk" FOREIGN KEY ("lecturer_id") REFERENCES "public"."lecturer_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "course_catalog_code_unique" ON "course_catalog" USING btree ("course_code");--> statement-breakpoint
CREATE INDEX "course_catalog_status_idx" ON "course_catalog" USING btree ("status");--> statement-breakpoint
CREATE INDEX "course_resources_course_id_idx" ON "course_resources" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "course_resources_lecturer_id_idx" ON "course_resources" USING btree ("lecturer_id");--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_catalog_course_id_course_catalog_id_fk" FOREIGN KEY ("catalog_course_id") REFERENCES "public"."course_catalog"("id") ON DELETE set null ON UPDATE no action;