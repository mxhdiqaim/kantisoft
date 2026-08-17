import { eq, sql, and, SQL } from "drizzle-orm";
import { PgTable, AnyPgColumn } from "drizzle-orm/pg-core";
import { db } from "../database";
import { NotFoundError } from "../errors/custom.error";
import { requestContext } from "../logger/context";

export type InferSelect<T extends PgTable> = T["$inferSelect"];
export type InferInsert<T extends PgTable> = T["$inferInsert"];

// Defines the transaction client.
export type DbTx = typeof db;
export type RowLock = "update" | "share" | "no key update" | "key share";

export abstract class BaseService<T extends PgTable> {
    protected constructor(private readonly table: T) {}

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

    // Helper to safely merge custom conditions with tenant isolation conditions.
    private buildWhere(customWhere?: SQL): SQL | undefined {
        const contextConditions = this.getContextConditions();
        const conditionsToApply = [...contextConditions];

        if (customWhere) conditionsToApply.push(customWhere);

        return conditionsToApply.length > 0 ? and(...conditionsToApply) : undefined;
    }

    protected async getAll(customWhere?: SQL, tx?: DbTx, lock?: RowLock): Promise<InferSelect<T>[]> {
        const executor = tx || db;
        const finalCondition = this.buildWhere(customWhere);

        // We use type assertion ('any') on the query builder here because Drizzle's
        // dynamic locking method (.for) causes complex generic inference errors
        let query = (await executor
            .select()
            .from(this.table as PgTable)
            .where(finalCondition)) as unknown as {
            for: (lock: RowLock) => Promise<InferSelect<T>[]>;
        } & Promise<InferSelect<T>[]>;

        if (lock) {
            query = query.for(lock) as unknown as typeof query;
        }

        return query;
    }

    protected async getAllPaginated(page = 1, pageSize = 10, customWhere?: SQL, tx?: DbTx) {
        const executor = tx || db;
        const sanitizedPage = Math.max(1, page);
        const sanitizedPageSize = Math.max(1, pageSize);
        const offset = (sanitizedPage - 1) * sanitizedPageSize;

        const finalCondition = this.buildWhere(customWhere);

        const [countResult] = await executor
            .select({ count: sql<number>`count(*)` })
            .from(this.table as PgTable)
            .where(finalCondition);

        const total = Number(countResult?.count || 0);

        const data = await executor
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

    protected async count(customWhere?: SQL, tx?: DbTx): Promise<number> {
        const executor = tx || db;
        const finalCondition = this.buildWhere(customWhere);

        const [result] = await executor
            .select({ count: sql<number>`count(*)` })
            .from(this.table as PgTable)
            .where(finalCondition);

        return Number(result?.count || 0);
    }

    protected async get(whereClause: SQL, tx?: DbTx, lock?: RowLock): Promise<InferSelect<T> | null> {
        const executor = tx || db;
        const finalCondition = this.buildWhere(whereClause);

        let query = (await executor
            .select()
            .from(this.table as PgTable)
            .where(finalCondition)
            .limit(1)) as unknown as {
            for: (lock: RowLock) => Promise<InferSelect<T>[]>;
        } & Promise<InferSelect<T>[]>;

        if (lock) {
            query = query.for(lock) as unknown as typeof query;
        }

        const [result] = await query;
        return (result as InferSelect<T>) || null;
    }

    protected async getOrError(
        whereClause: SQL,
        errorMessage = "The requested resource could not be found.",
        tx?: DbTx,
        lock?: RowLock,
    ): Promise<InferSelect<T>> {
        const record = await this.get(whereClause, tx, lock);
        if (!record) throw new NotFoundError(errorMessage);
        return record;
    }

    protected async getById(id: string, tx?: DbTx, lock?: RowLock): Promise<InferSelect<T> | null> {
        const columns = this.table as unknown as Record<string, AnyPgColumn>;
        if (!columns.id) {
            throw new Error(`Table ${this.table._.name} does not have an 'id' column.`);
        }

        return this.get(eq(columns.id, id), tx, lock);
    }

    protected async getByIdOrError(
        id: string,
        errorMessage = "The requested resource could not be found.",
        tx?: DbTx,
        lock?: RowLock,
    ): Promise<InferSelect<T>> {
        const record = await this.getById(id, tx, lock);

        if (!record) {
            throw new NotFoundError(errorMessage);
        }

        return record;
    }

    protected async updateByQuery(
        customWhere: SQL,
        data: Partial<InferInsert<T>>,
        tx?: DbTx,
    ): Promise<InferSelect<T>[]> {
        const executor = tx || db;
        const finalCondition = this.buildWhere(customWhere);

        if (!finalCondition) {
            throw new Error("Updates require a where clause to prevent full table modification.");
        }

        const result = await executor
            .update(this.table as PgTable)
            .set(data)
            .where(finalCondition)
            .returning();

        return result as InferSelect<T>[];
    }

    protected async delete(customWhere: SQL, tx?: DbTx): Promise<InferSelect<T>[]> {
        const executor = tx || db;
        const finalCondition = this.buildWhere(customWhere);

        if (!finalCondition) {
            throw new Error("Deletions require a where clause to prevent full table drops.");
        }

        const result = await executor
            .delete(this.table as PgTable)
            .where(finalCondition)
            .returning();

        return result as InferSelect<T>[];
    }

    protected async deleteOrError(
        customWhere: SQL,
        errorMessage = "Failed to delete: The target resource does not exist.",
        tx?: DbTx,
    ): Promise<InferSelect<T>[]> {
        const deletedRecords = await this.delete(customWhere, tx);

        if (deletedRecords.length === 0) {
            throw new NotFoundError(errorMessage);
        }

        return deletedRecords;
    }

    protected async deleteById(id: string, tx?: DbTx): Promise<InferSelect<T> | null> {
        const columns = this.table as unknown as Record<string, AnyPgColumn>;

        if (!columns.id) {
            throw new Error(`Table ${this.table._.name} does not have an 'id' column.`);
        }

        const deletedRecords = await this.delete(eq(columns.id, id), tx);

        return deletedRecords[0] || null;
    }

    /**
     * Checks if a specific record exists based on a field value.
     * Useful for checking if an email, phone number, or SKU already exists.
     */
    protected async validateField(field: string, value: unknown, tx?: DbTx): Promise<boolean> {
        const columns = this.table as unknown as Record<string, AnyPgColumn>;
        const targetColumn = columns[field];

        if (!targetColumn) {
            throw new Error(`Column '${field}' does not exist on table ${this.table._.name}`);
        }

        const count = await this.count(eq(targetColumn, value), tx);
        return count > 0;
    }
}
