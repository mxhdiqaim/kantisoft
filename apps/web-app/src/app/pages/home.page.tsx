import { PageSpinner } from "@/shared/components";
import { appRoutes } from "@/app/router";
import { useAuthStore } from "@/modules/iam/store";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserRoleEnum } from "@/modules/iam/types";

const HomePage = () => {
    const navigate = useNavigate();

    // Get the current user directly from Zustand
    const currentUser = useAuthStore((state) => state.user);

    useEffect(() => {
        if (currentUser) {
            const role = currentUser.role as UserRoleEnum;

            // Handle restricted roles to prevent redirection to a data-heavy dashboard.
            // With the new hierarchy, Cashiers and Guests go straight to the POS.
            if (role === UserRoleEnum.GUEST || role === UserRoleEnum.CASHIER) {
                navigate("/pos-sale/pos", { replace: true });
                return;
            }

            // Find the first accessible, non-hidden, primary route for the user's role.
            const destinationRoute = appRoutes.find(
                (route) =>
                    !route.hidden &&
                    route.icon && // A good indicator of a primary navigation item
                    route.roles?.includes(role),
            );

            if (destinationRoute) {
                // If a suitable page is found, redirect the user there.
                navigate(destinationRoute.to, { replace: true });
            } else {
                // As a fallback, send them to their profile page.
                navigate("/admin/users/profile", { replace: true });
            }
        } else {
            // If there's no authenticated user, they must log in.
            navigate("/login", { replace: true });
        }
    }, [currentUser, navigate]);

    // Render a loading spinner to provide feedback while the redirection logic runs.
    return <PageSpinner />;
};

export default HomePage;
