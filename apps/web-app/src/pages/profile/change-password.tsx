import {useState} from "react";
import {Box, IconButton, InputAdornment, Typography} from "@mui/material";
import {Controller, useForm} from "react-hook-form";
import useNotifier from "@/hooks/useNotifier";
import {useNavigate} from "react-router-dom";
import CustomButton from "@/components/ui/button.tsx";
import CustomCard from "@/components/customs/custom-card.tsx";
import {StyledTextField} from "@/components/ui";
import {yupResolver} from "@hookform/resolvers/yup";
import {updatePasswordSchema, type UpdatePasswordType} from "@/types/user-types.ts";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { auth } from "@/config/firebase";

import {ArrowBackIosNewOutlined, Visibility, VisibilityOff} from "@mui/icons-material";

const ChangePasswordScreen = () => {
    const notify = useNotifier();
    const navigate = useNavigate();

    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [isFirebaseLoading, setIsFirebaseLoading] = useState(false);

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

    const isLoading = isFirebaseLoading || isSubmitting;

    const onSubmit = async (data: UpdatePasswordType) => {
        const user = auth.currentUser;

        if (!user || !user.email) {
            notify("You must be logged in to change your password.", "error");
            return;
        }

        setIsFirebaseLoading(true);

        try {
            // Re-authenticate the user with their current password
            const credential = EmailAuthProvider.credential(user.email, data.oldPassword);
            await reauthenticateWithCredential(user, credential);

            // If successful, update the password
            await updatePassword(user, data.newPassword);

            notify("Password changed successfully!", "success");
            reset();
        } catch (error) {
            // Handle specific Firebase errors
            if (error.code === "auth/invalid-credential") {
                notify("Your current password is incorrect.", "error");
            } else if (error.code === "auth/weak-password") {
                notify("Your new password is too weak.", "error");
            } else if (error.code === "auth/too-many-requests") {
                notify("Too many failed attempts. Please try again later.", "error");
            } else {
                notify("Failed to change password. Please try again.", "error");
            }
        } finally {
            setIsFirebaseLoading(false);
            navigate(-1)
        }
    };


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
