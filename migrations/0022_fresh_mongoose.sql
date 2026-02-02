CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"storeId" uuid,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"lastModified" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "categories_name_store_unique" UNIQUE("storeId","name")
);
--> statement-breakpoint
ALTER TABLE "menuItems" ADD COLUMN "categoryId" uuid;--> statement-breakpoint
ALTER TABLE "menuItems" ADD COLUMN "sku" text;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_storeId_stores_id_fk" FOREIGN KEY ("storeId") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menuItems" ADD CONSTRAINT "menuItems_categoryId_categories_id_fk" FOREIGN KEY ("categoryId") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menuItems" ADD CONSTRAINT "menuItems_sku_store_unique" UNIQUE("storeId","sku");