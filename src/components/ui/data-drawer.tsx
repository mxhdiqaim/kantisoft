import type {ReactNode} from "react";
import {Box, Grid, IconButton, type SxProps, type Theme, Typography} from "@mui/material";
import CustomDrawer from "@/components/ui/custom-drawer";
import type {DrawerAnchor} from "@/types";
import ApiErrorDisplay from "@/components/feedback/api-error-display.tsx";
import {type ApiError, getApiError} from "@/helpers/get-api-error.ts";
import useNotifier from "@/hooks/useNotifier.ts";

import Icon from "@/components/ui/icon.tsx";
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
    apiError?: ApiError;
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
                        apiError
                    }: Props) => {
    const notify = useNotifier();

    if (error) {
        const apiError = getApiError(error, "Failed to load raw material data.");
        notify(apiError.message, "error");
    }

    return (
        <CustomDrawer
            {...{open, onClose, onOpen, anchor}}
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
                <Grid size={3} sx={{display: "flex", justifyContent: "flex-end"}}>
                    <IconButton onClick={onClose}>
                        <Icon src={CancelSvgIcon} alt={"Cancel Icon"} sx={{width: 24, height: 24}}/>
                    </IconButton>
                </Grid>
            </Grid>
            {error ? (
                <ApiErrorDisplay statusCode={apiError?.type} message={apiError?.message}/>
            ) : (
                <Box>{children}</Box>
            )}
        </CustomDrawer>
    );
};

export default DataDrawer;
