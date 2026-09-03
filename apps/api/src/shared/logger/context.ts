import { AsyncLocalStorage } from "async_hooks";

export interface RequestContext {
    requestId: string;
    businessId?: string;
    branchId?: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();
