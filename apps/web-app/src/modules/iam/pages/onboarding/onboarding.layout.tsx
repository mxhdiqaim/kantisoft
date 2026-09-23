import { Box, useTheme } from "@mui/material";
import { Outlet, useLocation, Navigate } from "react-router-dom";
import { useAuthStore } from "@/modules/iam/store";

const OnboardingLayout = () => {
    const theme = useTheme();
    const location = useLocation();

    const currentUser = useAuthStore((state) => state.user);

    // Auto-route to the correct step based on user state
    if (location.pathname === "/onboarding" || location.pathname === "/onboarding/") {
        if (!currentUser?.businessId) {
            return <Navigate to="/onboarding/create-business" replace />;
        }

        if (!currentUser?.branchId) {
            return <Navigate to="/onboarding/create-branch" replace />;
        }

        // If they have both but somehow land here, send them to invite users
        return <Navigate to="/onboarding/invite-users" replace />;
    }

    return (
        <Box
            sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "100vh",
                bgcolor: theme.palette.background.default,
                position: "relative",
            }}
        >
            <Box
                sx={{
                    width: "100%",
                    maxWidth: 550,
                    p: 4,
                    bgcolor: "background.paper",
                    borderRadius: 2,
                    boxShadow: theme.customShadows?.card || 1,
                }}
            >
                {/* This renders CreateBusinessStep, CreateBranchStep, or InviteUsersStep */}
                <Outlet />
            </Box>
        </Box>
    );
};

export default OnboardingLayout;
