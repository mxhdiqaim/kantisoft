CREATE TYPE "public"."role" AS ENUM('owner', 'admin', 'manager', 'staff', 'cashier', 'guest');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('active', 'inactive', 'deleted', 'banned');--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenantId" uuid NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_locations" (
	"userId" uuid NOT NULL,
	"locationId" uuid NOT NULL,
	CONSTRAINT "user_locations_userId_locationId_pk" PRIMARY KEY("userId","locationId")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"clerkId" text NOT NULL,
	"firstName" text NOT NULL,
	"lastName" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"role" "role" DEFAULT 'cashier' NOT NULL,
	"status" "status" DEFAULT 'active' NOT NULL,
	"tenantId" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerkId_unique" UNIQUE("clerkId"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_locations" ADD CONSTRAINT "user_locations_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_locations" ADD CONSTRAINT "user_locations_locationId_locations_id_fk" FOREIGN KEY ("locationId") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;