import type { ReactNode } from "react";
import { Box, Grid, IconButton, type SxProps, type Theme, Typography } from "@mui/material";
import CustomDrawer from "@/shared/components/ui/custom-drawer.tsx";
import type { DrawerAnchor } from "@/shared/types";
import ApiErrorDisplay from "@/components/feedback/api-error-display.tsx";
import { parseApiErrorUtil } from "@/shared/utils/parse-api-error.util.ts";
import { useNotification } from "@/shared";

import Icon from "@/shared/components/ui/icon.tsx";
import CancelSvgIcon from "@/assets/icons/cancel.svg";

interface Props {
    title: string;
    children: ReactNode;
    onClose: () => void;
    onOpen: () => void;
    open: boolean;
    anchor?: DrawerAnchor;
    sx?: SxProps<Theme>;
    PaperProps?: SxProps<Theme>;
    error?: unknown;
    apiError?: { message: string; status?: number };
}

const DataDrawer = ({
    title,
    onClose,
    children,
    open,
    onOpen,
    anchor = "right",
    sx,
    PaperProps,
    error,
    apiError,
}: Props) => {
    const { error: errorMessage } = useNotification();

    if (error) {
        const apiError = parseApiErrorUtil(error, "Failed to load raw material data.");
        errorMessage(apiError.message);
    }

    return (
        <CustomDrawer
            {...{ open, onClose, onOpen, anchor }}
            PaperProps={{
                sx: {
                    transition: (theme) =>
                        theme.transitions.create("right", {
                            easing: theme.transitions.easing.sharp,
                            duration: theme.transitions.duration.enteringScreen,
                        }),
                    ...PaperProps,
                },
            }}
            sx={sx}
        >
            <Grid container spacing={2} alignItems="center">
                <Grid size={9}>
                    <Typography variant="h5" component="h2">
                        {title}
                    </Typography>
                </Grid>
                <Grid size={3} sx={{ display: "flex", justifyContent: "flex-end" }}>
                    <IconButton onClick={onClose}>
                        <Icon src={CancelSvgIcon} alt={"Cancel Icon"} sx={{ width: 24, height: 24 }} />
                    </IconButton>
                </Grid>
            </Grid>
            {error ? (
                <ApiErrorDisplay statusCode={apiError?.status} message={apiError?.message} />
            ) : (
                <Box>{children}</Box>
            )}
        </CustomDrawer>
    );
};

export default DataDrawer;
