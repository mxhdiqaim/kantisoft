ALTER TYPE "public"."activityAction" ADD VALUE 'USER_LOGIN_FAILED' BEFORE 'USER_STORE_CHANGED';--> statement-breakpoint
ALTER TABLE "activityLog" ADD COLUMN "actorName" text;