import { LogoutOutlined, PersonOutline } from "@mui/icons-material";
import FullscreenExitOutlinedIcon from "@mui/icons-material/FullscreenExitOutlined";
import FullscreenOutlinedIcon from "@mui/icons-material/FullscreenOutlined";
import MenuOutlinedIcon from "@mui/icons-material/MenuOutlined";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import {
    alpha,
    AppBar,
    Avatar,
    Box,
    CircularProgress,
    Divider,
    IconButton,
    MenuItem,
    Toolbar,
    Tooltip,
    Typography,
    useTheme,
} from "@mui/material";
import { useState, type FC } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { findRouteByPath, CustomButton, useNotification, useFullscreen } from "@/shared";
import { appRoutes } from "@/app/router";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/modules";
import { useClerk } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";

export interface AppbarProps {
    toggleDrawer?: (open: boolean) => void;
    drawerState?: boolean;
}

const AppbarComponent: FC<AppbarProps> = ({ toggleDrawer, drawerState }) => {
    const theme = useTheme();
    const { t } = useTranslation();
    const { isFullscreen, toggleFullscreen } = useFullscreen();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const { success: successMessage } = useNotification();

    // Fetch user from Zustand instead of Redux
    const currentUser = useAuthStore((state) => state.user);
    const logOut = useAuthStore((state) => state.logOut);

    // Set up Clerk and TanStack tools
    const { signOut } = useClerk();
    const queryClient = useQueryClient();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const currentRoute = findRouteByPath(appRoutes, pathname);
    const pageTitle = currentRoute?.title || "Home";

    const handleLogout = async () => {
        try {
            setIsLoggingOut(true);

            // Tell Clerk to destroy the session cookie
            await signOut();

            // Clear Zustand local state
            logOut();

            // Clear all TanStack API cache
            queryClient.clear();

            navigate("/signin");
            successMessage("You have been logged out successfully.");
        } catch (error) {
            console.error("Signout failed:", error);
        } finally {
            setIsLoggingOut(false);
        }
    };

    return (
        <AppBar
            position="sticky"
            sx={{
                background: alpha(theme.palette.background.paper, 0.6),
                height: theme.layout.appBarHeight,
                boxShadow: "none",
                backdropFilter: "blur(8px)",
                borderBottom: `1px solid ${theme.palette.divider}`,
                width: { md: `calc(100% - ${theme.layout.sidebarWidth})` },
            }}
        >
            <Toolbar sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: "100%" }}>
                <Box
                    component={"span"}
                    sx={{ display: { xs: "flex", md: "none" }, alignItems: "center", justifyContent: "center" }}
                >
                    <IconButton
                        onClick={() => toggleDrawer && toggleDrawer(!drawerState)}
                        aria-label="menu"
                        sx={{ display: { xs: "block", md: "none" } }}
                    >
                        <MenuOutlinedIcon />
                    </IconButton>
                </Box>

                <Box sx={{ flexGrow: 1, display: { xs: "none", md: "inline" } }}>
                    <Typography variant="h5" color={"#353F46"} fontWeight={600}>
                        {t(pageTitle)}
                    </Typography>
                </Box>

                <Box sx={{ flexGrow: 1 }} />

                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <IconButton
                        aria-label="toggle fullscreen"
                        onClick={toggleFullscreen}
                        sx={{ background: theme.palette.background.default }}
                    >
                        {isFullscreen ? <FullscreenExitOutlinedIcon /> : <FullscreenOutlinedIcon />}
                    </IconButton>

                    <IconButton
                        aria-label="notifications"
                        sx={{ background: theme.palette.background.default }}
                        disabled={true}
                    >
                        <NotificationsNoneOutlinedIcon />
                    </IconButton>
                    <CustomButton
                        variant={"text"}
                        sx={{ color: theme.palette.text.primary }}
                        startIcon={
                            <Tooltip title="Account settings" placement={"top"}>
                                <Avatar sx={{ width: 36, height: 36, backgroundColor: "primary.main" }}>
                                    {currentUser?.firstName?.charAt(0).toUpperCase()}
                                </Avatar>
                            </Tooltip>
                        }
                    >
                        <MenuItem onClick={() => navigate("/admin/users/profile")} sx={{ mx: 1, borderRadius: 3 }}>
                            <PersonOutline sx={{ mr: 1 }} /> Profile
                        </MenuItem>
                        <Divider />
                        <MenuItem
                            onClick={handleLogout}
                            sx={{ color: "error.main", mx: 1, borderRadius: 3 }}
                            disabled={isLoggingOut}
                        >
                            {isLoggingOut ? (
                                <CircularProgress size={20} sx={{ mr: 1 }} color="inherit" />
                            ) : (
                                <LogoutOutlined sx={{ mr: 1 }} />
                            )}
                            {isLoggingOut ? "Logging out..." : "Logout"}
                        </MenuItem>
                    </CustomButton>
                </Box>
            </Toolbar>
        </AppBar>
    );
};

export default AppbarComponent;
