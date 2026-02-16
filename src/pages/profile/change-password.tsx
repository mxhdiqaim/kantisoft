import {useState} from "react";
import {Box, IconButton, InputAdornment, Typography} from "@mui/material";
import {Controller, useForm} from "react-hook-form";
import useNotifier from "@/hooks/useNotifier";
import {useNavigate} from "react-router-dom";
import {useUpdatePasswordMutation} from "@/store/slice";
import {getApiError} from "@/helpers/get-api-error";
import CustomButton from "@/components/ui/button.tsx";
import CustomCard from "@/components/customs/custom-card.tsx";
import {StyledTextField} from "@/components/ui";
import {yupResolver} from "@hookform/resolvers/yup";
import {updatePasswordSchema, type UpdatePasswordType} from "@/types/user-types.ts";
import ApiErrorDisplay from "@/components/feedback/api-error-display.tsx";

import {ArrowBackIosNewOutlined, Visibility, VisibilityOff} from "@mui/icons-material";

const ChangePasswordScreen = () => {
    const notify = useNotifier();
    const navigate = useNavigate();

    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);

    const [updatePassword, {isLoading, error, isError}] = useUpdatePasswordMutation();

    const {
        handleSubmit,
        control,
        reset,
        formState: {errors, isSubmitting},
    } = useForm({
        mode: "onChange",
        defaultValues: {
            oldPassword: "",
            newPassword: "",
            confirmNewPassword: "",
        },

        resolver: yupResolver(updatePasswordSchema),
    });

    const onSubmit = async (data: UpdatePasswordType) => {
        try {
            const payload = {
                oldPassword: data.oldPassword as string,
                newPassword: data.newPassword as string,
            };

            await updatePassword({...payload}).unwrap();
            notify("Password changed successfully!", "success");
            reset();
        } catch (error) {
            const defaultMessage = `Failed to change password: ${error.message}`;
            const apiError = getApiError(error, defaultMessage);

            notify(apiError.message, "error");
        }
    };

    if (isError) {
        const apiError = getApiError(error, "Failed to change Password. Please try again later.");
        notify(apiError.message, "error");
        return <ApiErrorDisplay statusCode={apiError.type} message={apiError.message}/>;
    }


    return (
        <Box component={"form"} onSubmit={handleSubmit(onSubmit)} noValidate>
            <CustomButton
                title={"Go Back"}
                startIcon={<ArrowBackIosNewOutlined fontSize="small" sx={{mr: 0.5}}/>}
                onClick={() => navigate(-1)}
                sx={{mb: 2}}
            />
            <CustomCard sx={{p: 1}}>
                <Typography variant="h5">
                    Change Password
                </Typography>
                <Box>
                    <Controller
                        name="oldPassword"
                        control={control}
                        rules={{required: "Current password is required"}}
                        render={({field}) => (
                            <StyledTextField
                                {...field}
                                label="Current Password"
                                type={showOldPassword ? "text" : "password"}
                                fullWidth
                                margin="normal"
                                error={!!errors.oldPassword}
                                helperText={errors.oldPassword?.message}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton onClick={() => setShowOldPassword((show) => !show)} edge="end">
                                                {showOldPassword ? <VisibilityOff/> : <Visibility/>}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        )}
                    />
                    <Controller
                        name="newPassword"
                        control={control}
                        render={({field}) => (
                            <StyledTextField
                                {...field}
                                label="New Password"
                                type={showNewPassword ? "text" : "password"}
                                fullWidth
                                margin="normal"
                                error={!!errors.newPassword}
                                helperText={errors.newPassword?.message}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton onClick={() => setShowNewPassword((show) => !show)} edge="end">
                                                {showNewPassword ? <VisibilityOff/> : <Visibility/>}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        )}
                    />
                    <Controller
                        name="confirmNewPassword"
                        control={control}
                        render={({field}) => (
                            <StyledTextField
                                {...field}
                                label="Confirm New Password"
                                type={showNewPassword ? "text" : "password"}
                                fullWidth
                                margin="normal"
                                error={!!errors.confirmNewPassword}
                                helperText={errors.confirmNewPassword?.message}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton onClick={() => setShowNewPassword((show) => !show)} edge="end">
                                                {showNewPassword ? <VisibilityOff/> : <Visibility/>}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        )}
                    />
                    <CustomButton
                        title={"Change Password"}
                        type="submit"
                        variant="contained"
                        color="primary"
                        disabled={isLoading || isSubmitting}
                    />
                </Box>
            </CustomCard>
        </Box>
    );
};

export default ChangePasswordScreen;
