import { AsyncLocalStorage } from "async_hooks";

export interface RequestContext {
    requestId: string;
    tenantId?: string;
    locationId?: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();
