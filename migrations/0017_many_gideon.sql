ALTER TABLE "rawMaterialStockTransactions" RENAME TO "rawMaterialTransactions";--> statement-breakpoint
ALTER TABLE "rawMaterialTransactions" DROP CONSTRAINT "rawMaterialStockTransactions_rawMaterialId_rawMaterials_id_fk";
--> statement-breakpoint
ALTER TABLE "rawMaterialTransactions" DROP CONSTRAINT "rawMaterialStockTransactions_storeId_stores_id_fk";
--> statement-breakpoint
ALTER TABLE "rawMaterialTransactions" DROP CONSTRAINT "rawMaterialStockTransactions_userId_users_id_fk";
--> statement-breakpoint
ALTER TABLE "rawMaterialTransactions" ADD CONSTRAINT "rawMaterialTransactions_rawMaterialId_rawMaterials_id_fk" FOREIGN KEY ("rawMaterialId") REFERENCES "public"."rawMaterials"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rawMaterialTransactions" ADD CONSTRAINT "rawMaterialTransactions_storeId_stores_id_fk" FOREIGN KEY ("storeId") REFERENCES "public"."stores"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rawMaterialTransactions" ADD CONSTRAINT "rawMaterialTransactions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;