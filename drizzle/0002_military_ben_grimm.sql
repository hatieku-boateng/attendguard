CREATE TABLE "student_activation_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "student_activation_tokens" ADD CONSTRAINT "student_activation_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "student_activation_tokens_hash_unique" ON "student_activation_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "student_activation_tokens_user_id_idx" ON "student_activation_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "student_activation_tokens_expires_at_idx" ON "student_activation_tokens" USING btree ("expires_at");