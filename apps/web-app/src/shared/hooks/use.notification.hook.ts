import { useSnackbar, type VariantType } from "notistack";
import { useCallback } from "react";

export const useNotification = () => {
    const { enqueueSnackbar } = useSnackbar();

    const notify = useCallback(
        (message: string, variant: VariantType = "default") => {
            enqueueSnackbar(message, { variant });
        },
        [enqueueSnackbar],
    );

    // Return the base function but attach helper methods for cleaner code!
    return {
        notify,
        success: (message: string) => notify(message, "success"),
        error: (message: string) => notify(message, "error"),
        warning: (message: string) => notify(message, "warning"),
        info: (message: string) => notify(message, "info"),
    };
};
