import { ReqQueryOptions } from "../../interface";
import { InsertBranchSchemaT, InsertBusinessSchemaT, InsertUserSchemaT } from "../../../modules";

declare module "express" {
    export interface Request {
        queryOpts?: ReqQueryOptions;
        user?: InsertUserSchemaT;
        business?: InsertBusinessSchemaT;
        branch?: InsertBranchSchemaT;
    }
}
