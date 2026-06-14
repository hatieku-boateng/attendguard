CREATE TYPE "public"."programme_level" AS ENUM('diploma', 'undergraduate', 'postgraduate');--> statement-breakpoint
CREATE TYPE "public"."student_category" AS ENUM('regular', 'weekend', 'access');--> statement-breakpoint
CREATE TABLE "academic_years" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"start_year" integer NOT NULL,
	"end_year" integer NOT NULL,
	"display_name" varchar(20) NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"status" varchar(40) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"faculty_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"code" varchar(40) NOT NULL,
	"description" text,
	"status" varchar(40) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "faculties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"code" varchar(40) NOT NULL,
	"description" text,
	"status" varchar(40) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "course_catalog" ADD COLUMN "academic_year_id" uuid;--> statement-breakpoint
ALTER TABLE "course_catalog" ADD COLUMN "faculty_id" uuid;--> statement-breakpoint
ALTER TABLE "course_catalog" ADD COLUMN "department_id" uuid;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "student_category" "student_category" DEFAULT 'regular' NOT NULL;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "programme_level" "programme_level" DEFAULT 'undergraduate' NOT NULL;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "faculty_id" uuid;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "department_id" uuid;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "academic_year_id" uuid;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_faculty_id_faculties_id_fk" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculties"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "academic_years_display_name_unique" ON "academic_years" USING btree ("display_name");--> statement-breakpoint
CREATE INDEX "academic_years_current_idx" ON "academic_years" USING btree ("is_current");--> statement-breakpoint
CREATE INDEX "academic_years_status_idx" ON "academic_years" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "departments_faculty_name_unique" ON "departments" USING btree ("faculty_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "departments_code_unique" ON "departments" USING btree ("code");--> statement-breakpoint
CREATE INDEX "departments_faculty_id_idx" ON "departments" USING btree ("faculty_id");--> statement-breakpoint
CREATE INDEX "departments_status_idx" ON "departments" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "faculties_name_unique" ON "faculties" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "faculties_code_unique" ON "faculties" USING btree ("code");--> statement-breakpoint
CREATE INDEX "faculties_status_idx" ON "faculties" USING btree ("status");--> statement-breakpoint
ALTER TABLE "course_catalog" ADD CONSTRAINT "course_catalog_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_catalog" ADD CONSTRAINT "course_catalog_faculty_id_faculties_id_fk" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculties"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_catalog" ADD CONSTRAINT "course_catalog_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_faculty_id_faculties_id_fk" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculties"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "course_catalog_faculty_id_idx" ON "course_catalog" USING btree ("faculty_id");--> statement-breakpoint
CREATE INDEX "course_catalog_department_id_idx" ON "course_catalog" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "course_catalog_academic_year_id_idx" ON "course_catalog" USING btree ("academic_year_id");--> statement-breakpoint
CREATE INDEX "student_profiles_faculty_id_idx" ON "student_profiles" USING btree ("faculty_id");--> statement-breakpoint
CREATE INDEX "student_profiles_department_id_idx" ON "student_profiles" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "student_profiles_academic_year_id_idx" ON "student_profiles" USING btree ("academic_year_id");--> statement-breakpoint
DO $$
DECLARE
	default_faculty_id uuid;
	default_department_id uuid;
	default_academic_year_id uuid;
	current_start_year integer;
	current_end_year integer;
	current_display_name text;
BEGIN
	IF EXTRACT(MONTH FROM CURRENT_DATE)::integer >= 9 THEN
		current_start_year := EXTRACT(YEAR FROM CURRENT_DATE)::integer;
	ELSE
		current_start_year := EXTRACT(YEAR FROM CURRENT_DATE)::integer - 1;
	END IF;
	current_end_year := current_start_year + 1;
	current_display_name := current_start_year::text || '/' || current_end_year::text;

	INSERT INTO "faculties" ("name", "code", "description", "status")
	VALUES (
		'Faculty of Engineering, Science and Computing',
		'FESC',
		'Default faculty classification for existing course catalogue records.',
		'active'
	)
	ON CONFLICT ("code") DO UPDATE SET
		"name" = EXCLUDED."name",
		"updated_at" = now()
	RETURNING "id" INTO default_faculty_id;

	INSERT INTO "departments" ("faculty_id", "name", "code", "description", "status")
	VALUES (
		default_faculty_id,
		'Information Technology',
		'IT',
		'Default department classification for existing course catalogue records.',
		'active'
	)
	ON CONFLICT ("code") DO UPDATE SET
		"faculty_id" = EXCLUDED."faculty_id",
		"name" = EXCLUDED."name",
		"updated_at" = now()
	RETURNING "id" INTO default_department_id;

	INSERT INTO "academic_years" ("start_year", "end_year", "display_name", "is_current", "status")
	VALUES (current_start_year, current_end_year, current_display_name, true, 'active')
	ON CONFLICT ("display_name") DO UPDATE SET
		"is_current" = true,
		"status" = 'active',
		"updated_at" = now()
	RETURNING "id" INTO default_academic_year_id;

	UPDATE "academic_years"
	SET "is_current" = false, "updated_at" = now()
	WHERE "id" <> default_academic_year_id;

	UPDATE "course_catalog"
	SET
		"faculty_id" = COALESCE("faculty_id", default_faculty_id),
		"department_id" = COALESCE("department_id", default_department_id),
		"academic_year_id" = COALESCE("academic_year_id", default_academic_year_id);

	UPDATE "student_profiles"
	SET
		"faculty_id" = COALESCE("faculty_id", default_faculty_id),
		"department_id" = COALESCE("department_id", default_department_id),
		"academic_year_id" = COALESCE("academic_year_id", default_academic_year_id);
END $$;
