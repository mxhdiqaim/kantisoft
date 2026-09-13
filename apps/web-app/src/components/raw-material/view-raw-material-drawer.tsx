import { useGetSingleRawMaterialQuery } from "@/store/slice";
// import useNotifier from "@/hooks/useNotifier.ts";
import { parseApiErrorUtil } from "@/shared/api/parse-api-error.util.ts";
// import ApiErrorDisplay from "@/components/feedback/api-error-display.tsx";
import { Box, Divider, Grid, Stack, Typography } from "@mui/material";
import { EditOutlined } from "@mui/icons-material";
import CustomButton from "@/shared/components/ui/button.util.tsx";
import CustomCard from "@/components/customs/custom-card.tsx";
import { formatCurrency } from "@/shared/utils/custom.util.ts";
import RawMaterialForm from "@/components/raw-material/raw-material-form.tsx";
import { type FC, useState } from "react";
import { drawerPaperProps } from "@/components/styles";
import DataDrawerUi from "@/shared/components/ui/data-drawer.ui.tsx";
import { formatDateCustom, formatRelativeDateTime } from "@/shared/utils/time-date.util.ts";
import { ViewRawMaterialSkeleton } from "@/shared";

interface Props {
    open: boolean;
    onOpen: () => void;
    onClose: () => void;
    rawMaterialId: string;
}

const ViewRawMaterialDrawer: FC<Props> = ({ rawMaterialId, open, onOpen, onClose }) => {
    // const notify = useNotifier();

    const [formModalOpen, setFormModalOpen] = useState(false);

    const {
        data: rawMaterial,
        error,
        isLoading,
    } = useGetSingleRawMaterialQuery(rawMaterialId!, {
        skip: !rawMaterialId,
    });

    const handleCloseFormModal = () => {
        setFormModalOpen(false);
    };

    const handleOpenFormModal = () => {
        setFormModalOpen(true);
    };

    const apiError = parseApiErrorUtil(error, "Failed to load raw material data.");

    return (
        <DataDrawerUi
            title={"Raw Material Details"}
            anchor={"right"}
            open={open}
            onOpen={onOpen}
            onClose={onClose}
            PaperProps={drawerPaperProps}
            error={error}
            apiError={apiError}
        >
            {isLoading ? (
                <ViewRawMaterialSkeleton />
            ) : (
                <Grid container spacing={3}>
                    <Grid size={12}>
                        <CustomCard>
                            <Typography variant="h6" gutterBottom>
                                Basic Information
                            </Typography>
                            <Grid container spacing={2} sx={{ mt: 1 }}>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Name
                                    </Typography>
                                    <Typography variant="body1" fontWeight={500}>
                                        {rawMaterial.name}
                                    </Typography>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Description
                                    </Typography>
                                    <Typography variant="body1" fontWeight={500}>
                                        {rawMaterial.description || ""}
                                    </Typography>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Price per Unit
                                    </Typography>
                                    <Typography variant="body1" fontWeight={500}>
                                        {formatCurrency(rawMaterial.latestUnitPricePresentation)}
                                    </Typography>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Modified on
                                    </Typography>
                                    <Typography variant="body1" fontWeight={500}>
                                        {formatRelativeDateTime(rawMaterial.updatedAt)}
                                    </Typography>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Date Added
                                    </Typography>
                                    <Typography variant="body1" fontWeight={500}>
                                        {formatDateCustom(rawMaterial.createdAt)}
                                    </Typography>
                                </Grid>
                            </Grid>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="h6" gutterBottom>
                                Measurement Information
                            </Typography>
                            <Box
                                sx={{
                                    p: 1.5,
                                    mb: 1,
                                    borderRadius: 1,
                                    border: "1px solid",
                                    borderColor: "divider",
                                }}
                            >
                                <Typography variant="body1" fontWeight={500}>
                                    {rawMaterial.unitOfMeasurement.name} ({rawMaterial.unitOfMeasurement.symbol})
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Conversion to Base: {rawMaterial.unitOfMeasurement.conversionFactorToBase}
                                </Typography>
                            </Box>
                        </CustomCard>
                    </Grid>
                    <Grid size={12}>
                        <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={2}
                            position={"absolute"}
                            bottom={0}
                            left={0}
                            right={0}
                            p={2}
                        >
                            <CustomButton
                                title={"Edit Raw Material"}
                                variant="contained"
                                startIcon={<EditOutlined />}
                                onClick={handleOpenFormModal}
                                disabled={isLoading}
                                sx={{ width: "100%" }}
                            />
                            {/*// TODO: Add Deactivate and Delete functionality */}
                        </Stack>
                    </Grid>
                </Grid>
            )}

            <RawMaterialForm open={formModalOpen} onClose={handleCloseFormModal} rawMaterial={rawMaterial} />
        </DataDrawerUi>
    );
};

export default ViewRawMaterialDrawer;
