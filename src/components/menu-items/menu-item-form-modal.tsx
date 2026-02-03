import CustomModal from "@/components/customs/custom-modal.tsx";
import {getApiError} from "@/helpers/get-api-error.ts";
import useNotifier from "@/hooks/useNotifier.ts";
import {useCreateMenuItemMutation, useGetAllCategoriesQuery, useUpdateMenuItemMutation} from "@/store/slice";
import {
    createMenuItemSchema,
    type CreateMenuItemType,
    type EditMenuItemType,
    type MenuItemType,
} from "@/types/menu-item-type.ts";
import {yupResolver} from "@hookform/resolvers/yup";
import {Box, FormControl, Grid, InputAdornment, MenuItem, Typography} from "@mui/material";
import {useEffect} from "react";
import {Controller, useForm} from "react-hook-form";
import CustomButton from "@/components/ui/button.tsx";
import {StyledTextField} from "@/components/ui";
import {useMemoizedArray} from "@/hooks/use-memoized-array.ts";

import Icon from "@/components/ui/icon.tsx";
import ArrowDownIconSvg from "@/assets/icons/arrow-down.svg";

interface Props {
    open: boolean;
    onClose: () => void;
    menuItemToEdit?: MenuItemType | null;
}

const MenuItemFormModal = ({open, onClose, menuItemToEdit}: Props) => {
    const notify = useNotifier();

    const [createMenuItem, {isLoading: isCreating}] = useCreateMenuItemMutation();
    const [updateMenuItem, {isLoading: isUpdating}] = useUpdateMenuItemMutation();

    const isEditMode = !!menuItemToEdit;

    const {data: categoriesData, isLoading: fetchingCategory} = useGetAllCategoriesQuery(undefined, {
        skip: !open,
    });

    const memoizedCategories = useMemoizedArray(categoriesData);

    const {
        control,
        handleSubmit,
        reset,
        formState: {errors},
    } = useForm({
        mode: "onBlur",
        defaultValues: {
            name: "",
            price: 0,
            itemCode: undefined,
            sku: undefined,
            categoryId: "",
        },

        resolver: yupResolver(createMenuItemSchema),
    });

    useEffect(() => {
        if (open) {
            if (isEditMode) {
                reset(menuItemToEdit);
            } else {
                reset({
                    name: "",
                    price: 0,
                    itemCode: undefined,
                    sku: undefined,
                    categoryId: "",
                });
            }
        }
    }, [open, isEditMode, menuItemToEdit, reset]);

    const onSubmit = async (data: CreateMenuItemType | EditMenuItemType) => {
        try {
            const payload = {...data, itemCode: data.itemCode || undefined};
            if (isEditMode && menuItemToEdit) {
                await updateMenuItem({
                    id: menuItemToEdit.id,
                    ...(payload as EditMenuItemType),
                }).unwrap();
                notify("Menu item updated successfully!", "success");
            } else {
                await createMenuItem(payload as CreateMenuItemType).unwrap();
                notify("Menu item added successfully!", "success");
            }
            onClose();
        } catch (error) {
            const defaultMessage = `Failed to ${isEditMode ? "update" : "add"} menu item.`;
            const apiError = getApiError(error, defaultMessage);

            notify(apiError.message, "error");
            console.log(`Failed to ${isEditMode ? "update" : "create"} menu item:`, error);
        }
    };

    const isLoading = isCreating || isUpdating;

    return (
        <CustomModal open={open} onClose={onClose}>
            <Box>
                <Typography variant="h6" sx={{mb: 2}}>
                    {isEditMode ? "Edit Menu Item" : "Add Menu Item"}
                </Typography>
                <Box component={"form"} onSubmit={handleSubmit(onSubmit)}>
                    <Grid container spacing={2}>
                        <Grid size={{xs: 12, md: 6}}>
                            <Controller
                                name="name"
                                control={control}
                                render={({field}) => (
                                    <StyledTextField
                                        {...field}
                                        fullWidth
                                        label="Name"
                                        error={!!errors.name}
                                        helperText={errors.name?.message}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid size={{xs: 12, md: 6}}>
                            <Controller
                                name="price"
                                control={control}
                                render={({field}) => (
                                    <StyledTextField
                                        {...field}
                                        fullWidth
                                        label="Price"
                                        type="number"
                                        error={!!errors.price}
                                        helperText={errors.price?.message}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid size={{xs: 12, sm: 6}}>
                            <Controller
                                name="categoryId"
                                control={control}
                                render={({field}) => (
                                    <FormControl fullWidth>
                                        <StyledTextField
                                            {...field}
                                            select
                                            label="Category"
                                            disabled={fetchingCategory}
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
                                            error={Boolean(errors.categoryId)}
                                            helperText={errors.categoryId?.message}
                                        >
                                            <MenuItem value={""} disabled>
                                                Select Category
                                            </MenuItem>
                                            {memoizedCategories.map((category) => (
                                                <MenuItem key={category.id} value={category.id}
                                                          sx={{textTransform: "capitalize"}}>
                                                    {category.name}
                                                </MenuItem>
                                            ))}
                                        </StyledTextField>
                                    </FormControl>
                                )}
                            />
                        </Grid>
                        <Grid size={{xs: 12, md: 6}}>
                            <Controller
                                name="itemCode"
                                control={control}
                                render={({field}) => (
                                    <StyledTextField
                                        {...field}
                                        fullWidth
                                        label="Item Code (Optional)"
                                        type="number"
                                        error={!!errors.itemCode}
                                        helperText={errors.itemCode?.message}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid size={{xs: 12, md: 6}}>
                            <Controller
                                name="sku"
                                control={control}
                                render={({field}) => (
                                    <StyledTextField
                                        {...field}
                                        fullWidth
                                        label="SKU (Optional)"
                                        type="number"
                                        error={!!errors.sku}
                                        helperText={errors.sku?.message}
                                    />
                                )}
                            />
                        </Grid>
                    </Grid>
                    <CustomButton
                        title={isLoading
                            ? isEditMode
                                ? "Saving..."
                                : "Adding..."
                            : isEditMode
                                ? "Save Changes"
                                : "Add Menu"}
                        sx={{mt: 2}}
                        variant="contained"
                        type="submit"
                        disabled={isLoading}
                    />

                </Box>
            </Box>
        </CustomModal>
    );
};

export default MenuItemFormModal;
