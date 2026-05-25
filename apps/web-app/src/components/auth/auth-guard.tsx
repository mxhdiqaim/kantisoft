import { appRoutes } from "@/routes";
import { type UserType } from "@/types/user-types";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

interface Props {
    currentUser: UserType | null;
}

const AuthGuard = ({ currentUser }: Props) => {
    const navigate = useNavigate();
    const location = useLocation();

    const publicAuthRoutes = ["/signin", "/signup", "/forget-password"];

    useEffect(() => {
        // If the user is logged in AND attempting to access a public auth page
        if (currentUser && publicAuthRoutes.includes(location.pathname)) {
            // Check if the user's role has explicit clearance for the dashboard
            const dashboardRoute = appRoutes.find((route) => route.to === "/dashboard");
            const hasDashboardAccess = dashboardRoute?.roles?.includes(currentUser.role);

            if (hasDashboardAccess) {
                navigate("/dashboard", { replace: true });
            } else {
                // Cashiers/Guests default to Home ("/") which safely figures out their landing view
                navigate("/", { replace: true });
            }
            return;
        }

        // If the user is NOT logged in and tries to access a protected route
        const isPublicRoute = publicAuthRoutes.includes(location.pathname);

        // If it's not a public auth route, and we have no user, redirect to login
        if (!isPublicRoute && !currentUser) {
            navigate("/signin", {
                replace: true,
                state: { from: location },
            });
        }
    }, [currentUser, location.pathname, navigate]);

    return null;
};

export default AuthGuard;
