import { Box, CircularProgress, FormControl, Grid, InputAdornment, MenuItem, Stack, Typography } from "@mui/material";
import { useGetMenuItemsQuery, useRunProductionMutation } from "@/store/slice";
import { useNotification } from "@/shared/hooks";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { createProductionSchema, type CreateProductionType } from "@/types/production-types.ts";
import CustomModal from "@/components/customs/custom-modal.tsx";
import { useMemoizedArray } from "@/hooks/use-memoized-array.ts";
import { parseApiError } from "@/shared/utils";
import { CustomButton, IconUtil, StyledTextField } from "@/shared/components";

import ArrowDownIconSvg from "@/assets/icons/arrow-down.svg";

interface Props {
    open: boolean;
    onClose: () => void;
}

const ProductionModal = ({ open, onClose }: Props) => {
    const { success: successMessage, error: errorMessage } = useNotification();
    const [runProduction, { isLoading: isProducing }] = useRunProductionMutation();

    const { data: menuItemsData, isLoading: isLoadingMenuItems } = useGetMenuItemsQuery({});
    const memoizedMenuItems = useMemoizedArray(menuItemsData);

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm({
        defaultValues: {
            quantityToProduce: 1,
        },

        resolver: yupResolver(createProductionSchema),
    });

    const onSubmit = async (data: CreateProductionType) => {
        try {
            await runProduction(data).unwrap();
            successMessage(`Successfully produced ${data.quantityToProduce} units.`);

            reset();
            onClose();
        } catch (error) {
            const defaultMessage = `Failed to make production.`;
            const apiError = parseApiError(error, defaultMessage);

            errorMessage(apiError.message);
            console.log(`Failed to make production:`, error);
        }
    };

    return (
        <CustomModal open={open} onClose={onClose}>
            <Typography variant="h6" sx={{ mb: 2 }}>
                Start Production
            </Typography>
            <Box component={"form"} onSubmit={handleSubmit(onSubmit)}>
                <Grid container spacing={2}>
                    <Grid size={12}>
                        <Controller
                            name="menuItemId"
                            control={control}
                            render={({ field }) => (
                                <FormControl fullWidth>
                                    <StyledTextField
                                        {...field}
                                        select
                                        label="Select Menu Item"
                                        disabled={isLoadingMenuItems}
                                        SelectProps={{
                                            IconComponent: () => null,
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconUtil
                                                        src={ArrowDownIconSvg}
                                                        alt={"Dropdown Arrow"}
                                                        sx={{ width: 15, height: 15 }}
                                                    />
                                                </InputAdornment>
                                            ),
                                        }}
                                        error={Boolean(errors.menuItemId)}
                                        helperText={errors.menuItemId?.message}
                                    >
                                        <MenuItem value={""} disabled>
                                            Select Menu Item
                                        </MenuItem>
                                        {memoizedMenuItems?.map((menuItem) => (
                                            <MenuItem
                                                key={menuItem.id}
                                                value={menuItem.id}
                                                sx={{ textTransform: "capitalize" }}
                                            >
                                                {menuItem.name}
                                            </MenuItem>
                                        ))}
                                    </StyledTextField>
                                </FormControl>
                            )}
                        />
                    </Grid>
                    <Grid size={12}>
                        <Controller
                            name="quantityToProduce"
                            control={control}
                            render={({ field }) => (
                                <StyledTextField
                                    {...field}
                                    fullWidth
                                    type="number"
                                    label="Quantity to Produce"
                                    error={!!errors.quantityToProduce}
                                    helperText={errors.quantityToProduce?.message}
                                    autoFocus
                                />
                            )}
                        />
                    </Grid>
                </Grid>
                <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 2 }}>
                    <CustomButton title={"Cancel"} onClick={onClose} color="inherit" sx={{ width: "fit-content" }} />
                    <CustomButton
                        title={"Confirm Production"}
                        variant="contained"
                        type={"submit"}
                        disabled={isProducing}
                        startIcon={isProducing && <CircularProgress size={16} />}
                        sx={{ width: "fit-content" }}
                    />
                </Stack>
            </Box>
        </CustomModal>
    );
};

export default ProductionModal;
