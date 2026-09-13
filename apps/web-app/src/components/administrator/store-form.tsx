import { useCreateStoreMutation, useUpdateStoreMutation } from "@/store/slice";
import {
    createBusinessSchema,
    type CreateBusinessType,
    STORE_TYPES,
    type BusinessType,
} from "@/modules/iam/types/business.type.ts";
import { yupResolver } from "@hookform/resolvers/yup";
import { FormControl, Grid, InputAdornment, MenuItem } from "@mui/material";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useParams } from "react-router-dom";
import CustomModal from "@/components/customs/custom-modal.tsx";
import { parseApiError } from "@/shared/utils";
import { CustomButton, IconUtil, StyledTextField } from "@/shared/components";
import { useNotification } from "@/shared/hooks";

import ArrowDownIconSvg from "@/assets/icons/arrow-down.svg";

interface Props {
    open: boolean;
    onClose: () => void;
    currentData: BusinessType | null;
}

const StoreForm = ({ open, onClose, currentData }: Props) => {
    const { id } = useParams<{ id: string }>();
    const isEditMode = !!currentData;

    const { success: successMessage, error: errorMessage } = useNotification();

    const [createStore, { isLoading: isCreating }] = useCreateStoreMutation();
    const [updateStore, { isLoading: isUpdating }] = useUpdateStoreMutation();

    const {
        control,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm({
        defaultValues: {
            name: "",
            location: "",
            storeType: "restaurant",
        },

        resolver: yupResolver(createBusinessSchema),
    });

    useEffect(() => {
        if (open && currentData) {
            reset({
                name: currentData.name,
                location: currentData.location || "",
                storeType: currentData.storeType,
            });
        } else if (!open) {
            // Reset to default values when modal closes
            reset({
                name: "",
                location: "",
                storeType: "restaurant",
            });
        }
    }, [open, currentData, reset]);

    const onSubmit = async (formData: CreateBusinessType) => {
        try {
            if (isEditMode) {
                await updateStore({ id: id!, ...formData }).unwrap();
                successMessage("Store updated successfully!");
            } else {
                await createStore(formData).unwrap();
                successMessage("Store created successfully!");
            }

            onClose();
            reset();
        } catch (error) {
            const defaultMessage = isEditMode ? "Failed to update store" : "Failed to create store";
            const apiError = parseApiError(error, defaultMessage);
            errorMessage(apiError.message);
        }
    };
    const isLoading = isCreating || isUpdating;

    return (
        <CustomModal open={open} onClose={onClose} title={isEditMode ? "Edit Store" : "Create New Store"}>
            <Grid container spacing={2} component="form" onSubmit={handleSubmit(onSubmit)}>
                <Grid size={12}>
                    <Controller
                        name="name"
                        control={control}
                        render={({ field }) => (
                            <FormControl fullWidth>
                                <StyledTextField
                                    {...field}
                                    fullWidth
                                    label="Store Name"
                                    error={!!errors.name}
                                    helperText={errors.name?.message}
                                />
                            </FormControl>
                        )}
                    />
                </Grid>
                <Grid size={12}>
                    <Controller
                        name="location"
                        control={control}
                        render={({ field }) => (
                            <FormControl fullWidth>
                                <StyledTextField
                                    {...field}
                                    fullWidth
                                    label="Location (Optional)"
                                    error={!!errors.location}
                                    helperText={errors.location?.message}
                                />
                            </FormControl>
                        )}
                    />
                </Grid>
                <Grid size={12}>
                    <Controller
                        name="storeType"
                        control={control}
                        render={({ field }) => (
                            <FormControl fullWidth>
                                <StyledTextField
                                    {...field}
                                    select
                                    label="Branch Type"
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
                                    error={Boolean(errors.storeType)}
                                    helperText={errors.storeType?.message}
                                >
                                    <MenuItem value={""} disabled>
                                        Select Branch Type
                                    </MenuItem>
                                    {STORE_TYPES.map((type) => (
                                        <MenuItem key={type} value={type} sx={{ textTransform: "capitalize" }}>
                                            {type}
                                        </MenuItem>
                                    ))}
                                </StyledTextField>
                            </FormControl>
                        )}
                    />
                </Grid>
                <Grid size={12}>
                    <CustomButton
                        title={
                            isLoading
                                ? isEditMode
                                    ? "Updating..."
                                    : "Creating..."
                                : isEditMode
                                  ? "Update Store"
                                  : "Create Store"
                        }
                        variant="contained"
                        type="submit"
                        disabled={isLoading}
                    />
                </Grid>
            </Grid>
        </CustomModal>
    );
};

export default StoreForm;
