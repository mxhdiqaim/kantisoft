import {type FC, useEffect, useMemo} from "react";
import {Box, FormControl, Grid, InputAdornment, MenuItem} from "@mui/material";
import CustomModal from "@/components/customs/custom-modal.tsx";
import {Controller, useForm, useWatch} from "react-hook-form";
import {yupResolver} from "@hookform/resolvers/yup";
import {
    createRawMaterialInventorySchema,
    type CreateRawMaterialInventoryType,
    type MultipleRawMaterialInventoryResponseType,
    type UpdateRawMaterialInventoryType,
} from "@/types/raw-material-types.ts";
import {StyledTextField} from "@/components/ui";
import Icon from "@/components/ui/icon.tsx";
import {
    useCreateRawMaterialInventoryMutation,
    useGetAllRawMaterialsQuery,
    useGetAllUnitOfMeasurementsQuery,
    useUpdateRawMaterialInventoryMutation
} from "@/store/slice";
import CustomButton from "@/components/ui/button.tsx";
import useNotifier from "@/hooks/useNotifier.ts";
import {getApiError} from "@/helpers/get-api-error.ts";
import ArrowDownIconSvg from "@/assets/icons/arrow-down.svg";
import {useMemoizedArray} from "@/hooks/use-memoized-array.ts";

interface Props {
    open: boolean;
    onClose: () => void;
    rawMaterialInventory?: MultipleRawMaterialInventoryResponseType | null;
}

const RawMaterialInventoryForm: FC<Props> = ({open, onClose, rawMaterialInventory}) => {
    const notify = useNotifier();
    const isEditMode = !!rawMaterialInventory;

    const {data: rawMaterialData, isLoading: isFetchingRawMaterial} = useGetAllRawMaterialsQuery(undefined, {
        skip: !open,
    });

    const memoizedRawMaterial = useMemoizedArray(rawMaterialData);

    const {data: unitOfMeasurements, isLoading: fetchingMeasurements} = useGetAllUnitOfMeasurementsQuery(undefined, {
        skip: !open,
    });

    const memoizedUnitOfMeasurements = useMemoizedArray(unitOfMeasurements);

    const [createRawMaterialInventory, {
        isLoading: isCreating,
        isSuccess: isCreateSuccess,
        reset: resetCreateMutation
    }] = useCreateRawMaterialInventoryMutation();

    const [updateRawMaterialInventory, {
        isLoading: isUpdating,
        isSuccess: isUpdateSuccess,
        reset: resetUpdateMutation
    }] = useUpdateRawMaterialInventoryMutation();

    const {
        control,
        handleSubmit,
        reset: resetForm,
        setValue,
        formState: {errors},
    } = useForm({
        defaultValues: {
            rawMaterialId: "",
            unitOfMeasurementId: "",
            quantity: 0,
            minStockLevel: 0,
        },
        resolver: yupResolver(createRawMaterialInventorySchema),
    });

    // Move all useWatch calls to the top level
    const currentUnitId = useWatch({control, name: "unitOfMeasurementId"});
    const selectedMaterialId = useWatch({control, name: "rawMaterialId"});

    // Use the values in useMemo (no hooks inside here any more)
    const selectedUnitSymbol = useMemo(() => {
        return memoizedUnitOfMeasurements?.find(u => u.id === currentUnitId)?.symbol || "";
    }, [currentUnitId, memoizedUnitOfMeasurements]);

    const selectedMaterial = useMemo(() => {
        return memoizedRawMaterial?.find((m) => m.id === selectedMaterialId);
    }, [selectedMaterialId, memoizedRawMaterial]);

    // Normalise family (ensure it exists before calling toLowerCase)
    const requiredFamily = useMemo(() => {
        return selectedMaterial?.unitOfMeasurement?.unitOfMeasurementFamily?.toLowerCase();
    }, [selectedMaterial]);

    // Filter units
    const filteredUnits = useMemo(() => {
        if (!requiredFamily) return [];

        return memoizedUnitOfMeasurements?.filter(
            (unit) => unit.unitOfMeasurementFamily?.toLowerCase() === requiredFamily
        );
    }, [requiredFamily, memoizedUnitOfMeasurements]);

    const handleClose = () => {
        onClose();
        resetCreateMutation();
        resetUpdateMutation();
    };

    // Optional UX: Auto-select the first compatible unit when material changes
    useEffect(() => {
        if (filteredUnits && filteredUnits.length > 0 && !isEditMode) {
            setValue("unitOfMeasurementId", filteredUnits[0].id);
        } else if (!isEditMode) {
            setValue("unitOfMeasurementId", "");
        }
    }, [filteredUnits, setValue, isEditMode]);

    useEffect(() => {
        if (isCreateSuccess || isUpdateSuccess) {
            handleClose();
        }
    }, [isCreateSuccess, isUpdateSuccess]);

    useEffect(() => {
        if (rawMaterialInventory && open) {
            resetForm({
                rawMaterialId: rawMaterialInventory.rawMaterialId,
                minStockLevel: rawMaterialInventory.minStockLevel,
                quantity: rawMaterialInventory.quantity,
                unitOfMeasurementId: rawMaterialInventory.unitOfMeasurement.id,
            });
        } else if (!open) {
            resetForm({
                rawMaterialId: "",
                quantity: 0,
                minStockLevel: 0,
                unitOfMeasurementId: ""
            });
        }
    }, [rawMaterialInventory, open, resetForm]);

    const onSubmit = async (data: CreateRawMaterialInventoryType | UpdateRawMaterialInventoryType) => {
        try {
            if (isEditMode && rawMaterialInventory) {
                const payload = {
                    id: rawMaterialInventory.id,
                    minStockLevel: data.minStockLevel,
                }
                await updateRawMaterialInventory(payload as UpdateRawMaterialInventoryType).unwrap();
                notify("Raw Material Inventory Updated Successfully!", "success");
            } else {
                await createRawMaterialInventory(data as CreateRawMaterialInventoryType).unwrap();
                notify("Raw Material Inventory Added Successfully!", "success");
            }
        } catch (error) {
            const defaultMessage = `Failed to update Inventory. Please try again.`;
            const apiError = getApiError(error, defaultMessage);
            notify(apiError.message, "error");
        }
    };

    const isLoading = isCreating || isUpdating;

    return (
        <CustomModal
            open={open}
            onClose={onClose}
            title={isEditMode ? "Edit Inventory" : "Create Inventory"}
        >
            <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{mt: 3}}>
                <Grid container spacing={2}>
                    {!isEditMode && (
                        <Grid size={12}>
                            <Controller
                                name="rawMaterialId"
                                control={control}
                                render={({field}) => (
                                    <FormControl fullWidth>
                                        <StyledTextField
                                            {...field}
                                            select
                                            label="Raw Material"
                                            placeholder="Select Raw Material"
                                            disabled={isFetchingRawMaterial}
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
                                            error={Boolean(errors.rawMaterialId)}
                                            helperText={errors.rawMaterialId?.message}
                                        >
                                            <MenuItem value={""} disabled>
                                                Select Raw Material
                                            </MenuItem>
                                            {memoizedRawMaterial?.map((rawMaterial) => (
                                                <MenuItem key={rawMaterial.id} value={rawMaterial.id}
                                                          sx={{textTransform: "capitalize"}}>
                                                    {rawMaterial.name}
                                                </MenuItem>
                                            ))}
                                        </StyledTextField>
                                    </FormControl>
                                )}
                            />
                        </Grid>
                    )}
                    {!isEditMode && (
                        <Grid size={12}>
                            <Controller
                                name="unitOfMeasurementId"
                                control={control}
                                render={({field}) => (
                                    <FormControl fullWidth>
                                        <StyledTextField
                                            {...field}
                                            select
                                            label="Unit Of Measurement"
                                            disabled={fetchingMeasurements || !selectedMaterialId}
                                            error={Boolean(errors.unitOfMeasurementId)}
                                            helperText={errors.unitOfMeasurementId?.message}
                                        >
                                            <MenuItem value="" disabled>Select Unit</MenuItem>
                                            {filteredUnits?.map((unit) => (
                                                <MenuItem
                                                    key={unit.id}
                                                    value={unit.id}
                                                    sx={{textTransform: "capitalize"}}
                                                >
                                                    {unit.name} ({unit.symbol})
                                                </MenuItem>
                                            ))}
                                        </StyledTextField>
                                    </FormControl>
                                )}
                            />
                        </Grid>
                    )}
                    {!isEditMode && (
                        <Grid size={{sm: 12, md: 6}}>
                            <Controller
                                name="quantity"
                                control={control}
                                render={({field}) => (
                                    <StyledTextField
                                        {...field}
                                        label="Quantity"
                                        type="number"
                                        fullWidth
                                        // ADDED ADORNMENT
                                        InputProps={{
                                            endAdornment: selectedUnitSymbol && (
                                                <InputAdornment position="end">{selectedUnitSymbol}</InputAdornment>
                                            ),
                                        }}
                                        error={Boolean(errors.quantity)}
                                        helperText={errors.quantity?.message}
                                    />
                                )}
                            />
                        </Grid>
                    )}
                    <Grid size={isEditMode ? 12 : {sm: 12, md: 6}}>
                        <Controller
                            name="minStockLevel"
                            control={control}
                            render={({field}) => (
                                <StyledTextField
                                    {...field}
                                    fullWidth
                                    label="Low Stock Alert Level"
                                    type="number"
                                    // ADDED ADORNMENT
                                    InputProps={{
                                        endAdornment: selectedUnitSymbol && (
                                            <InputAdornment position="end">{selectedUnitSymbol}</InputAdornment>
                                        ),
                                    }}
                                    error={Boolean(errors.minStockLevel)}
                                    helperText={errors.minStockLevel?.message}
                                />
                            )}
                        />
                    </Grid>
                </Grid>
                <Box sx={{display: "flex", justifyContent: "flex-end", gap: 2, mt: 2}}>
                    <CustomButton title={"Close"} onClick={onClose} variant="outlined"/>
                    <CustomButton
                        title={isLoading ? (isEditMode ? "Saving..." : "Creating...") : (isEditMode ? "Save" : "Create")}
                        type="submit"
                        variant={"contained"}
                        disabled={isLoading}
                    />
                </Box>
            </Box>
        </CustomModal>
    );
};

export default RawMaterialInventoryForm;
