DROP INDEX "raw_material_name_unique";--> statement-breakpoint
ALTER TABLE "rawMaterials" ADD CONSTRAINT "raw_materials_name_store_id_unique" UNIQUE("storeId","name");