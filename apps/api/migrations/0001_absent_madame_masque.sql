ALTER TYPE "public"."status" ADD VALUE 'invited';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "tenantId" DROP NOT NULL;