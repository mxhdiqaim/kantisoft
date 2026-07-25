import {
    InsertUnitOfMeasurementSchemaT,
    unitOfMeasurement,
    UnitOfMeasurementFamilyType,
} from "../schema/unit-of-measurement-schema";
import db, { disconnect } from "../shared/database";
import { sql } from "drizzle-orm";
import logger from "../shared/logger";

const unitsSeedData: InsertUnitOfMeasurementSchemaT[] = [
    {
        name: "gram",
        symbol: "g",
        unitOfMeasurementFamily: "weight" as UnitOfMeasurementFamilyType,
        isBaseUnit: true,
        conversionFactorToBase: 1,
        calculationLogic: "The base unit for all weight calculations.",
    },
    {
        name: "kilogram",
        symbol: "kg",
        unitOfMeasurementFamily: "weight" as UnitOfMeasurementFamilyType,
        isBaseUnit: false,
        conversionFactorToBase: 1000,
        calculationLogic: "1 kg = 1000 g",
    },
    {
        name: "tonne",
        symbol: "t",
        unitOfMeasurementFamily: "weight" as UnitOfMeasurementFamilyType,
        isBaseUnit: false,
        conversionFactorToBase: 1000000,
        calculationLogic: "1 t = 1,000,000 g (1,000 kg)",
    },
    {
        name: "milligram",
        symbol: "mg",
        unitOfMeasurementFamily: "weight" as UnitOfMeasurementFamilyType,
        isBaseUnit: false,
        conversionFactorToBase: 0.001,
        calculationLogic: "1 mg = 0.001 g",
    },

    // Volume Units
    {
        name: "millilitre",
        symbol: "ml",
        unitOfMeasurementFamily: "volume" as UnitOfMeasurementFamilyType,
        isBaseUnit: true,
        conversionFactorToBase: 1,
        calculationLogic: "The base unit for all volume calculations.",
    },
    {
        name: "litre",
        symbol: "L",
        unitOfMeasurementFamily: "volume" as UnitOfMeasurementFamilyType,
        isBaseUnit: false,
        conversionFactorToBase: 1000,
        calculationLogic: "1 L = 1000 ml",
    },
    {
        name: "cubic metre",
        symbol: "m3",
        unitOfMeasurementFamily: "volume" as UnitOfMeasurementFamilyType,
        isBaseUnit: false,
        conversionFactorToBase: 1000000,
        calculationLogic: "1 m³ = 1,000,000 ml (1,000 L)",
    },

    // Count Units
    {
        name: "unit",
        symbol: "unit",
        unitOfMeasurementFamily: "count" as UnitOfMeasurementFamilyType,
        isBaseUnit: true,
        conversionFactorToBase: 1,
        calculationLogic:
            "The base unit for discrete items (e.g., eggs, pieces).",
    },
    {
        name: "dozen",
        symbol: "dz",
        unitOfMeasurementFamily: "count" as UnitOfMeasurementFamilyType,
        isBaseUnit: false,
        conversionFactorToBase: 12,
        calculationLogic: "1 dozen = 12 units",
    },
    {
        name: "gross",
        symbol: "grs",
        unitOfMeasurementFamily: "count" as UnitOfMeasurementFamilyType,
        isBaseUnit: false,
        conversionFactorToBase: 144,
        calculationLogic: "1 gross = 144 units (12 dozen)",
    },

    // Length Units
    {
        name: "metre",
        symbol: "m",
        unitOfMeasurementFamily: "length" as UnitOfMeasurementFamilyType,
        isBaseUnit: true,
        conversionFactorToBase: 1,
        calculationLogic: "The base unit for all length calculations.",
    },
    {
        name: "centimetre",
        symbol: "cm",
        unitOfMeasurementFamily: "length" as UnitOfMeasurementFamilyType,
        isBaseUnit: false,
        conversionFactorToBase: 0.01,
        calculationLogic: "1 cm = 0.01 m",
    },
    {
        name: "kilometre",
        symbol: "km",
        unitOfMeasurementFamily: "length" as UnitOfMeasurementFamilyType,
        isBaseUnit: false,
        conversionFactorToBase: 1000,
        calculationLogic: "1 km = 1000 m",
    },
];

const seedUnitsOfMeasurement = async () => {
    logger.info("-> Seeding Units of Measurement...");

    // Perform the Upsert operation
    const result = await db
        .insert(unitOfMeasurement)
        .values(unitsSeedData)
        .onConflictDoUpdate({
            // Use the unique index on the 'symbol' column to detect conflicts
            target: unitOfMeasurement.symbol,

            // Define which columns to update if a conflict is detected.
            // We update all other fields that might change (name, family, factors).
            set: {
                name: sql`excluded.name`,
                symbol: sql`excluded.symbol`,
                unitOfMeasurementFamily: sql`excluded."unitOfMeasurementFamily"`,
                isBaseUnit: sql`excluded."isBaseUnit"`,
                conversionFactorToBase: sql`excluded."conversionFactorToBase"`,
                calculationLogic: sql`excluded."calculationLogic"`,
            },
        })
        .returning();

    logger.info(
        `✅ Successfully processed ${result.length} unit of measurement records (Inserted/Updated).`,
    );
};

const main = async () => {
    logger.info("🌱 Starting seed...");
    await seedUnitsOfMeasurement();
    // Add other seed functions here if needed
    logger.info("✅ Seed successful!");
};

main()
    .catch((error) => {
        logger.error("❌ Seed failed:", error as Error);
        process.exit(1);
    })
    .finally(async () => {
        logger.info("🔌 Finishing seed process...");
        await disconnect();
    });
