CREATE TYPE "public"."billingStatus" AS ENUM('failed', 'pending', 'success');--> statement-breakpoint
CREATE TYPE "public"."billingType" AS ENUM('setupFee', 'monthlySubscription', 'additionalUser');--> statement-breakpoint
CREATE TYPE "public"."subscriptionStatus" AS ENUM('pendingSetup', 'active', 'gracePeriod', 'suspended', 'cancelled');--> statement-breakpoint
CREATE TABLE "billingTransactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storeId" uuid,
	"amount" numeric(12, 2) NOT NULL,
	"type" "billingType" DEFAULT 'setupFee',
	"reference" text,
	"status" "billingStatus" DEFAULT 'pending',
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now(),
	CONSTRAINT "billingTransactions_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "storeSubscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storeId" uuid NOT NULL,
	"status" "subscriptionStatus" DEFAULT 'pendingSetup' NOT NULL,
	"baseUserLimit" integer DEFAULT 1 NOT NULL,
	"isCapped" boolean DEFAULT false NOT NULL,
	"nextBillingDate" timestamp,
	"lastBillingDate" timestamp,
	"setupFeePaid" boolean DEFAULT false NOT NULL,
	"autoRenew" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now(),
	CONSTRAINT "storeSubscriptions_storeId_unique" UNIQUE("storeId")
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'user'::text;--> statement-breakpoint
DROP TYPE "public"."role";--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('superAdmin', 'admin', 'manager', 'user', 'guest');--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'user'::"public"."role";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE "public"."role" USING "role"::"public"."role";--> statement-breakpoint
ALTER TABLE "billingTransactions" ADD CONSTRAINT "billingTransactions_storeId_stores_id_fk" FOREIGN KEY ("storeId") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storeSubscriptions" ADD CONSTRAINT "storeSubscriptions_storeId_stores_id_fk" FOREIGN KEY ("storeId") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;