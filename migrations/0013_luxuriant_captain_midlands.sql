ALTER TABLE "unitOfMeasurement" RENAME COLUMN "unitName" TO "name";--> statement-breakpoint
ALTER TABLE "unitOfMeasurement" RENAME COLUMN "unitSymbol" TO "symbol";--> statement-breakpoint
DROP INDEX "unit_symbol_unique";--> statement-breakpoint
DROP INDEX "unit_name_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "unit_symbol_unique" ON "unitOfMeasurement" USING btree ("symbol");--> statement-breakpoint
CREATE UNIQUE INDEX "unit_name_unique" ON "unitOfMeasurement" USING btree ("name");