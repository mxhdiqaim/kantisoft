ALTER TABLE "locations" RENAME COLUMN "tenant_id" TO "business_id";--> statement-breakpoint
ALTER TABLE "locations" DROP CONSTRAINT "locations_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_business_id_tenants_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;