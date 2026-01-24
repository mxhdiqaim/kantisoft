import {Box, CircularProgress, FormControl, Grid, InputAdornment, MenuItem, Stack, Typography} from '@mui/material';
import {useGetMenuItemsQuery, useRunProductionMutation} from '@/store/slice';
import useNotifier from '@/hooks/useNotifier';
import {Controller, useForm} from "react-hook-form";
import {yupResolver} from "@hookform/resolvers/yup";
import {productionRequestSchema, type ProductionRequestType} from "@/types/bom-types.ts";
import CustomModal from "@/components/customs/custom-modal.tsx";
import {StyledTextField} from "@/components/ui";
import CustomButton from "@/components/ui/button.tsx";
import {getApiError} from "@/helpers/get-api-error.ts";
import {useMemoizedArray} from "@/hooks/use-memoized-array.ts";

import Icon from "@/components/ui/icon.tsx";
import ArrowDownIconSvg from "@/assets/icons/arrow-down.svg";

interface Props {
    open: boolean;
    onClose: () => void;
}

const ProductionModal = ({open, onClose}: Props) => {
    const notify = useNotifier();
    const [runProduction, {isLoading: isProducing}] = useRunProductionMutation();

    const {data: menuItemsData, isLoading: isLoadingMenuItems} = useGetMenuItemsQuery({});
    const memoizedMenuItems = useMemoizedArray(menuItemsData);

    const {
        control,
        handleSubmit,
        reset,
        formState: {errors},
    } = useForm({
        defaultValues: {
            quantityToProduce: 1
        },

        resolver: yupResolver(productionRequestSchema),
    });

    const onSubmit = async (data: ProductionRequestType) => {
        try {
            await runProduction(data).unwrap();
            notify(`Successfully produced ${data.quantityToProduce} units.`, "success");

            reset();
            onClose();
        } catch (error) {
            const defaultMessage = `Failed to make production.`;
            const apiError = getApiError(error, defaultMessage);

            notify(apiError.message, "error");
            console.log(`Failed to make production:`, error);
        }
    }

    return (
        <CustomModal open={open} onClose={onClose}>
            <Typography variant="h6" sx={{mb: 2}}>
                Start Production
            </Typography>
            <Box component={"form"} onSubmit={handleSubmit(onSubmit)}>
                <Grid container spacing={2}>
                    <Grid size={12}>
                        <Controller
                            name="menuItemId"
                            control={control}
                            render={({field}) => (
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
                                                    <Icon
                                                        src={ArrowDownIconSvg}
                                                        alt={"Dropdown Arrow"}
                                                        sx={{width: 15, height: 15}}
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
                                                sx={{textTransform: "capitalize"}}
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
                            render={({field}) => (
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
                <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{mt: 2}}>
                    <CustomButton
                        title={"Cancel"}
                        onClick={onClose}
                        color="inherit"
                        sx={{width: "fit-content"}}
                    />
                    <CustomButton
                        title={"Confirm Production"}
                        variant="contained"
                        type={"submit"}
                        disabled={isProducing}
                        startIcon={isProducing && <CircularProgress size={16}/>}
                        sx={{width: "fit-content"}}
                    />
                </Stack>
            </Box>
        </CustomModal>
    );
};

export default ProductionModal;
