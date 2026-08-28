DROP TABLE "attendance_passkeys" CASCADE;--> statement-breakpoint
ALTER TABLE "attendance_attempts" ALTER COLUMN "rejection_reason" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."rejection_reason";--> statement-breakpoint
CREATE TYPE "public"."rejection_reason" AS ENUM('invalid_qr', 'expired_qr', 'session_closed', 'student_not_enrolled', 'duplicate_attendance', 'account_mismatch', 'too_many_attempts');--> statement-breakpoint
ALTER TABLE "attendance_attempts" ALTER COLUMN "rejection_reason" SET DATA TYPE "public"."rejection_reason" USING "rejection_reason"::"public"."rejection_reason";--> statement-breakpoint
ALTER TABLE "attendance_records" ALTER COLUMN "verification_method" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."verification_method";--> statement-breakpoint
CREATE TYPE "public"."verification_method" AS ENUM('rotating_qr', 'manual', 'system');--> statement-breakpoint
ALTER TABLE "attendance_records" ALTER COLUMN "verification_method" SET DATA TYPE "public"."verification_method" USING "verification_method"::"public"."verification_method";--> statement-breakpoint
ALTER TABLE "attendance_attempts" DROP COLUMN "student_latitude";--> statement-breakpoint
ALTER TABLE "attendance_attempts" DROP COLUMN "student_longitude";--> statement-breakpoint
ALTER TABLE "attendance_attempts" DROP COLUMN "location_accuracy_meters";--> statement-breakpoint
ALTER TABLE "attendance_attempts" DROP COLUMN "calculated_distance_meters";--> statement-breakpoint
ALTER TABLE "attendance_records" DROP COLUMN "student_latitude";--> statement-breakpoint
ALTER TABLE "attendance_records" DROP COLUMN "student_longitude";--> statement-breakpoint
ALTER TABLE "attendance_records" DROP COLUMN "location_accuracy_meters";--> statement-breakpoint
ALTER TABLE "attendance_records" DROP COLUMN "calculated_distance_meters";--> statement-breakpoint
ALTER TABLE "attendance_sessions" DROP COLUMN "lecturer_latitude";--> statement-breakpoint
ALTER TABLE "attendance_sessions" DROP COLUMN "lecturer_longitude";--> statement-breakpoint
ALTER TABLE "attendance_sessions" DROP COLUMN "lecturer_location_accuracy";--> statement-breakpoint
ALTER TABLE "attendance_sessions" DROP COLUMN "geofence_radius_meters";--> statement-breakpoint
ALTER TABLE "attendance_sessions" DROP COLUMN "max_accepted_accuracy_meters";--> statement-breakpoint
ALTER TABLE "lecture_halls" DROP COLUMN "latitude";--> statement-breakpoint
ALTER TABLE "lecture_halls" DROP COLUMN "longitude";--> statement-breakpoint
ALTER TABLE "lecture_halls" DROP COLUMN "location_accuracy_meters";--> statement-breakpoint
ALTER TABLE "lecture_halls" DROP COLUMN "geofence_radius_meters";--> statement-breakpoint
ALTER TABLE "lecture_halls" DROP COLUMN "max_accepted_accuracy_meters";