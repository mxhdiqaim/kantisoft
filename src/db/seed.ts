import {
    InsertUnitOfMeasurementSchemaT,
    unitOfMeasurement,
    UnitOfMeasurementFamilyType,
} from "../schema/unit-of-measurement-schema";
import db, { pool } from "./index";
import { sql } from "drizzle-orm";

const unitsSeedData: InsertUnitOfMeasurementSchemaT[] = [
    // Weight Units
    {
        name: "Gram",
        symbol: "g",
        unitOfMeasurementFamily: "weight" as UnitOfMeasurementFamilyType,
        isBaseUnit: true,
        conversionFactorToBase: 1,
        calculationLogic: "The base unit for all weight calculations.",
    },
    {
        name: "Kilogram",
        symbol: "kg",
        unitOfMeasurementFamily: "weight" as UnitOfMeasurementFamilyType,
        isBaseUnit: false,
        conversionFactorToBase: 1000,
        calculationLogic: "1 kg = 1000 g",
    },
    {
        name: "Tonne (Metric Ton)",
        symbol: "t",
        unitOfMeasurementFamily: "weight" as UnitOfMeasurementFamilyType,
        isBaseUnit: false,
        conversionFactorToBase: 1000000,
        calculationLogic: "1 t = 1,000,000 g (1,000 kg)",
    },
    {
        name: "Milligram",
        symbol: "mg",
        unitOfMeasurementFamily: "weight" as UnitOfMeasurementFamilyType,
        isBaseUnit: false,
        conversionFactorToBase: 0.001,
        calculationLogic: "1 mg = 0.001 g",
    },

    // Volume Units
    {
        name: "Milliliter",
        symbol: "ml",
        unitOfMeasurementFamily: "volume" as UnitOfMeasurementFamilyType,
        isBaseUnit: true,
        conversionFactorToBase: 1,
        calculationLogic: "The base unit for all volume calculations.",
    },
    {
        name: "Liter",
        symbol: "L",
        unitOfMeasurementFamily: "volume" as UnitOfMeasurementFamilyType,
        isBaseUnit: false,
        conversionFactorToBase: 1000,
        calculationLogic: "1 L = 1000 ml",
    },
    {
        name: "Cubic Meter",
        symbol: "m³",
        unitOfMeasurementFamily: "volume" as UnitOfMeasurementFamilyType,
        isBaseUnit: false,
        conversionFactorToBase: 1000000,
        calculationLogic: "1 m³ = 1,000,000 ml (1,000 L)",
    },

    // Count Units
    {
        name: "Unit",
        symbol: "unit",
        unitOfMeasurementFamily: "count" as UnitOfMeasurementFamilyType,
        isBaseUnit: true,
        conversionFactorToBase: 1,
        calculationLogic:
            "The base unit for discrete items (e.g., eggs, pieces).",
    },
    {
        name: "Dozen",
        symbol: "dz",
        unitOfMeasurementFamily: "count" as UnitOfMeasurementFamilyType,
        isBaseUnit: false,
        conversionFactorToBase: 12,
        calculationLogic: "1 dozen = 12 units",
    },
    {
        name: "Gross",
        symbol: "grs",
        unitOfMeasurementFamily: "count" as UnitOfMeasurementFamilyType,
        isBaseUnit: false,
        conversionFactorToBase: 144,
        calculationLogic: "1 gross = 144 units (12 dozen)",
    },

    // Length Units
    {
        name: "Meter",
        symbol: "m",
        unitOfMeasurementFamily: "length" as UnitOfMeasurementFamilyType,
        isBaseUnit: true,
        conversionFactorToBase: 1,
        calculationLogic: "The base unit for all length calculations.",
    },
    {
        name: "Centimeter",
        symbol: "cm",
        unitOfMeasurementFamily: "length" as UnitOfMeasurementFamilyType,
        isBaseUnit: false,
        conversionFactorToBase: 0.01,
        calculationLogic: "1 cm = 0.01 m",
    },
    {
        name: "Kilometer",
        symbol: "km",
        unitOfMeasurementFamily: "length" as UnitOfMeasurementFamilyType,
        isBaseUnit: false,
        conversionFactorToBase: 1000,
        calculationLogic: "1 km = 1000 m",
    },
];

const seedUnitsOfMeasurement = async () => {
    console.log("-> Seeding Units of Measurement...");

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
                name: sql`excluded
                .
                name`, // Update with the incoming value
                unitOfMeasurementFamily: sql`excluded
                .
                "unitOfMeasurementFamily"`, // Update with the incoming value
                isBaseUnit: sql`excluded
                .
                "isBaseUnit"`, // Update with the incoming value
                conversionFactorToBase: sql`excluded
                .
                "conversionFactorToBase"`, // Update with the incoming value
                calculationLogic: sql`excluded
                .
                "calculationLogic"`, // Update with the incoming value
            },
        })
        .returning();

    console.log(
        `✅ Successfully processed ${result.length} unit of measurement records (Inserted/Updated).`,
    );
};

const main = async () => {
    console.log("🌱 Starting seed...");
    await seedUnitsOfMeasurement();
    // Add other seed functions here if needed
    console.log("✅ Seed successful!");
};

main()
    .catch((error) => {
        console.error("❌ Seed failed:", error);
        process.exit(1);
    })
    .finally(async () => {
        console.log("🔌 Closing database connection pool...");
        await pool.end();
        console.log("🔌 Pool closed. Seed process finished.");
    });
