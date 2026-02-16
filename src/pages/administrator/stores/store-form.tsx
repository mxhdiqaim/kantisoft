import {getApiError} from "@/helpers/get-api-error.ts";
import useNotifier from "@/hooks/useNotifier.ts";
import {useCreateStoreMutation, useGetStoreByIdQuery, useUpdateStoreMutation} from "@/store/slice";
import {createStoreSchema, type CreateStoreType, STORE_TYPES} from "@/types/store-types.ts";
import {yupResolver} from "@hookform/resolvers/yup";
import {FormControl, Grid, InputAdornment, MenuItem} from "@mui/material";
import {useEffect} from "react";
import {Controller, useForm} from "react-hook-form";
import {useParams} from "react-router-dom";
import StoreFormLoading from "@/components/stores/loading/store-form-loading.tsx";
import CustomModal from "@/components/customs/custom-modal.tsx";
import {StyledTextField} from "@/components/ui";
import CustomButton from "@/components/ui/button.tsx";

import Icon from "@/components/ui/icon.tsx";
import ArrowDownIconSvg from "@/assets/icons/arrow-down.svg";

interface Props {
    open: boolean;
    onClose: () => void;
}

const StoreForm = ({open, onClose}: Props) => {
    const {id} = useParams<{ id: string }>();
    const isEditMode = !!id;
    const notify = useNotifier();

    const {data: storeData, isLoading: isFetching} = useGetStoreByIdQuery(id!, {skip: !isEditMode});
    const [createStore, {isLoading: isCreating}] = useCreateStoreMutation();
    const [updateStore, {isLoading: isUpdating}] = useUpdateStoreMutation();

    const {
        control,
        handleSubmit,
        formState: {errors},
        reset,
    } = useForm({
        defaultValues: {name: "", location: "", storeType: "restaurant"},

        resolver: yupResolver(createStoreSchema),
    });

    useEffect(() => {
        if (isEditMode && storeData) {
            reset({
                name: storeData.name,
                location: storeData.location || "",
                storeType: storeData.storeType,
            });
        }
    }, [isEditMode, storeData, reset]);

    const onSubmit = async (formData: CreateStoreType) => {
        try {
            if (isEditMode) {
                await updateStore({id: id!, ...formData}).unwrap();
                notify("Store updated successfully!", "success");
            } else {
                await createStore(formData).unwrap();
                notify("Store created successfully!", "success");
            }

            onClose();
        } catch (error) {
            const defaultMessage = isEditMode ? "Failed to update store" : "Failed to create store";
            const apiError = getApiError(error, defaultMessage);
            notify(apiError.message, "error");
        }
    };
    const isLoading = isCreating || isUpdating;

    return (
        <CustomModal
            open={open}
            onClose={onClose}
            title={isEditMode ? "Edit Store" : "Create New Store"}
        >
            {isFetching ? <StoreFormLoading/> : (
                <Grid container spacing={2} component="form" onSubmit={handleSubmit(onSubmit)}>
                    <Grid size={12}>
                        <Controller
                            name="name"
                            control={control}
                            render={({field}) => (
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
                            render={({field}) => (
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
                            render={({field}) => (
                                <FormControl fullWidth>
                                    <StyledTextField
                                        {...field}
                                        select
                                        label="Branch Type"
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
                                        error={Boolean(errors.storeType)}
                                        helperText={errors.storeType?.message}
                                    >
                                        <MenuItem value={""} disabled>
                                            Select Branch Type
                                        </MenuItem>
                                        {STORE_TYPES.map((type) => (
                                            <MenuItem
                                                key={type}
                                                value={type}
                                                sx={{textTransform: "capitalize"}}
                                            >
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
                            title={isLoading
                                ? isEditMode
                                    ? "Updating..."
                                    : "Creating..."
                                : isEditMode
                                    ? "Update Store"
                                    : "Create Store"}
                            variant="contained"
                            type="submit"
                            disabled={isLoading}
                        />
                    </Grid>
                </Grid>
            )}
        </CustomModal>
    );
};

export default StoreForm;
