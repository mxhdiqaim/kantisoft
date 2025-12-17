import {
    boolean,
    doublePrecision,
    pgEnum,
    pgTable,
    text,
    timestamp,
    uniqueIndex,
    uuid,
} from "drizzle-orm/pg-core";

// Define the core categories of measurement
export const unitOfMeasurementFamilyEnum = pgEnum("unitOfMeasurementFamily", [
    "weight", // Mass (e.g. kg, g)
    "volume", // Liquid/Capacity (e.g. L, ml)
    "count", // Discrete units (e.g. unit, dozen)
    "area", // (Optional: m², sqm)
    "length", // (Optional: m, cm, km)
]);

export const unitNameEnum = pgEnum("unitName", [
    "milligram",
    "gram",
    "kilogram",
    "tonne",

    "millilitre",
    "litre",

    "unit",
    "dozen",
    "gross",

    "square metre",
    "metre square",
    "cubic metre",

    "centimetre",
    "metre",
    "kilometre",
]);

export const unitSymbolEnum = pgEnum("unitSymbol", [
    "mg", // milligram
    "g", // gram
    "kg", // kilogram
    "t", // tonne

    "ml", // millilitre
    "L", // litre

    "unit", // single unit
    "dz", // 12 units
    "grs", // gross (144 units)

    "sqm", // square meter
    "m2", // meter square
    "m3", // cubic meter

    "cm", // centimeter
    "m", // meter
    "km", // kilometer
]);

export const unitOfMeasurement = pgTable(
    "unitOfMeasurement",
    {
        id: uuid("id").defaultRandom().primaryKey(),

        // The display name of the unit (what the user sees)
        name: unitNameEnum("name").notNull(), // e.g., "Kilogram", "Gram", "Litre", "Dozen"

        // The short code (used in display/calculations)
        symbol: unitSymbolEnum("symbol").notNull(), // e.g., "kg", "g", "L", "unit"

        unitOfMeasurementFamily: unitOfMeasurementFamilyEnum(
            "unitOfMeasurementFamily",
        ).notNull(), // e.g., "WEIGHT", "VOLUME", "COUNT"

        isBaseUnit: boolean("isBaseUnit").notNull().default(false), // True for the base unit in a family (e.g. 'g')

        // The factor to convert THIS unit to the internal system's BASE UNIT (e.g. 1000 for 1 kg -> 1000 g)
        conversionFactorToBase: doublePrecision("conversionFactorToBase")
            .notNull()
            .default(1),

        calculationLogic: text("calculationLogic").default(""), // Explanation of conversion logic

        // Timestamps
        createdAt: timestamp("createdAt").defaultNow().notNull(),
        lastModified: timestamp("lastModified")
            .defaultNow()
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => {
        return {
            unitSymbolUnique: uniqueIndex("unit_symbol_unique").on(
                table.symbol,
            ),
            unitNameUnique: uniqueIndex("unit_name_unique").on(table.name),
        };
    },
);
export type UnitOfMeasurementSchemaT = typeof unitOfMeasurement.$inferSelect;
export type InsertUnitOfMeasurementSchemaT =
    typeof unitOfMeasurement.$inferInsert;

export type UnitOfMeasurementFamilyType =
    (typeof unitOfMeasurementFamilyEnum.enumValues)[number];
