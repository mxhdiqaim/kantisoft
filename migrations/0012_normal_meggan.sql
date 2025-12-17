CREATE TYPE "public"."unitName" AS ENUM('milligram', 'gram', 'kilogram', 'tonne', 'millilitre', 'litre', 'unit', 'dozen', 'gross', 'square metre', 'metre square', 'cubic metre', 'centimetre', 'metre', 'kilometre');--> statement-breakpoint
CREATE TYPE "public"."unitSymbol" AS ENUM('mg', 'g', 'kg', 't', 'ml', 'L', 'unit', 'dz', 'grs', 'sqm', 'm2', 'm3', 'cm', 'm', 'km');--> statement-breakpoint
ALTER TABLE "unitOfMeasurement" RENAME COLUMN "name" TO "unitName";--> statement-breakpoint
ALTER TABLE "unitOfMeasurement" RENAME COLUMN "symbol" TO "unitSymbol";--> statement-breakpoint
DROP INDEX "unit_symbol_unique";--> statement-breakpoint
DROP INDEX "unit_name_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "unit_symbol_unique" ON "unitOfMeasurement" USING btree ("unitSymbol");--> statement-breakpoint
CREATE UNIQUE INDEX "unit_name_unique" ON "unitOfMeasurement" USING btree ("unitName");