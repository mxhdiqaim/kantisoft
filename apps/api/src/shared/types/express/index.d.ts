import { ReqQueryOptions } from "../../interface";
import { InsertLocationSchemaT, InsertBusinessSchemaT, InsertUserSchemaT } from "../../../modules";

declare module "express" {
    export interface Request {
        queryOpts?: ReqQueryOptions;
        user?: InsertUserSchemaT;
        business?: InsertBusinessSchemaT;
        location?: InsertLocationSchemaT;
    }
}
