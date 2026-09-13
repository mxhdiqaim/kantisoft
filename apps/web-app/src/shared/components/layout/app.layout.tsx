import { type FC, type ReactNode, useState } from "react";
import { Box, useTheme } from "@mui/material";
import AppbarComponent from "./appbar.layout.tsx";
import SidebarLayout from "./sidebar.layout.tsx";
import { useScreenSize } from "@/shared/hooks";
import CustomDrawer from "@/components/customs/custom-drawer.tsx";
import OfflineBanner from "@/components/feedback/offline-banner.tsx";

const AppLayout: FC<{ children: ReactNode }> = ({ children }) => {
    const screenSize = useScreenSize();
    const theme = useTheme();
    const [drawerState, setDrawerState] = useState(false);

    const showDrawer = screenSize === "mobile" || screenSize === "tablet";

    const toggleDrawer = (open: boolean) => {
        setDrawerState(open);
    };

    return (
        <Box sx={{ display: "flex", flexDirection: "row" }}>
            {/* Sidebar */}
            {showDrawer ? (
                <CustomDrawer
                    anchor="left"
                    open={drawerState}
                    onClose={() => toggleDrawer(false)}
                    onOpen={() => toggleDrawer(true)}
                >
                    <SidebarLayout {...{ toggleDrawer, drawerState }} />
                </CustomDrawer>
            ) : (
                <SidebarLayout />
            )}

            {/* Main content area */}
            <Box sx={{ flexGrow: 1 }}>
                <OfflineBanner />
                <AppbarComponent {...{ toggleDrawer, drawerState }} />

                {/* Main content */}
                <Box
                    component="main"
                    sx={{
                        flexGrow: 1,
                        p: 2,
                        maxWidth: { xs: "100vw", md: `calc(100vw - ${theme.layout.sidebarWidth}px) !important` },
                    }}
                >
                    {children}
                </Box>
            </Box>
        </Box>
    );
};

export default AppLayout;
