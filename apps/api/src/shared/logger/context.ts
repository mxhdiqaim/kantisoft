import { AsyncLocalStorage } from "async_hooks";
import { UserRoleEnum } from "../../modules/iam/interface";

export interface RequestContext {
    requestId: string;
    userId: string;
    role: UserRoleEnum;
    businessId?: string;
    branchId?: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();
