import {getApiError} from "@/helpers/get-api-error";
import useNotifier from "@/hooks/useNotifier";
import {useCreateUserMutation, useGetAllStoresQuery} from "@/store/slice";
import {selectCurrentUser} from "@/store/slice/auth-slice";
import type {StoreType} from "@/types/store-types";
import {createUserSchema, type CreateUserType, UserRoleEnum} from "@/types/user-types";
import {yupResolver} from "@hookform/resolvers/yup";
import {Visibility, VisibilityOff} from "@mui/icons-material";
import {Box, FormControl, Grid, IconButton, InputAdornment, MenuItem, TextField} from "@mui/material";
import {useEffect, useState} from "react";
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
}

const UserCreateForm = ({open, onClose}: Props) => {
    const notify = useNotifier();
    const currentUser = useSelector(selectCurrentUser);
    const [showPassword, setShowPassword] = useState(false);

    const {data: stores} = useGetAllStoresQuery();

    const [createUser, {isLoading: isCreating, isSuccess: isCreated}] = useCreateUserMutation();
    const isLoading = isCreating;

    const {
        control,
        handleSubmit,
        reset,
        formState: {errors},
    } = useForm({
        mode: "onChange",
        defaultValues: {},

        resolver: yupResolver(createUserSchema),
    });

    useEffect(() => {
        if (!open) {
            reset({
                firstName: "",
                lastName: "",
                email: "",
                phone: "",
                role: UserRoleEnum.USER,
                storeId: "",
                password: "",
                confirmPassword: "",
            });
        }
    }, [open, reset]);

    useEffect(() => {
        if (isCreated) {
            onClose();
            reset();
        }
    }, [isCreated, onClose, reset]);

    const onSubmit = async (data: CreateUserType) => {
        try {
            await createUser(data as CreateUserType).unwrap();
            notify("User created successfully!", "success");

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
            title={"Create New User"}
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
                    <Grid size={{xs: 12, sm: 6}}>
                        <Controller
                            name="password"
                            control={control}
                            render={({field}) => (
                                <FormControl fullWidth>
                                    <StyledTextField
                                        {...field}
                                        fullWidth
                                        label={"Password"}
                                        type={showPassword ? "text" : "password"}
                                        error={!!errors.password}
                                        helperText={errors.password?.message}
                                        slotProps={{
                                            input: {
                                                endAdornment: (
                                                    <InputAdornment position="end">
                                                        <IconButton
                                                            onClick={() => setShowPassword(!showPassword)}
                                                            edge="end"
                                                        >
                                                            {showPassword ? <VisibilityOff/> : <Visibility/>}
                                                        </IconButton>
                                                    </InputAdornment>
                                                )
                                            }
                                        }}
                                    />
                                </FormControl>
                            )}
                        />
                    </Grid>
                    <Grid size={{xs: 12, sm: 6}}>
                        <Controller
                            name="confirmPassword"
                            control={control}
                            render={({field}) => (
                                <FormControl fullWidth>
                                    <StyledTextField
                                        {...field}
                                        fullWidth
                                        label="Confirm Password"
                                        type={showPassword ? "text" : "password"}
                                        error={!!errors.confirmPassword}
                                        helperText={errors.confirmPassword?.message}
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
                                        value={currentUser?.role}
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
                        title={isLoading ? "Creating..." : "Create User"}
                        variant="contained"
                        type="submit"
                        disabled={isLoading}
                    />
                </Box>
            </Box>
        </CustomModal>
    );
};

export default UserCreateForm;
