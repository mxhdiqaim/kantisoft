import { AsyncLocalStorage } from "async_hooks";

export interface RequestContext {
    requestId: string;
    businessId?: string;
    locationId?: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();
