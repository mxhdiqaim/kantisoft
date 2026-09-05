import { ReqQueryOptions } from "../../interface";

declare module "express" {
    export interface Request {
        queryOpts?: ReqQueryOptions;
    }
}
