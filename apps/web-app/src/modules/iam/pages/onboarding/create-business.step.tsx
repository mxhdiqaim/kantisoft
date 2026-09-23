import { Box, CircularProgress, Typography, useTheme } from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { useCreateBusinessMutation } from "@/modules/iam/api/business.api";
import { useUser, useAuth, useClerk } from "@clerk/react";
import { useNavigate } from "react-router-dom";
import { useNotification } from "@/shared/hooks";
import { CustomButton, StyledTextField } from "@/shared/components";
import type { CreateBusinessType } from "@/modules/iam/types";
import { useAuthStore } from "@/modules/iam/store";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { LogoutOutlined } from "@mui/icons-material";

const CreateBusinessStep = () => {
    const { mutateAsync: createBusiness, isPending } = useCreateBusinessMutation();
    const { user } = useUser();
    const { getToken } = useAuth();
    const theme = useTheme();

    const navigate = useNavigate();
    const { success, error: notifyError } = useNotification();

    const logOut = useAuthStore((state) => state.logOut);

    const { signOut } = useClerk();
    const queryClient = useQueryClient();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const { control, handleSubmit } = useForm({ defaultValues: { name: "" } });

    const handleLogout = async () => {
        try {
            setIsLoggingOut(true);
            await signOut();
            logOut();
            queryClient.clear();
            navigate("/login");
        } catch (error) {
            console.error("Signout failed:", error);
        } finally {
            setIsLoggingOut(false);
        }
    };

    const onSubmit = async (data: CreateBusinessType) => {
        try {
            await createBusiness(data);
            await getToken({ skipCache: true });
            await user?.reload();

            success("Business created! Now let's set up a branch.");

            // Once business is created, send them to the next step!
            navigate("/onboarding/create-branch", { replace: true });
        } catch (error) {
            notifyError(error);
        }
    };

    return (
        <Box
            sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "100vh",
                bgcolor: theme.palette.background.default,
                position: "relative",
            }}
        >
            <Box
                sx={{
                    width: "100%",
                    maxWidth: "md",
                    p: 4,
                    bgcolor: "background.paper",
                    borderRadius: 2,
                    boxShadow: theme.customShadows?.card || 1,
                }}
            >
                <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ width: "100%" }}>
                    <Typography variant="h4" mb={2}>
                        Let&#39;s set up your business
                    </Typography>
                    <Typography variant="body1" mb={4} color="text.secondary">
                        What is the name of your business?
                    </Typography>

                    <Controller
                        name="name"
                        control={control}
                        rules={{ required: true }}
                        render={({ field }) => (
                            <StyledTextField {...field} label="Business Name" fullWidth sx={{ mb: 4 }} />
                        )}
                    />

                    <CustomButton
                        type="submit"
                        title={isPending ? "Creating..." : "Create Business"}
                        fullWidth
                        variant="contained"
                        disabled={isPending}
                    />
                </Box>
            </Box>
            <Box position={"absolute"} bottom={0} left={0} width={theme.layout.sidebarWidth - 25} p={2}>
                <CustomButton
                    title={isLoggingOut ? "Logging out..." : "Logout"}
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    variant="contained"
                    startIcon={isLoggingOut ? <CircularProgress size={20} color="inherit" /> : <LogoutOutlined />}
                    sx={{
                        width: "100%",
                        backgroundColor: theme.palette.error.main,
                        color: theme.palette.error.contrastText,
                        justifyContent: "flex-start",
                        py: 1.5,
                        px: 2,
                        boxShadow: theme.customShadows?.button || 2,
                        transition: theme.transitions.create(["background-color", "transform"], {
                            duration: theme.transitions.duration.short,
                        }),
                        "&:hover": {
                            backgroundColor: theme.palette.error.dark,
                            transform: "scale(1.02)",
                        },
                    }}
                />
            </Box>
        </Box>
    );
};

export default CreateBusinessStep;
