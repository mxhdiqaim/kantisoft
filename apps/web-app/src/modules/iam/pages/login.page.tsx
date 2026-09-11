import { loginUserType, type LoginUserType } from "@/types/user-types";
import { yupResolver } from "@hookform/resolvers/yup";
import { Box, FormControl, FormHelperText, Grid, Link as MuiLink, Typography, useTheme } from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import CustomButton from "@/shared/components/ui/button";
import { StyledTextField } from "@/shared/components/ui";
import { useSignIn } from "@clerk/react";
import { useSyncProfileMutation } from "@/modules/iam/api/auth.api";
import { useNotification } from "@/shared";
import { parseApiErrorUtil } from "@/shared/utils/parse-api-error.util.ts";

const LoginPage = () => {
    const theme = useTheme();
    const navigate = useNavigate();

    const { warning: notifyWarning, error: notifyError } = useNotification();

    const { signIn, fetchStatus } = useSignIn();

    // TanStack Query hook
    const { mutateAsync: syncProfile, isPending: isSyncing } = useSyncProfileMutation();

    const {
        control,
        setError,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm({
        defaultValues: {
            email: "",
            password: "",
        },
        mode: "onBlur",
        resolver: yupResolver(loginUserType),
    });

    const isLoading = isSubmitting || isSyncing || fetchStatus === "fetching";

    const onSubmit = async (data: LoginUserType) => {
        try {
            const result = await signIn.password({
                identifier: data.email,
                password: data.password,
            });

            if (result.error) {
                console.warn("Clerk sign in requires further action:", result);
                notifyWarning("Further verification required (e.g., MFA).");
            } else {
                // Finalize sets the active session in the browser
                await signIn.finalize();

                // Fetch user profile from Kantisoft backend and save to Zustand
                await syncProfile();

                // Redirect home
                navigate("/", { replace: true });
            }
            // eslint-disable-next-line
        } catch (error: any) {
            console.error("Login failed:", error);

            const apiError = parseApiErrorUtil(error, "Invalid email or password.");

            notifyError(apiError.message);

            setError("email", { type: "manual" });
            setError("password", { type: "manual" });
        }
    };

    return (
        <Grid container spacing={2}>
            <Grid
                size={12}
                sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    minHeight: "100vh",
                    m: { xs: 3, md: 0 },
                }}
            >
                <Box sx={{ width: "100%", maxWidth: { xs: "100%", sm: "400px" } }}>
                    <Box sx={{ textAlign: "center", mb: 5 }}>
                        <Typography variant={"h5"} sx={{ fontWeight: 500 }}>
                            Welcome Back! Login to your account
                        </Typography>
                    </Box>
                    <Box component={"form"} noValidate autoComplete="off" onSubmit={handleSubmit(onSubmit)}>
                        <FormControl fullWidth>
                            <Controller
                                name="email"
                                control={control}
                                render={({ field: { value, onChange, onBlur } }) => (
                                    <StyledTextField
                                        autoFocus
                                        label="Email"
                                        value={value}
                                        onBlur={onBlur}
                                        onChange={onChange}
                                        error={Boolean(errors.email)}
                                        placeholder="example@gmail.com"
                                        sx={{ borderRadius: theme.borderRadius.small }}
                                    />
                                )}
                            />
                            {errors.email && (
                                <FormHelperText sx={{ color: "error.main" }}>{errors.email.message}</FormHelperText>
                            )}
                        </FormControl>
                        <FormControl fullWidth sx={{ mt: 3 }}>
                            <Controller
                                name="password"
                                control={control}
                                render={({ field: { value, onChange, onBlur } }) => (
                                    <StyledTextField
                                        value={value}
                                        onBlur={onBlur}
                                        label="Password"
                                        onChange={onChange}
                                        type={"password"}
                                        error={Boolean(errors.password)}
                                        sx={{ borderRadius: theme.borderRadius.small }}
                                    />
                                )}
                            />
                            {errors.password && (
                                <FormHelperText sx={{ color: "error.main" }}>{errors.password.message}</FormHelperText>
                            )}
                        </FormControl>
                        <Box sx={{ display: "flex", justifyContent: "flex-end", my: 3 }}>
                            <MuiLink component={Link} to="/forget-password" sx={{ textDecoration: "none" }}>
                                Forgot Password?
                            </MuiLink>
                        </Box>
                        <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
                            <CustomButton
                                title={isLoading ? "Signing in..." : "Sign in"}
                                type="submit"
                                variant="contained"
                                sx={{ width: "100%", color: "#fff", p: 2, mb: 2 }}
                                disabled={isLoading}
                            />
                        </Box>
                        <Box sx={{ textAlign: "center" }}>
                            <Typography variant="body1">
                                Don&#39;t have an account?{" "}
                                <CustomButton title={"Sign Up"} variant="text" onClick={() => navigate("/signup")} />
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            </Grid>
        </Grid>
    );
};

export default LoginPage;
