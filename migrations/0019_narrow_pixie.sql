ALTER TYPE "public"."transactionType" ADD VALUE 'productionIn';--> statement-breakpoint
ALTER TYPE "public"."rawMaterialTransactionSource" ADD VALUE 'productionConsumption';--> statement-breakpoint
ALTER TABLE "billOfMaterials" DROP CONSTRAINT "bom_menuItem_material_unique";--> statement-breakpoint
ALTER TABLE "billOfMaterials" ADD COLUMN "storeId" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "billOfMaterials" ADD CONSTRAINT "billOfMaterials_storeId_stores_id_fk" FOREIGN KEY ("storeId") REFERENCES "public"."stores"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billOfMaterials" ADD CONSTRAINT "bom_menuItem_material_unique" UNIQUE("storeId","menuItemId","rawMaterialId");