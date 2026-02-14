import {getApiError} from "@/helpers/get-api-error";
import useNotifier from "@/hooks/useNotifier";
import {useGetAllStoresQuery, useUpdateUserMutation} from "@/store/slice";
import {selectCurrentUser} from "@/store/slice/auth-slice";
import type {StoreType} from "@/types/store-types";
import {updateUserSchema, type UpdateUserType, UserRoleEnum, type UserType,} from "@/types/user-types";
import {yupResolver} from "@hookform/resolvers/yup";
import {Box, FormControl, Grid, InputAdornment, MenuItem, TextField} from "@mui/material";
import {useEffect} from "react";
import {Controller, useForm} from "react-hook-form";
import {useSelector} from "react-redux";
import CustomButton from "@/components/ui/button.tsx";
import {StyledTextField} from "@/components/ui";
import CustomModal from "@/components/customs/custom-modal.tsx";
import {getRolePermissions} from "@/utils";

import Icon from "@/components/ui/icon.tsx";
import ArrowDownIconSvg from "@/assets/icons/arrow-down.svg";

interface Props {
    open: boolean;
    onClose: () => void;
    currentData: UserType;
}

const UserUpdateForm = ({open, onClose, currentData}: Props) => {
    const notify = useNotifier();
    const currentUser = useSelector(selectCurrentUser);

    const {data: stores} = useGetAllStoresQuery();

    const [updateUser, {isLoading: isUpdating, isSuccess: isUpdated}] = useUpdateUserMutation();
    const isLoading = isUpdating;

    const {
        control,
        handleSubmit,
        reset,
        formState: {errors},
    } = useForm({
        mode: "onChange",
        defaultValues: {},

        resolver: yupResolver(updateUserSchema),
    });

    useEffect(() => {
        if (!open) {
            reset({
                firstName: "",
                lastName: "",
                email: "",
                phone: "",
                role: UserRoleEnum.GUEST,
                storeId: "",
                // password: "",
                // confirmPassword: "",
            });
        }
    }, [open, reset]);

    useEffect(() => {
        if (open && currentData) {
            reset({
                firstName: currentData?.firstName,
                lastName: currentData?.lastName,
                email: currentData?.email,
                phone: currentData?.phone,
                role: currentData?.role,
                storeId: currentData?.storeId,
            });
        }
    }, [currentData, open, reset]);

    useEffect(() => {
        if (isUpdated) {
            onClose();
            reset();
        }
    }, [isUpdated, onClose, reset]);

    const onSubmit = async (data: Partial<UpdateUserType>) => {
        try {
            const payload = {...data};
            // if (!payload.password) {
            //     delete payload.password
            //     delete payload.confirmPassword
            // }

            await updateUser({id: currentData.id, ...payload}).unwrap();
            notify("User updated successfully!", "success");

            onClose();
        } catch (error) {
            const defaultMessage = `Failed to create user.`;
            const apiError = getApiError(error, defaultMessage);
            notify(apiError.message, "error");
        }
    };

    // Getting permissions
    const {availableRoles, canEditRole} = getRolePermissions(currentUser?.role);

    return (
        <CustomModal
            open={open}
            onClose={onClose}
            title={"Edit User"}
            modalStyles={{
                width: {xs: "90vw", sm: "60vw"},
            }}
        >
            <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{mt: 2}}>
                <Grid container spacing={3}>
                    <Grid size={{xs: 12, sm: 6}}>
                        <Controller
                            name="firstName"
                            control={control}
                            render={({field}) => (
                                <FormControl fullWidth>
                                    <StyledTextField
                                        {...field}
                                        fullWidth
                                        label="First Name"
                                        error={!!errors.firstName}
                                        helperText={errors.firstName?.message}
                                    />
                                </FormControl>
                            )}
                        />
                    </Grid>
                    <Grid size={{xs: 12, sm: 6}}>
                        <Controller
                            name="lastName"
                            control={control}
                            render={({field}) => (
                                <FormControl fullWidth>
                                    <StyledTextField
                                        {...field}
                                        fullWidth
                                        label="Last Name"
                                        error={!!errors.lastName}
                                        helperText={errors.lastName?.message}
                                    />
                                </FormControl>
                            )}
                        />
                    </Grid>
                    <Grid size={{xs: 12, sm: 6}}>
                        <Controller
                            name="email"
                            control={control}
                            render={({field}) => (
                                <FormControl fullWidth>
                                    <StyledTextField
                                        {...field}
                                        fullWidth
                                        label="Email Address"
                                        type="email"
                                        error={!!errors.email}
                                        helperText={errors.email?.message}
                                    />
                                </FormControl>
                            )}
                        />
                    </Grid>
                    <Grid size={{xs: 12, sm: 6}}>
                        <Controller
                            name="phone"
                            control={control}
                            render={({field}) => (
                                <FormControl fullWidth>
                                    <StyledTextField
                                        {...field}
                                        fullWidth
                                        label="Phone Number (Optional)"
                                        error={!!errors.phone}
                                        helperText={errors.phone?.message}
                                    />
                                </FormControl>
                            )}
                        />
                    </Grid>
                    {canEditRole && (
                        <Grid size={{xs: 12, sm: 6}}>
                            {canEditRole ? (
                                <FormControl fullWidth error={!!errors.role}>
                                    <Controller
                                        name="role"
                                        control={control}
                                        render={({field}) => (
                                            <FormControl fullWidth>
                                                <StyledTextField
                                                    {...field}
                                                    select
                                                    label="Role"
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
                                                    error={Boolean(errors.role)}
                                                    helperText={errors.role?.message}
                                                >
                                                    <MenuItem value={""} disabled>
                                                        Select Role
                                                    </MenuItem>
                                                    {availableRoles.map((role) => (
                                                        <MenuItem
                                                            key={role}
                                                            value={role}
                                                            sx={{textTransform: "capitalize"}}
                                                        >
                                                            {role}
                                                        </MenuItem>
                                                    ))}
                                                </StyledTextField>
                                            </FormControl>
                                        )}
                                    />
                                </FormControl>
                            ) : (
                                <FormControl fullWidth>
                                    <TextField
                                        label="Role"
                                        value={currentData?.role || currentUser?.role}
                                        fullWidth
                                        slotProps={{
                                            input: {
                                                readOnly: true
                                            }
                                        }}
                                        disabled
                                    />
                                </FormControl>
                            )}
                        </Grid>
                    )}
                    {currentUser?.role === UserRoleEnum.MANAGER && (
                        <Grid size={{xs: 12, sm: 6}}>
                            <FormControl fullWidth error={!!errors.storeId}>
                                <Controller
                                    name="storeId"
                                    control={control}
                                    render={({field}) => (
                                        <FormControl fullWidth>
                                            <StyledTextField
                                                {...field}
                                                select
                                                label="Assign Store"
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
                                                error={Boolean(errors.storeId)}
                                                helperText={errors.storeId?.message}
                                            >
                                                <MenuItem value={""} disabled>
                                                    Select Store
                                                </MenuItem>
                                                {stores?.map((store: StoreType) => (
                                                    <MenuItem key={store.id} value={store.id}>
                                                        {store.name}
                                                    </MenuItem>
                                                ))}
                                            </StyledTextField>
                                        </FormControl>
                                    )}
                                />
                            </FormControl>
                        </Grid>
                    )}
                </Grid>
                <Box sx={{display: "flex", justifyContent: "flex-end", gap: 2, mt: 2}}>
                    <CustomButton title={"Cancel"} onClick={onClose} variant="outlined"/>
                    <CustomButton
                        title={isLoading ? "Saving..." : "Save Changes"}
                        variant="contained"
                        type="submit"
                        disabled={isLoading}
                    />
                </Box>
            </Box>
        </CustomModal>
    );
};

export default UserUpdateForm;
