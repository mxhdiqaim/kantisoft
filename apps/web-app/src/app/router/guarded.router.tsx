import { PageSpinner } from "@/shared/components";
import { useAuthStatus } from "@/shared/hooks";
import type { UserRole } from "@/modules/iam/types";
import { memo, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ServerDownPage } from "@/pages/feedbacks";

type Props = {
    authGuard: boolean;
    children: ReactNode;
    roles?: UserRole[];
};

// This is your GuardedRoute component that checks authentication status
const GuardedRoute = memo(function GuardedRoute({ children, authGuard }: Props) {
    const { isLoading, isAuthenticated, isServerOk } = useAuthStatus();
    const location = useLocation();

    // Show loading spinner if still checking status
    if (isLoading) return <PageSpinner />;

    // Show server down page if the server isn't responding
    if (!isServerOk) return <ServerDownPage />;

    // If route requires auth and user is NOT authenticated, redirect to sign in page
    if (authGuard && !isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // If route requires auth and user is authenticated, show the page
    if (authGuard && isAuthenticated) {
        return <>{children}</>;
    }

    // If no authentication is required, just render the children
    return <>{children}</>;
});

export default GuardedRoute;
