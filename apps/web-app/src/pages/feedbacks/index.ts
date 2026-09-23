import { lazy } from "react";

export const ErrorFallbackPage = lazy(() => import("./error-fallback.page"));
export const NotFoundPage = lazy(() => import("./not-found.page"));
export const ServerDownPage = lazy(() => import("./server-down.page"));
