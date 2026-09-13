import { appRoutes, type AppRouteType } from "@/app/router";
import { LogoutOutlined, StorefrontOutlined } from "@mui/icons-material";
import { type AppbarProps, useScreenSize } from "@/shared";
import ExpandLessOutlinedIcon from "@mui/icons-material/ExpandLessOutlined";
import ExpandMoreOutlinedIcon from "@mui/icons-material/ExpandMoreOutlined";
import {
    Box,
    CircularProgress,
    Collapse,
    Drawer,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    type SxProps,
    type Theme,
    useTheme,
} from "@mui/material";
import { useState, type FC, Fragment, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { IconUtil, CustomButton } from "@/shared";
import CancelSvgIcon from "@/assets/icons/cancel.svg";
import CollapseSvgIcon from "@/assets/icons/collapse.svg";
import { UserRoleEnum } from "@/modules/iam/types";
import { useAuthStore } from "@/modules/iam/store/auth.store";
import { useClerk } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";

interface Props extends AppbarProps {
    sx?: SxProps<Theme>;
    showDrawer?: boolean;
}

const SidebarLayout: FC<Props> = ({ sx, drawerState, toggleDrawer, showDrawer }) => {
    const { t } = useTranslation();
    const theme = useTheme();
    const screenSize = useScreenSize();
    const location = useLocation();
    const navigate = useNavigate();

    // Zustand & Clerk Hooks
    const currentUser = useAuthStore((state) => state.user);
    const logOut = useAuthStore((state) => state.logOut);

    const { signOut } = useClerk();
    const queryClient = useQueryClient();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = async () => {
        try {
            setIsLoggingOut(true);
            await signOut();
            logOut();
            queryClient.clear();
            navigate("/signin");
        } catch (error) {
            console.error("Signout failed:", error);
        } finally {
            setIsLoggingOut(false);
        }
    };

    const [expandedItems, setExpandedItems] = useState<Record<number, string>>({});

    const handleItemClick = (route: AppRouteType, level: number) => {
        if (showDrawer) return;

        if (route.children) {
            setExpandedItems((prev) => {
                if (prev[level] === route.to) {
                    const newState = { ...prev };
                    Object.keys(newState).forEach((key) => {
                        if (Number(key) >= level) delete newState[Number(key)];
                    });
                    return newState;
                }
                const newState = { ...prev, [level]: route.to };
                Object.keys(newState).forEach((key) => {
                    if (Number(key) > level) delete newState[Number(key)];
                });
                return newState;
            });
        } else if (toggleDrawer && (screenSize === "mobile" || screenSize === "tablet")) {
            toggleDrawer(false);
        }
    };

    const filterRoutes = (routes: AppRouteType[]): AppRouteType[] => {
        return routes
            .filter((route) => {
                if (route.hidden || !(route.authGuard ?? true) || !(route.useLayout ?? true)) {
                    return false;
                }
                if (route.roles && currentUser) {
                    return route.roles.includes(currentUser.role as UserRoleEnum);
                }
                return true;
            })
            .map((route) => {
                if (route.children) {
                    return { ...route, children: filterRoutes(route.children) };
                }
                return route;
            });
    };

    const renderMenuItem = (route: AppRouteType, index: number, level: number = 0, parentPath: string = "") => {
        const fullPath = (parentPath + "/" + route.to).replace(/\/+/g, "/");
        const isActive = location.pathname.startsWith(fullPath);
        const isSelected = location.pathname === fullPath;
        const isExpanded = expandedItems[level] === route.to;
        const hasChildren = route.children && route.children.length > 0;
        const linkProps = !hasChildren ? { component: Link, to: fullPath } : {};

        return (
            <Fragment key={index}>
                <ListItem disablePadding sx={{ px: 2, py: 0.5 }}>
                    <ListItemButton
                        selected={isSelected}
                        onClick={() => handleItemClick(route, level)}
                        {...linkProps}
                        sx={{
                            borderRadius: level > 0 ? 2 : theme.borderRadius.small,
                            height: level > 0 ? 38 : "auto",
                            py: 1,
                            px: 2,
                            color: theme.palette.text.secondary,
                            transition: theme.transitions.create(["background-color", "color"], {
                                duration: theme.transitions.duration.short,
                            }),
                            ...(isExpanded && {
                                color: theme.palette.text.primary,
                                border: `0.5px solid ${theme.palette.alternate.dark}`,
                                backgroundColor: theme.palette.background.default,
                            }),
                            "&.Mui-selected": {
                                color: theme.palette.primary.main,
                                backgroundColor: theme.palette.action.selected,
                                fontWeight: "fontWeightBold",
                                "&:hover": {
                                    backgroundColor: theme.palette.action.hover,
                                },
                            },
                            "&:hover": {
                                backgroundColor: theme.palette.action.hover,
                                color: isActive ? theme.palette.primary.main : theme.palette.text.primary,
                            },
                        }}
                    >
                        {route?.icon && (
                            <ListItemIcon sx={{ minWidth: 40, color: "inherit" }}>{route.icon}</ListItemIcon>
                        )}
                        <ListItemText
                            primary={t(route.title as string)}
                            slotProps={{
                                primary: {
                                    variant: "body2",
                                    sx: {
                                        color: isSelected ? theme.palette.text.primary : "inherit",
                                    },
                                },
                            }}
                        />
                        {hasChildren && (
                            <Box
                                component={isExpanded ? ExpandLessOutlinedIcon : ExpandMoreOutlinedIcon}
                                sx={{ fontSize: 20 }}
                            />
                        )}
                    </ListItemButton>
                </ListItem>

                {hasChildren && (
                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <List component="div" disablePadding>
                            {route.children?.map((childRoute, childIndex) =>
                                renderMenuItem(childRoute, childIndex, level + 1, fullPath + "/"),
                            )}
                        </List>
                    </Collapse>
                )}
            </Fragment>
        );
    };

    useEffect(() => {
        const newExpanded: Record<number, string> = {};
        const findActivePaths = (routes: AppRouteType[], currentLevel: number) => {
            for (const route of routes) {
                const isParentOfCurrent = location.pathname.includes(route.to);
                if (isParentOfCurrent && route.children) {
                    newExpanded[currentLevel] = route.to;
                    findActivePaths(route.children, currentLevel + 1);
                }
            }
        };

        findActivePaths(appRoutes, 0);
        setExpandedItems(newExpanded);
    }, [location.pathname]);

    return (
        <Drawer
            variant="permanent"
            sx={{
                width: { xs: "100vw", md: `${theme.layout.sidebarWidth}px` },
                flexShrink: 0,
                "& .MuiDrawer-paper": {
                    width: { xs: "100vw", md: `${theme.layout.sidebarWidth}px` },
                    boxSizing: "border-box",
                },
                background: theme.palette.background.default,
                position: { xs: "absolute", md: "relative" },
                zIndex: 10,
                ...sx,
            }}
        >
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "90%",
                    py: 2,
                    mx: "auto",
                    height: theme.layout.appBarHeight,
                    borderBottom: "1px solid #CFD1D3",
                }}
            >
                {/*
                  Simplified Header! We no longer fetch or map businesses.
                  Just show "Workspace" or optionally the user's role to confirm login state.
                */}
                <CustomButton
                    startIcon={<StorefrontOutlined sx={{ mr: 1 }} />}
                    title={
                        currentUser
                            ? `${currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)} Workspace`
                            : "Workspace"
                    }
                    sx={{
                        borderRadius: 1,
                        color: "text.primary",
                        textTransform: "none",
                        cursor: "default",
                        pointerEvents: "none", // Disabled interactions for now
                    }}
                />

                {screenSize === "mobile" || screenSize === "tablet" ? (
                    <IconButton
                        aria-label="menu"
                        sx={{ borderRadius: 1 }}
                        onClick={() => toggleDrawer && toggleDrawer(!drawerState)}
                    >
                        <IconUtil src={CancelSvgIcon} alt={"Cancel Icon"} />
                    </IconButton>
                ) : (
                    <IconButton aria-label="menu" sx={{ borderRadius: 1 }}>
                        <IconUtil src={CollapseSvgIcon} alt={"Collapse Icon"} />
                    </IconButton>
                )}
            </Box>

            <List sx={{ height: "100%", display: "flex", flexDirection: "column", overflowY: "auto" }}>
                <Box sx={{ flexGrow: 1, overflowY: "auto" }}>
                    {filterRoutes(appRoutes).map((route, index) => renderMenuItem(route, index))}
                </Box>
            </List>

            <Box position={"absolute"} bottom={0} width={"100%"} p={2}>
                <CustomButton
                    title={isLoggingOut ? "Logging out..." : t("Logout")}
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    variant="contained"
                    startIcon={isLoggingOut ? <CircularProgress size={20} color="inherit" /> : <LogoutOutlined />}
                    sx={{
                        width: "100%",
                        backgroundColor: theme.palette.error.main,
                        color: theme.palette.error.contrastText,
                        justifyContent: "flex-start",
                        py: 1.5,
                        px: 2,
                        boxShadow: theme.customShadows.button,
                        transition: theme.transitions.create(["background-color", "transform"], {
                            duration: theme.transitions.duration.short,
                        }),
                        "&:hover": {
                            backgroundColor: theme.palette.error.dark,
                            transform: "scale(1.02)",
                        },
                    }}
                />
            </Box>
        </Drawer>
    );
};

export default SidebarLayout;
