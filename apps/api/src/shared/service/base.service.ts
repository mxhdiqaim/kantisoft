import { eq, sql, and, SQL } from "drizzle-orm";
import { PgTable, AnyPgColumn } from "drizzle-orm/pg-core";
import db from "../database";
import { NotFoundError } from "../errors/custom.error";
import { requestContext } from "../logger/context";

export type InferSelect<T extends PgTable> = T["$inferSelect"];

export abstract class BaseService<T extends PgTable> {
    constructor(private readonly table: T) {}

    private getContextConditions(): SQL[] {
        const context = requestContext.getStore();
        const conditions: SQL[] = [];

        const columns = this.table as unknown as Record<string, AnyPgColumn>;

        if (columns.tenantId && context?.tenantId) {
            conditions.push(eq(columns.tenantId, context.tenantId));
        }

        if (columns.locationId && context?.locationId) {
            conditions.push(eq(columns.locationId, context.locationId));
        }

        return conditions;
    }

    protected async getAll(customWhere?: SQL) {
        const contextConditions = this.getContextConditions();

        const conditionsToApply = [...contextConditions];
        if (customWhere) conditionsToApply.push(customWhere);

        const finalCondition = conditionsToApply.length > 0 ? and(...conditionsToApply) : undefined;

        const result = await db
            .select()
            .from(this.table as PgTable)
            .where(finalCondition);

        return result as InferSelect<T>[];
    }

    protected async getAllPaginated(page = 1, pageSize = 10, customWhere?: SQL) {
        const sanitizedPage = Math.max(1, page);
        const sanitizedPageSize = Math.max(1, pageSize);
        const offset = (sanitizedPage - 1) * sanitizedPageSize;

        const contextConditions = this.getContextConditions();
        const conditionsToApply = [...contextConditions];
        if (customWhere) conditionsToApply.push(customWhere);

        const finalCondition = conditionsToApply.length > 0 ? and(...conditionsToApply) : undefined;

        const [countResult] = await db
            .select({ count: sql<number>`count(*)` })
            .from(this.table as PgTable)
            .where(finalCondition);

        const total = Number(countResult?.count || 0);

        const data = await db
            .select()
            .from(this.table as PgTable)
            .where(finalCondition)
            .limit(sanitizedPageSize)
            .offset(offset);

        return {
            data: data as InferSelect<T>[],
            total,
            page: sanitizedPage,
            pageSize: sanitizedPageSize,
        };
    }

    protected async getById(id: string) {
        const columns = this.table as unknown as Record<string, AnyPgColumn>;

        if (!columns.id) {
            throw new Error(`Execution failed: Table ${this.table._.name} does not have an 'id' column.`);
        }

        const conditions = [eq(columns.id, id), ...this.getContextConditions()];

        const [result] = await db
            .select()
            .from(this.table as PgTable)
            .where(and(...conditions))
            .limit(1);

        return (result as InferSelect<T>) || null;
    }

    protected async getOrError(id: string, errorMessage = "The requested resource could not be found.") {
        const record = await this.getById(id);
        if (!record) {
            throw new NotFoundError(errorMessage);
        }
        return record;
    }

    protected async deleteById(id: string) {
        const columns = this.table as unknown as Record<string, AnyPgColumn>;

        if (!columns.id) {
            throw new Error(`Execution failed: Table ${this.table._.name} does not have an 'id' column.`);
        }

        const conditions = [eq(columns.id, id), ...this.getContextConditions()];

        const result = await db
            .delete(this.table)
            .where(and(...conditions))
            .returning();

        return (result[0] as InferSelect<T>) || null;
    }
}
