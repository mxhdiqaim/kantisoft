import {Box, CircularProgress, Grid, Stack, Typography} from '@mui/material';
import {useRunProductionMutation} from '@/store/slice';
import useNotifier from '@/hooks/useNotifier';
import {Controller, useForm} from "react-hook-form";
import {yupResolver} from "@hookform/resolvers/yup";
import {productionRequestSchema, type ProductionRequestType} from "@/types/bom-types.ts";
import CustomModal from "@/components/customs/custom-modal.tsx";
import {StyledTextField} from "@/components/ui";
import CustomButton from "@/components/ui/button.tsx";
import {getApiError} from "@/helpers/get-api-error.ts";

interface Props {
    open: boolean;
    onClose: () => void;
    menuItem: { id: string; name: string };
}

const ProductionModal = ({open, onClose, menuItem}: Props) => {
    const notify = useNotifier();
    const [runProduction, {isLoading: isProducing}] = useRunProductionMutation();

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
            await runProduction({menuItemId: menuItem.id, ...data}).unwrap();
            notify(`Successfully produced ${data.quantityToProduce} units of ${menuItem.name}`, "success");

            reset();
            onClose();
        } catch (error) {
            const defaultMessage = `Failed to make production for ${menuItem.name}.`;
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
