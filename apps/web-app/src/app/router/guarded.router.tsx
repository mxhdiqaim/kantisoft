import { PageSpinner } from "@/shared/components";
import { useAuthStatus } from "@/shared/hooks";
import type { UserRole } from "@/modules/iam/types";
import { memo, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ServerDownPage } from "@/pages/feedbacks";
import { useAuth } from "@clerk/react";

type Props = {
    authGuard: boolean;
    children: ReactNode;
    roles?: UserRole[];
};

// eslint-disable-next-line react/display-name
const GuardedRoute = memo(({ children, authGuard }: Props) => {
    const { isLoading, isAuthenticated, isServerOk } = useAuthStatus();
    const { isSignedIn } = useAuth();
    const location = useLocation();

    console.log({ isLoading, authGuard, isSignedIn, isAuthenticated });

    // Freeze the UI if Clerk is signed in, but the backend profile hasn't synced yet
    if (isLoading || (authGuard && isSignedIn && !isAuthenticated)) {
        return <PageSpinner />;
    }

    // Show server down page if the server isn't responding
    if (!isServerOk) {
        return <ServerDownPage />;
    }

    // Only redirect to log in if BOTH Clerk and the backend agree you are logged out.
    if (authGuard && !isAuthenticated && !isSignedIn) {
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
