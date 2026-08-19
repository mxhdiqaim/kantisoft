import { ReqQueryOptions } from "../../interface";
import { InsertLocationSchemaT, InsertTenantSchemaT, InsertUserSchemaT } from "../../../modules";

declare module "express" {
    export interface Request {
        queryOpts?: ReqQueryOptions;
        user?: InsertUserSchemaT;
        tenant?: InsertTenantSchemaT;
        location?: InsertLocationSchemaT;
    }
}
