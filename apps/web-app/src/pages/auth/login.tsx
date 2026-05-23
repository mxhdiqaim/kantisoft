import {getApiError} from "@/helpers/get-api-error";
import useNotifier from "@/hooks/useNotifier";
import {useLoginMutation} from "@/store/slice";
import {loginUserType, type LoginUserType} from "@/types/user-types";
import {yupResolver} from "@hookform/resolvers/yup";
import {Box, FormControl, FormHelperText, Grid, Link as MuiLink, Typography, useTheme} from "@mui/material";

import {Controller, useForm} from "react-hook-form";
import {Link, useNavigate} from "react-router-dom";
import CustomButton from "@/components/ui/button.tsx";
import {StyledTextField} from "@/components/ui";

import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "@/config/firebase";

const Login = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    // const location = useLocation();
    const notify = useNotifier();
    const [login, { isLoading: isBackendLoading }] = useLoginMutation();

    const {
        control,
        setError,
        handleSubmit,
        formState: { errors },
    } = useForm({
        defaultValues: {
            email: "",
            password: "",
        },
        mode: "onBlur",
        resolver: yupResolver(loginUserType),
    });

    const onSubmit = async (data: LoginUserType) => {
        try {
            // Authenticate with Firebase
            const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);

            // Get the ID Token
            const token = await userCredential.user.getIdToken();

            // Send the token to your Kantisoft Backend
            await login({ token }).unwrap();

            navigate("/", { replace: true });
        } catch (err) {

            if (auth.currentUser) {
                await signOut(auth);
            }
            // Use the getApiError helper for clean, consistent error parsing
            const defaultMessage = "Something went wrong. Please try again.";
            const errorMessage = err.code ? err.message : getApiError(err, defaultMessage).message;

            notify(errorMessage, "error");

            setError("email", { type: "manual" });
            setError("password", { type: "manual" });
        }
    };

    // const loading = isSubmitting || isBackendLoading;

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
                <Box
                    sx={{
                        width: "100%",
                        maxWidth: {
                            xs: "100%",
                            sm: "400px",
                        },
                    }}
                >
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
                                rules={{ required: true }}
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
                                rules={{ required: true }}
                                render={({ field: { value, onChange, onBlur } }) => (
                                    <StyledTextField
                                        value={value}
                                        onBlur={onBlur}
                                        label="Password"
                                        onChange={onChange}
                                        id="auth-login-v2-password"
                                        error={Boolean(errors.password)}
                                        type={"password"}
                                        sx={{ borderRadius: theme.borderRadius.small }}
                                    />
                                )}
                            />
                            {errors.password && (
                                <FormHelperText sx={{ color: "error.main" }} id="">
                                    {errors.password.message}
                                </FormHelperText>
                            )}
                        </FormControl>
                        <Box
                            sx={{
                                display: "flex",
                                justifyContent: "flex-end",
                                my: 3,
                            }}
                        >
                            <MuiLink component={Link} to="/forget-password" sx={{ textDecoration: "none" }}>
                                Forgot Password?
                            </MuiLink>
                        </Box>
                        <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
                            <CustomButton
                                title={isBackendLoading ? "Logging in..." : "Login"}
                                type="submit"
                                variant="contained"
                                sx={{
                                    width: "100%", // Make the button full width
                                    color: "#fff",
                                    p: 2,
                                    mb: 2,
                                }}
                                disabled={isBackendLoading}
                            />
                        </Box>
                    </Box>
                </Box>
            </Grid>
        </Grid>
    );
};

export default Login;
