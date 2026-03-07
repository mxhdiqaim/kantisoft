import type {FC} from "react";
import ViewStoreLoading from "@/components/stores/loading/view-store-loading.tsx";
import {useGetStoreByIdQuery} from "@/store/slice";
import {Chip, Grid, Typography, useTheme} from "@mui/material";
import {drawerPaperProps} from "@/components/styles";
import DataDrawer from "@/components/ui/data-drawer.tsx";
import CustomCard from "@/components/customs/custom-card.tsx";
import useNotifier from "@/hooks/useNotifier.ts";
import {getApiError} from "@/helpers/get-api-error.ts";
import ApiErrorDisplay from "@/components/feedback/api-error-display.tsx";
import {useMemoizedArray} from "@/hooks/use-memoized-array.ts";

interface Props {
    open: boolean;
    onOpen: () => void;
    onClose: () => void;
    storeId: string;
}

const ViewStoreDrawer: FC<Props> = ({open, onOpen, onClose, storeId}) => {
    const notify = useNotifier();
    const theme = useTheme();

    const {data: store, isLoading, isError, error} = useGetStoreByIdQuery(storeId as string, {
        skip: !storeId || !open,
    });

    // Only create a details array if the store exists to prevent "undefined" errors
    const storeDetails = store ? [
        {label: "Store Name", value: store.name},
        {label: "Location", value: store.location || "N/A"},
        {
            label: "Store Type",
            value: (
                <Chip
                    label={store.storeType}
                    size="medium"
                    sx={{textTransform: "capitalize", borderRadius: theme.borderRadius.small}}
                />
            ),
        },
        {
            label: "Branch",
            value: (
                <Chip
                    label={store.branchType}
                    size="medium"
                    sx={{textTransform: "capitalize", borderRadius: theme.borderRadius.small}}
                />
            ),
        },
        {label: "Date Created", value: new Date(store.createdAt).toLocaleString()},
        {label: "Last Updated", value: store.lastModified ? new Date(store.lastModified).toLocaleString() : "N/A"},
    ] : [];

    const memoizedStoreDetails = useMemoizedArray(storeDetails);

    if (isError) {
        const apiError = getApiError(error, "Failed to load store data.");
        notify(apiError.message, "error");
        return <ApiErrorDisplay statusCode={apiError.type} message={apiError.message}/>;
    }

    return (
        <DataDrawer
            title={"Store Details"}
            anchor={"right"}
            open={open}
            onOpen={onOpen}
            onClose={onClose}
            PaperProps={drawerPaperProps}
        >
            {isLoading || !store ? <ViewStoreLoading/> : (
                <>
                    <CustomCard>
                        <Grid container spacing={2}>
                            {memoizedStoreDetails.map((detail) => (
                                <Grid size={{xs: 12, sm: 6}} key={detail.label}>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        {detail.label}
                                    </Typography>
                                    <Typography variant="body1" fontWeight="500">
                                        {detail.value}
                                    </Typography>
                                </Grid>
                            ))}
                        </Grid>
                    </CustomCard>
                </>
            )}
        </DataDrawer>
    );
};

export default ViewStoreDrawer;
