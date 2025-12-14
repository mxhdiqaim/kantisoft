ALTER TYPE "public"."unitFamily" RENAME TO "unitOfMeasurementFamily";--> statement-breakpoint
ALTER TABLE "unitOfMeasurement" RENAME COLUMN "unitFamily" TO "unitOfMeasurementFamily";