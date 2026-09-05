import { InsertBranchSchemaT } from "../schema";

export type CreateBranchDTO = Omit<InsertBranchSchemaT, "id" | "businessId" | "createdAt" | "updateAt">;
