ALTER TABLE "academic_years" ADD COLUMN "external_id" varchar(120);--> statement-breakpoint
ALTER TABLE "academic_years" ADD COLUMN "source_system" varchar(80);--> statement-breakpoint
ALTER TABLE "course_catalog" ADD COLUMN "external_id" varchar(120);--> statement-breakpoint
ALTER TABLE "course_catalog" ADD COLUMN "source_system" varchar(80);--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "external_id" varchar(120);--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "source_system" varchar(80);--> statement-breakpoint
ALTER TABLE "departments" ADD COLUMN "external_id" varchar(120);--> statement-breakpoint
ALTER TABLE "departments" ADD COLUMN "source_system" varchar(80);--> statement-breakpoint
ALTER TABLE "enrolments" ADD COLUMN "external_id" varchar(120);--> statement-breakpoint
ALTER TABLE "enrolments" ADD COLUMN "source_system" varchar(80);--> statement-breakpoint
ALTER TABLE "faculties" ADD COLUMN "external_id" varchar(120);--> statement-breakpoint
ALTER TABLE "faculties" ADD COLUMN "source_system" varchar(80);--> statement-breakpoint
ALTER TABLE "lecturer_profiles" ADD COLUMN "external_id" varchar(120);--> statement-breakpoint
ALTER TABLE "lecturer_profiles" ADD COLUMN "source_system" varchar(80);--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "external_id" varchar(120);--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "source_system" varchar(80);--> statement-breakpoint
CREATE UNIQUE INDEX "academic_years_source_external_unique" ON "academic_years" USING btree ("source_system","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "course_catalog_source_external_unique" ON "course_catalog" USING btree ("source_system","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "courses_source_external_unique" ON "courses" USING btree ("source_system","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "departments_source_external_unique" ON "departments" USING btree ("source_system","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "enrolments_source_external_unique" ON "enrolments" USING btree ("source_system","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "faculties_source_external_unique" ON "faculties" USING btree ("source_system","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lecturer_profiles_source_external_unique" ON "lecturer_profiles" USING btree ("source_system","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "student_profiles_source_external_unique" ON "student_profiles" USING btree ("source_system","external_id");