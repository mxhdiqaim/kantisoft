import type { FC } from "react";
import { useEffect } from "react";
import { Box, FormControl, Grid } from "@mui/material";
import CustomModal from "@/components/customs/custom-modal.tsx";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useCreateCategoryMutation, useUpdateCategoryMutation } from "@/store/slice";
import { useNotification } from "@/shared";
import { parseApiErrorUtil } from "@/shared/api/parse-api-error.util.ts";
import CustomButton from "@/shared/components/ui/button.util.tsx";
import { StyledTextField } from "@/shared/components/ui";
import { type CategoryType, createCategorySchema, type CreateCategoryType } from "@/types/categories-types.ts";

interface Props {
    open: boolean;
    onClose: () => void;
    categoryData?: CategoryType | null;
}

const CategoryFormModal: FC<Props> = ({ open, onClose, categoryData }) => {
    const notification = useNotification();
    const isEditMode = !!categoryData;

    const [createCategory, { isLoading: isCreating, isSuccess: isCreateSuccess, reset: resetCreateMutation }] =
        useCreateCategoryMutation();

    const [updateCategory, { isLoading: isUpdating, isSuccess: isUpdateSuccess, reset: resetUpdateMutation }] =
        useUpdateCategoryMutation();

    const {
        control,
        handleSubmit,
        reset: resetForm,
        formState: { errors },
    } = useForm({
        defaultValues: {
            name: "",
            description: "",
        },
        resolver: yupResolver(createCategorySchema),
    });

    const handleClose = () => {
        onClose();
        resetCreateMutation();
        resetUpdateMutation();
    };

    useEffect(() => {
        if (isCreateSuccess || isUpdateSuccess) {
            handleClose();
        }
    }, [isCreateSuccess, isUpdateSuccess]);

    useEffect(() => {
        if (categoryData && open) {
            resetForm({
                name: categoryData.name,
                description: categoryData.description,
            });
        } else if (!open) {
            resetForm({
                name: "",
                description: "",
            });
        }
    }, [categoryData, open, resetForm]);

    const onSubmit = async (data: CreateCategoryType) => {
        try {
            if (isEditMode && categoryData) {
                await updateCategory({ id: categoryData.id, ...data }).unwrap();
                notification.success("Category Updated Successfully!");
            } else {
                await createCategory(data).unwrap();
                notification.success("Category Added Successfully!");
            }
        } catch (error) {
            const defaultMessage = `Failed to ${isEditMode ? "update" : "create"} Category. Please try again.`;
            const apiError = parseApiErrorUtil(error, defaultMessage);
            notification.error(apiError.message);
        }
    };

    const isLoading = isCreating || isUpdating;

    return (
        <CustomModal open={open} onClose={onClose} title={isEditMode ? "Edit Category" : "Create Category"}>
            <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 3 }}>
                <Grid container spacing={3}>
                    <Grid size={12}>
                        <Controller
                            name="name"
                            control={control}
                            render={({ field }) => (
                                <FormControl fullWidth>
                                    <StyledTextField
                                        {...field}
                                        label="Name"
                                        error={Boolean(errors.name)}
                                        helperText={errors.name?.message}
                                    />
                                </FormControl>
                            )}
                        />
                    </Grid>
                    <Grid size={12}>
                        <Controller
                            name="description"
                            control={control}
                            render={({ field }) => (
                                <FormControl fullWidth>
                                    <StyledTextField
                                        {...field}
                                        label="Description"
                                        error={Boolean(errors.description)}
                                        helperText={errors.description?.message}
                                    />
                                </FormControl>
                            )}
                        />
                    </Grid>
                </Grid>
                <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mt: 2 }}>
                    <CustomButton title={"Close"} onClick={onClose} />
                    <CustomButton
                        title={isLoading ? (isEditMode ? "Saving..." : "Creating...") : isEditMode ? "Save" : "Create"}
                        type="submit"
                        variant={"contained"}
                        disabled={isLoading}
                    />
                </Box>
            </Box>
        </CustomModal>
    );
};

export default CategoryFormModal;
