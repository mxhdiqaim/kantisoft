ALTER TABLE "tenants" RENAME TO "businesses";--> statement-breakpoint
ALTER TABLE "businesses" DROP CONSTRAINT "tenants_user_id_unique";--> statement-breakpoint
ALTER TABLE "businesses" DROP CONSTRAINT "tenants_slug_unique";--> statement-breakpoint
ALTER TABLE "locations" DROP CONSTRAINT "locations_business_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "businesses" DROP CONSTRAINT "tenants_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "businesses" DROP CONSTRAINT "tenants_country_id_countries_id_fk";
--> statement-breakpoint
ALTER TABLE "businesses" DROP CONSTRAINT "tenants_address_id_addresses_id_fk";
--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_address_id_addresses_id_fk" FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_user_id_unique" UNIQUE("user_id");--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_slug_unique" UNIQUE("slug");