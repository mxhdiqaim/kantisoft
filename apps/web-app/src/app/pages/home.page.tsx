import { PageSpinner } from "@/shared/components";
import { appRoutes } from "@/app/router";
import { useAuthStore } from "@/modules/iam/store";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserRoleEnum } from "@/modules/iam/types";

const HomePage = () => {
    const navigate = useNavigate();
    const currentUser = useAuthStore((state) => state.user);

    useEffect(() => {
        if (!currentUser?.role) return;

        const role = currentUser.role as UserRoleEnum;

        // OWNER without business ID
        if (role === UserRoleEnum.OWNER && !currentUser.businessId) {
            navigate("/onboarding", { replace: true });
            return;
        }

        // STAFF/CASHIER/GUEST
        if ([UserRoleEnum.STAFF, UserRoleEnum.CASHIER, UserRoleEnum.GUEST].includes(role)) {
            navigate("/pos-sale/pos", { replace: true });
            return;
        }

        // Normal routing
        const destinationRoute = appRoutes.find((route) => !route.hidden && route.icon && route.roles?.includes(role));

        if (destinationRoute) {
            navigate(destinationRoute.to, { replace: true });
        } else {
            navigate("/admin/users/profile", { replace: true });
        }
    }, [currentUser, navigate]);

    // Render a loading spinner to provide feedback while the redirection logic runs.
    return <PageSpinner />;
};

export default HomePage;
