CREATE TYPE "public"."activityAction" AS ENUM('USER_CREATED', 'USER_UPDATED', 'USER_DELETED', 'USER_VIEWED', 'USER_READ', 'USER_LOGIN', 'USER_LOGOUT', 'USER_PASSWORD_CHANGED', 'USER_STORE_CHANGED', 'STORE_CREATED', 'STORE_UPDATED', 'STORE_DELETED', 'STORE_VIEWED', 'STORE_READ', 'MENU_ITEM_CREATED', 'MENU_ITEM_UPDATED', 'MENU_ITEM_DELETED', 'MENU_ITEM_VIEWED', 'MENU_ITEM_READ', 'ORDER_CREATED', 'ORDER_UPDATED', 'ORDER_DELETED', 'ORDER_VIEWED', 'ORDER_READ', 'ORDER_STATUS_UPDATED', 'ORDER_STOCK_DECREMENTED', 'MANAGER_CREATED', 'MANAGER_UPDATED', 'MANAGER_DELETED', 'MANAGER_VIEWED', 'MANAGER_READ', 'MANAGER_REGISTERED', 'INVENTORY_CREATED', 'INVENTORY_UPDATED', 'INVENTORY_DELETED', 'INVENTORY_VIEWED', 'INVENTORY_READ', 'INVENTORY_ADJUSTED', 'INVENTORY_DECREMENTED', 'INVENTORY_CONTINUED', 'INVENTORY_DISCONTINUED', 'RAW_MATERIAL_INVENTORY_CREATED', 'RAW_MATERIAL_INVENTORY_UPDATED', 'RAW_MATERIAL_INVENTORY_DELETED', 'RAW_MATERIAL_INVENTORY_VIEWED', 'RAW_MATERIAL_INVENTORY_READ', 'RAW_MATERIAL_INVENTORY_ADJUSTED', 'RAW_MATERIAL_INVENTORY_DECREMENTED', 'RAW_MATERIAL_INVENTORY_CONTINUED', 'RAW_MATERIAL_INVENTORY_DISCONTINUED', 'ORDER_STATUS_CREATED', 'ORDER_STATUS_DELETED', 'ORDER_STATUS_VIEWED', 'ORDER_STATUS_READ', 'ORDER_STOCK_CREATED', 'ORDER_STOCK_UPDATED', 'ORDER_STOCK_DELETED', 'ORDER_STOCK_VIEWED', 'ORDER_STOCK_READ', 'ORDER_STOCK_ADJUSTED', 'ORDER_STOCK_CONTINUED', 'ORDER_STOCK_DISCONTINUED', 'PASSWORD_CHANGED', 'STOCK_ADJUSTED_CREATED', 'STOCK_ADJUSTED_UPDATED', 'STOCK_ADJUSTED_DELETED', 'STOCK_ADJUSTED_VIEWED', 'STOCK_ADJUSTED_READ', 'STOCK_ADJUSTED_ADJUSTED', 'STOCK_ADJUSTED_DECREMENTED', 'STOCK_ADJUSTED_CONTINUED', 'STOCK_ADJUSTED_DISCONTINUED');--> statement-breakpoint
CREATE TYPE "public"."entityType" AS ENUM('activity', 'inventory', 'menuItem', 'order', 'rawMaterial', 'rawMaterialInventory', 'store', 'user');--> statement-breakpoint
CREATE TYPE "public"."inventoryStatus" AS ENUM('inStock', 'lowStock', 'outOfStock', 'adjustment', 'discontinued');--> statement-breakpoint
CREATE TYPE "public"."transactionType" AS ENUM('sale', 'purchaseReceive', 'adjustmentIn', 'adjustmentOut', 'transferOut', 'transferIn', 'productionIn');--> statement-breakpoint
CREATE TYPE "public"."paymentMethod" AS ENUM('card', 'cash', 'transfer');--> statement-breakpoint
CREATE TYPE "public"."orderStatus" AS ENUM('cancelled', 'completed', 'pending', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."rawMaterialStatus" AS ENUM('active', 'deleted', 'archived');--> statement-breakpoint
CREATE TYPE "public"."rawInventoryStatus" AS ENUM('inStock', 'lowStock', 'outOfStock', 'onOrder');--> statement-breakpoint
CREATE TYPE "public"."rawMaterialTransactionSource" AS ENUM('purchaseReceipt', 'productionUsage', 'inventoryAdjustment', 'wastage', 'transferIn', 'transferOut', 'productionConsumption');--> statement-breakpoint
CREATE TYPE "public"."rawMaterialTransactionType" AS ENUM('comingIn', 'goingOut', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."branchType" AS ENUM('branch', 'main');--> statement-breakpoint
CREATE TYPE "public"."storeType" AS ENUM('restaurant', 'pharmacy', 'supermarket');--> statement-breakpoint
CREATE TYPE "public"."unitName" AS ENUM('milligram', 'gram', 'kilogram', 'tonne', 'millilitre', 'litre', 'unit', 'dozen', 'gross', 'square metre', 'metre square', 'cubic metre', 'centimetre', 'metre', 'kilometre');--> statement-breakpoint
CREATE TYPE "public"."unitOfMeasurementFamily" AS ENUM('weight', 'volume', 'count', 'area', 'length');--> statement-breakpoint
CREATE TYPE "public"."unitSymbol" AS ENUM('mg', 'g', 'kg', 't', 'ml', 'L', 'unit', 'dz', 'grs', 'sqm', 'm2', 'm3', 'cm', 'm', 'km');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('manager', 'admin', 'user', 'guest');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('active', 'inactive', 'deleted', 'banned');--> statement-breakpoint
CREATE TABLE "activityLog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid,
	"storeId" uuid,
	"action" "activityAction" NOT NULL,
	"entityId" text,
	"entityType" "entityType" DEFAULT 'activity' NOT NULL,
	"details" text NOT NULL,
	"isRead" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billOfMaterials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"menuItemId" uuid NOT NULL,
	"rawMaterialId" uuid NOT NULL,
	"storeId" uuid NOT NULL,
	"consumptionQuantityBase" double precision NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"lastModified" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bom_menuItem_material_unique" UNIQUE("storeId","menuItemId","rawMaterialId")
);
--> statement-breakpoint
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
CREATE TABLE "inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"menuItemId" uuid NOT NULL,
	"storeId" uuid NOT NULL,
	"quantity" double precision DEFAULT 0 NOT NULL,
	"minStockLevel" integer DEFAULT 10 NOT NULL,
	"status" "inventoryStatus" DEFAULT 'inStock' NOT NULL,
	"lastCountDate" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"lastModified" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_menuItem_store_unique" UNIQUE("menuItemId","storeId")
);
--> statement-breakpoint
CREATE TABLE "inventoryTransactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"menuItemId" uuid NOT NULL,
	"rawMaterialId" uuid,
	"storeId" uuid NOT NULL,
	"transactionType" "transactionType" DEFAULT 'sale' NOT NULL,
	"quantityChange" double precision NOT NULL,
	"resultingQuantity" double precision,
	"sourceDocumentId" uuid,
	"performedBy" uuid,
	"notes" text,
	"transactionDate" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"lastModified" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menuItems" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"categoryId" uuid,
	"sku" text,
	"itemCode" text,
	"price" numeric(10, 2) NOT NULL,
	"storeId" uuid,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"lastModified" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "menuItems_name_store_unique" UNIQUE("storeId","name"),
	CONSTRAINT "menuItems_itemCode_store_unique" UNIQUE("storeId","itemCode"),
	CONSTRAINT "menuItems_sku_store_unique" UNIQUE("storeId","sku")
);
--> statement-breakpoint
CREATE TABLE "orderItems" (
	"orderId" uuid NOT NULL,
	"menuItemId" uuid NOT NULL,
	"quantity" numeric NOT NULL,
	"priceAtOrder" double precision NOT NULL,
	"subTotal" double precision DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"lastModified" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text,
	"totalAmount" double precision NOT NULL,
	"paymentMethod" "paymentMethod" DEFAULT 'cash' NOT NULL,
	"orderDate" timestamp DEFAULT now() NOT NULL,
	"orderStatus" "orderStatus" DEFAULT 'completed' NOT NULL,
	"storeId" uuid,
	"sellerId" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"lastModified" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "orders_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
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
CREATE TABLE "rawMaterials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"unitOfMeasurementId" uuid NOT NULL,
	"description" text,
	"latestUnitPrice" double precision DEFAULT 0 NOT NULL,
	"status" "rawMaterialStatus" DEFAULT 'active' NOT NULL,
	"storeId" uuid,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"lastModified" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "raw_materials_name_store_id_unique" UNIQUE("storeId","name")
);
--> statement-breakpoint
CREATE TABLE "rawMaterialInventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rawMaterialId" uuid NOT NULL,
	"storeId" uuid NOT NULL,
	"quantity" double precision DEFAULT 0 NOT NULL,
	"minStockLevel" double precision DEFAULT 0 NOT NULL,
	"status" "rawInventoryStatus" DEFAULT 'inStock' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"lastModified" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "raw_inventory_material_store_unique" UNIQUE("rawMaterialId","storeId")
);
--> statement-breakpoint
CREATE TABLE "rawMaterialTransactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rawMaterialId" uuid NOT NULL,
	"storeId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"type" "rawMaterialTransactionType" NOT NULL,
	"source" "rawMaterialTransactionSource" NOT NULL,
	"quantityBase" double precision NOT NULL,
	"documentRefId" text,
	"notes" text,
	"transactionDate" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"lastModified" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"location" text,
	"storeType" "storeType" DEFAULT 'restaurant' NOT NULL,
	"storeParentId" uuid,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "unitOfMeasurement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" "unitName" NOT NULL,
	"symbol" "unitSymbol" NOT NULL,
	"unitOfMeasurementFamily" "unitOfMeasurementFamily" NOT NULL,
	"isBaseUnit" boolean DEFAULT false NOT NULL,
	"conversionFactorToBase" double precision DEFAULT 1 NOT NULL,
	"calculationLogic" text DEFAULT '',
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"lastModified" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firstName" text NOT NULL,
	"lastName" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"phone" text,
	"role" "role" DEFAULT 'user' NOT NULL,
	"status" "status" DEFAULT 'active' NOT NULL,
	"storeId" uuid,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"lastModified" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activityLog" ADD CONSTRAINT "activityLog_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activityLog" ADD CONSTRAINT "activityLog_storeId_stores_id_fk" FOREIGN KEY ("storeId") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billOfMaterials" ADD CONSTRAINT "billOfMaterials_menuItemId_menuItems_id_fk" FOREIGN KEY ("menuItemId") REFERENCES "public"."menuItems"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billOfMaterials" ADD CONSTRAINT "billOfMaterials_rawMaterialId_rawMaterials_id_fk" FOREIGN KEY ("rawMaterialId") REFERENCES "public"."rawMaterials"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billOfMaterials" ADD CONSTRAINT "billOfMaterials_storeId_stores_id_fk" FOREIGN KEY ("storeId") REFERENCES "public"."stores"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_storeId_stores_id_fk" FOREIGN KEY ("storeId") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_menuItemId_menuItems_id_fk" FOREIGN KEY ("menuItemId") REFERENCES "public"."menuItems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_storeId_stores_id_fk" FOREIGN KEY ("storeId") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventoryTransactions" ADD CONSTRAINT "inventoryTransactions_menuItemId_menuItems_id_fk" FOREIGN KEY ("menuItemId") REFERENCES "public"."menuItems"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventoryTransactions" ADD CONSTRAINT "inventoryTransactions_rawMaterialId_rawMaterials_id_fk" FOREIGN KEY ("rawMaterialId") REFERENCES "public"."rawMaterials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventoryTransactions" ADD CONSTRAINT "inventoryTransactions_storeId_stores_id_fk" FOREIGN KEY ("storeId") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventoryTransactions" ADD CONSTRAINT "inventoryTransactions_performedBy_users_id_fk" FOREIGN KEY ("performedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menuItems" ADD CONSTRAINT "menuItems_categoryId_categories_id_fk" FOREIGN KEY ("categoryId") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menuItems" ADD CONSTRAINT "menuItems_storeId_stores_id_fk" FOREIGN KEY ("storeId") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orderItems" ADD CONSTRAINT "orderItems_orderId_orders_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orderItems" ADD CONSTRAINT "orderItems_menuItemId_menuItems_id_fk" FOREIGN KEY ("menuItemId") REFERENCES "public"."menuItems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_storeId_stores_id_fk" FOREIGN KEY ("storeId") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_sellerId_users_id_fk" FOREIGN KEY ("sellerId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productions" ADD CONSTRAINT "productions_menuItemId_menuItems_id_fk" FOREIGN KEY ("menuItemId") REFERENCES "public"."menuItems"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productions" ADD CONSTRAINT "productions_storeId_stores_id_fk" FOREIGN KEY ("storeId") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productions" ADD CONSTRAINT "productions_performedBy_users_id_fk" FOREIGN KEY ("performedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rawMaterials" ADD CONSTRAINT "rawMaterials_unitOfMeasurementId_unitOfMeasurement_id_fk" FOREIGN KEY ("unitOfMeasurementId") REFERENCES "public"."unitOfMeasurement"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rawMaterials" ADD CONSTRAINT "rawMaterials_storeId_stores_id_fk" FOREIGN KEY ("storeId") REFERENCES "public"."stores"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rawMaterialInventory" ADD CONSTRAINT "rawMaterialInventory_rawMaterialId_rawMaterials_id_fk" FOREIGN KEY ("rawMaterialId") REFERENCES "public"."rawMaterials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rawMaterialInventory" ADD CONSTRAINT "rawMaterialInventory_storeId_stores_id_fk" FOREIGN KEY ("storeId") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rawMaterialTransactions" ADD CONSTRAINT "rawMaterialTransactions_rawMaterialId_rawMaterials_id_fk" FOREIGN KEY ("rawMaterialId") REFERENCES "public"."rawMaterials"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rawMaterialTransactions" ADD CONSTRAINT "rawMaterialTransactions_storeId_stores_id_fk" FOREIGN KEY ("storeId") REFERENCES "public"."stores"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rawMaterialTransactions" ADD CONSTRAINT "rawMaterialTransactions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_storeParentId_stores_id_fk" FOREIGN KEY ("storeParentId") REFERENCES "public"."stores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_storeId_stores_id_fk" FOREIGN KEY ("storeId") REFERENCES "public"."stores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unit_symbol_unique" ON "unitOfMeasurement" USING btree ("symbol");--> statement-breakpoint
CREATE UNIQUE INDEX "unit_name_unique" ON "unitOfMeasurement" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_global_unique" ON "users" USING btree ("phone") WHERE "phone"
                    IS NOT NULL AND "phone" != '';--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_global_unique" ON "users" USING btree ("email") WHERE "email"
                    IS NOT NULL AND "email" != '';