import {appRoutes} from "@/routes";
import type {UserType} from "@/types/user-types";
import {useEffect} from "react";
import {useLocation, useNavigate} from "react-router-dom";

interface Props {
    currentUser: UserType;
}

const AuthGuard = ({currentUser}: Props) => {
    const navigate = useNavigate();
    const location = useLocation();

    const publicAuthRoutes = ["/login", "/register", "/forget-password"];

    useEffect(() => {
        // If logged in and on public page, redirect to dashboard
        if (currentUser && publicAuthRoutes.includes(location.pathname)) {
            navigate("/dashboard", { replace: true });
        }

        // If NOT logged in and on a protected route, redirect to log in
        // We find the route by matching the path
        const isProtectedRoute = appRoutes.some((route) => route.to === location.pathname && route.authGuard !== false);

        if (isProtectedRoute && !currentUser) {
            navigate("/login", {
                replace: true,
                state: { from: location },
            });
        }
    }, [currentUser, location.pathname, navigate]);

    return null;
};

export default AuthGuard;