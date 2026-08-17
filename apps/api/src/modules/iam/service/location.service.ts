import { eq } from "drizzle-orm";
import { BaseService } from "../../../shared/service";
import { db } from "../../../shared/database";
import { InsertLocationSchemaT, locationSchema } from "../schema";

class LocationService extends BaseService<typeof locationSchema> {
    constructor() {
        super(locationSchema);
    }

    public async createLocation(data: Omit<InsertLocationSchemaT, "tenantId">, tenantId: string) {
        const [newLocation] = await db
            .insert(locationSchema)
            .values({
                ...data,
                tenantId,
            })
            .returning();

        return newLocation;
    }

    public async listLocations() {
        return this.getAll();
    }

    public async getLocationDetails(locationId: string) {
        return this.getByIdOrError(locationId, "Location not found.");
    }

    public async updateLocationDetails(
        locationId: string,
        updateData: Partial<Omit<InsertLocationSchemaT, "id" | "tenantId">>,
    ) {
        return this.updateByQuery(eq(locationSchema.id, locationId), updateData);
    }
}

export default new LocationService();
