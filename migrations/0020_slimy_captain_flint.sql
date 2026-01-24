CREATE TABLE "productions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batchReference" text NOT NULL,
	"menuItemId" uuid NOT NULL,
	"storeId" uuid NOT NULL,
	"quantityProduced" double precision NOT NULL,
	"totalIngredientCost" double precision DEFAULT 0,
	"potentialRevenue" double precision DEFAULT 0,
	"performedBy" uuid,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"lastModified" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "productions_batchReference_unique" UNIQUE("batchReference")
);
--> statement-breakpoint
ALTER TABLE "productions" ADD CONSTRAINT "productions_menuItemId_menuItems_id_fk" FOREIGN KEY ("menuItemId") REFERENCES "public"."menuItems"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productions" ADD CONSTRAINT "productions_storeId_stores_id_fk" FOREIGN KEY ("storeId") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productions" ADD CONSTRAINT "productions_performedBy_users_id_fk" FOREIGN KEY ("performedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;