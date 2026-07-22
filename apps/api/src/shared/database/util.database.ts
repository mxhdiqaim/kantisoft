import { eq, sql } from "drizzle-orm";
import { PgTable, AnyPgColumn } from "drizzle-orm/pg-core";
import db from "./index";
import { NotFoundError } from "../errors/custom.error";

export type InferSelect<T extends PgTable> = T["$inferSelect"];

type TableWithId = PgTable & Record<"id", AnyPgColumn>;

export const getById = async <T extends TableWithId>(
    id: string,
    table: T,
): Promise<InferSelect<T> | null> => {
    if (!table.id) {
        throw new Error(
            "Execution failed: Table does not have a standard 'id' column definition.",
        );
    }

    const [result] = await db
        .select()
        .from(table as PgTable)
        .where(eq(table.id, id))
        .limit(1);

    return (result as InferSelect<T>) || null;
};

export const getOrError = async <T extends TableWithId>(
    id: string,
    table: T,
    errorMessage = "The requested resource could not be found.",
): Promise<InferSelect<T>> => {
    const record = await getById(id, table);
    if (!record) {
        throw new NotFoundError(errorMessage);
    }
    return record;
};

export const getAll = async <T extends PgTable>(
    table: T,
): Promise<InferSelect<T>[]> => {
    const result = await db.select().from(table as PgTable);
    return result as InferSelect<T>[];
};

export const getAllPaginated = async <T extends PgTable>(
    table: T,
    page = 1,
    pageSize = 10,
): Promise<{
    data: InferSelect<T>[];
    total: number;
    page: number;
    pageSize: number;
}> => {
    const sanitizedPage = Math.max(1, page);
    const sanitizedPageSize = Math.max(1, pageSize);
    const offset = (sanitizedPage - 1) * sanitizedPageSize;

    const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(table as PgTable);

    const total = Number(countResult?.count || 0);

    const data = await db
        .select()
        .from(table as PgTable)
        .limit(sanitizedPageSize)
        .offset(offset);

    return {
        data: data as InferSelect<T>[],
        total,
        page: sanitizedPage,
        pageSize: sanitizedPageSize,
    };
};

export const deleteById = async <T extends TableWithId>(
    id: string,
    table: T,
): Promise<InferSelect<T> | null> => {
    if (!table.id) {
        throw new Error(
            "Execution failed: Table does not have a standard 'id' column definition.",
        );
    }

    const result = await db.delete(table).where(eq(table.id, id)).returning();
    return (result[0] as InferSelect<T>) || null;
};

export const deleteOrError = async <T extends TableWithId>(
    id: string,
    table: T,
    errorMessage = "Failed to delete: The target resource does not exist.",
): Promise<InferSelect<T>> => {
    const deletedRecord = await deleteById(id, table);
    if (!deletedRecord) {
        throw new NotFoundError(errorMessage);
    }
    return deletedRecord;
};
