import { pgTable, uuid, primaryKey } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { userSchema } from "./user.schema";
import { locationSchema } from "./location.schema";

// Junction Table for User <-> Location mapping
export const userLocationsSchema = pgTable(
    "user_locations",
    {
        userId: uuid("user_id")
            .references(() => userSchema.id, { onDelete: "cascade" })
            .notNull(),
        locationId: uuid("location_id")
            .references(() => locationSchema.id, { onDelete: "cascade" })
            .notNull(),
    },
    (t) => ({
        // Prevents assigning the same user to the exact same location twice
        pk: primaryKey({ columns: [t.userId, t.locationId] }),
    }),
);

export type InsertUserLocationSchemaT = typeof userLocationsSchema.$inferInsert;

export const userLocationSchemaRelations = relations(userLocationsSchema, ({ one }) => ({
    user: one(userSchema, {
        fields: [userLocationsSchema.userId],
        references: [userSchema.id],
    }),
    location: one(locationSchema, {
        fields: [userLocationsSchema.locationId],
        references: [locationSchema.id],
    }),
}));
