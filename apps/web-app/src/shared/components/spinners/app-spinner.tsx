import { Box, Skeleton, useTheme } from "@mui/material";

const AppSpinner = () => {
    const theme = useTheme();
    const sidebarWidth = theme.layout.sidebarWidth; // A standard sidebar width
    const appBarHeight = theme.layout.appBarHeight; // Height of the app bar

    return (
        <Box sx={{ display: "flex", overflow: "hidden", mt: 4, mr: 4, ml: 4 }}>
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    width: `calc(100% - ${sidebarWidth}px)`,
                    bgcolor: "background.default",
                }}
            >
                {/* Top App Bar Skeleton */}
                <Skeleton
                    variant="rectangular"
                    height={`calc(100vh - ${appBarHeight}px)`}
                    animation="wave"
                    sx={{ borderRadius: 1 }}
                />
            </Box>
        </Box>
    );
};

export default AppSpinner;
