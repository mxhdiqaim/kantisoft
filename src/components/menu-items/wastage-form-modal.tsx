import {type FC, useEffect, useMemo} from 'react';
import {Controller, useForm, useWatch} from 'react-hook-form';
import {Box, FormControl, Grid, InputAdornment, MenuItem} from '@mui/material';
import CustomModal from "@/components/customs/custom-modal.tsx";
import {yupResolver} from "@hookform/resolvers/yup";
import {createWastageScheme, type CreateWastageType} from "@/types/production-types.ts";
import useNotifier from "@/hooks/useNotifier.ts";
import {getApiError} from "@/helpers/get-api-error.ts";
import {
    useGetAllRawMaterialInventoryQuery,
    useGetAllUnitOfMeasurementsQuery,
    useRecordWastageMutation
} from "@/store/slice";
import {StyledTextField} from "@/components/ui";
import {useMemoizedArray} from "@/hooks/use-memoized-array.ts";
import CustomButton from "@/components/ui/button.tsx";
import {useUnitFilter} from "@/hooks/use-unit-filter.ts";

import Icon from "@/components/ui/icon.tsx";
import ArrowDownIconSvg from "@/assets/icons/arrow-down.svg";

interface Props {
    open: boolean;
    onClose: () => void;
}

const WastageFormModal: FC<Props> = ({open, onClose}) => {
    const notify = useNotifier();

    // Fetch Data
    const {data: rawMaterialInventory, isLoading: fetchingRawMaterialInventory} = useGetAllRawMaterialInventoryQuery();
    const memoizedRawMaterialInventory = useMemoizedArray(rawMaterialInventory);

    const {data: unitData, isLoading: isMeasurementLoading} = useGetAllUnitOfMeasurementsQuery();
    const memoizedMeasurement = useMemoizedArray(unitData);

    const [recordWastage, {isLoading: isSubmitting}] = useRecordWastageMutation();

    // Initialise Form (must be before useUnitFilter)
    const {control, handleSubmit, reset, setValue} = useForm({
        defaultValues: {
            rawMaterialId: '',
            quantityPresentation: 0,
            unitOfMeasurementId: '',
            reason: ''
        },
        resolver: yupResolver(createWastageScheme),
    });

    // Watch for the selected material ID
    const selectedRawMaterialId = useWatch({control, name: "rawMaterialId"});

    // Determine the family based on the selected material
    const selectedMaterialFamily = useMemo(() => {
        if (!memoizedRawMaterialInventory || !selectedRawMaterialId) return undefined;
        const selectedMaterial = memoizedRawMaterialInventory.find(rm => rm.id === selectedRawMaterialId);
        return selectedMaterial?.unitOfMeasurement?.unitOfMeasurementFamily;
    }, [memoizedRawMaterialInventory, selectedRawMaterialId]);

    // Initialise Unit Filter Hook
    const {filteredUnits, selectedUnitSymbol} = useUnitFilter({
        control,
        allUnits: memoizedMeasurement,
        selectedMaterialFamily: selectedMaterialFamily,
    });

    const onSubmit = async (data: CreateWastageType) => {
        try {
            await recordWastage(data).unwrap();
            notify(`Successfully recorded wastage`, "success");

            reset();
            onClose();
        } catch (error) {
            const defaultMessage = `Failed to record wastage.`;
            const apiError = getApiError(error, defaultMessage);

            notify(apiError.message, "error");
            console.log(`Failed to record wastage:`, error);
        }
    };

    // Auto-select a unit if only one exists or to provide a default (only when units change)
    useEffect(() => {
        if (filteredUnits.length > 0) {
            // Check if current value is valid in new list, otherwise select first
            // or just always select first when list changes
            setValue("unitOfMeasurementId", filteredUnits[0].id);
        }
    }, [filteredUnits, setValue]);

    return (
        <CustomModal
            open={open}
            onClose={onClose}
            title="Record Material Wastage"
            description="Deduct spoiled, spilled, or burnt materials from stock."
        >
            <Box component={"form"} noValidate autoComplete="off" onSubmit={handleSubmit(onSubmit)} sx={{mt: 2}}>
                <Grid container spacing={3}>
                    {/* Material Selection */}
                    <Grid size={12}>
                        <Controller
                            name="rawMaterialId"
                            control={control}
                            render={({field, fieldState}) => (
                                <FormControl fullWidth>
                                    <StyledTextField
                                        {...field}
                                        select
                                        label="Select Raw Material"
                                        disabled={fetchingRawMaterialInventory}
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
                                        error={!!fieldState.error}
                                        helperText={fieldState.error?.message}
                                    >
                                        <MenuItem value={""} disabled>
                                            Select Menu Item
                                        </MenuItem>
                                        {memoizedRawMaterialInventory?.map((rawMaterialInventory) => (
                                            <MenuItem
                                                key={rawMaterialInventory.id}
                                                value={rawMaterialInventory.id}
                                                sx={{textTransform: "capitalize"}}
                                            >
                                                {rawMaterialInventory.rawMaterialName} (In
                                                Stock: {rawMaterialInventory.quantity})
                                            </MenuItem>
                                        ))}
                                    </StyledTextField>
                                </FormControl>
                            )}
                        />
                    </Grid>

                    {/* Quantity */}
                    <Grid size={{xs: 12, md: 6}}>
                        <Controller
                            name="quantityPresentation"
                            control={control}
                            render={({field, fieldState}) => (
                                <StyledTextField
                                    {...field}
                                    fullWidth
                                    type="number"
                                    label="Quantity Wasted"
                                    InputProps={{
                                        endAdornment: selectedUnitSymbol && (
                                            <InputAdornment position="end">{selectedUnitSymbol}</InputAdornment>
                                        ),
                                    }}
                                    error={!!fieldState.error}
                                    helperText={fieldState.error?.message}
                                />
                            )}
                        />
                    </Grid>

                    <Grid size={{xs: 12, md: 6}}>
                        <Controller
                            name="unitOfMeasurementId"
                            control={control}
                            render={({field, fieldState}) => (
                                <StyledTextField
                                    {...field}
                                    select
                                    fullWidth
                                    label="Unit Of Measurement"
                                    disabled={isMeasurementLoading || !selectedMaterialFamily}
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
                                    error={!!fieldState.error}
                                    helperText={fieldState.error?.message}
                                >
                                    <MenuItem value={""} disabled>
                                        Select Measurement Unit
                                    </MenuItem>
                                    {filteredUnits.map((measurement) => (
                                        <MenuItem key={measurement.id} value={measurement.id}
                                                  sx={{textTransform: "capitalize"}}>
                                            {measurement.name}
                                        </MenuItem>
                                    ))}
                                </StyledTextField>
                            )}
                        />
                    </Grid>
                    <Grid size={12}>
                        <Controller
                            name="reason"
                            control={control}
                            render={({field, fieldState}) => (
                                <StyledTextField
                                    {...field}
                                    fullWidth
                                    label="Reason"
                                    error={!!fieldState.error}
                                    helperText={fieldState.error?.message}
                                />
                            )}
                        />
                    </Grid>

                    {/* Action Buttons */}
                    <Grid size={12}>
                        <Box sx={{display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2}}>
                            <CustomButton title={"Cancel"} onClick={onClose} variant="outlined" color="inherit"/>
                            <CustomButton
                                title={isSubmitting ? "Processing..." : "Confirm Wastage"}
                                type="submit"
                                variant="contained"
                                disabled={isSubmitting}
                            />

                        </Box>
                    </Grid>
                </Grid>
            </Box>
        </CustomModal>
    );
};

export default WastageFormModal;
