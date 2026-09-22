import { Box, Typography } from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { useCreateBusinessMutation } from "@/modules/iam/api/business.api";
import { useUser, useAuth } from "@clerk/react";
import { useNavigate } from "react-router-dom";
import { useNotification } from "@/shared/hooks";
import { CustomButton, StyledTextField } from "@/shared/components";
import type { CreateBusinessType } from "@/modules/iam/types";

const OnboardingPage = () => {
    const { mutateAsync: createBusiness, isPending } = useCreateBusinessMutation();
    const { user } = useUser();
    const { getToken } = useAuth();
    const navigate = useNavigate();
    const { success, error: notifyError } = useNotification();

    const { control, handleSubmit } = useForm({ defaultValues: { name: "" } });

    const onSubmit = async (data: CreateBusinessType) => {
        try {
            // Tell backend to create the business (backend MUST update Clerk metadata!)
            await createBusiness(data);

            // Force Clerk to fetch a new JWT from the server so the browser gets the new businessId
            await getToken({ skipCache: true });

            // Force the local Clerk user object to reload its metadata
            await user?.reload();

            success("Business created! Welcome to Kantisoft.");

            navigate("/", { replace: true });
            // eslint-disable-next-line
        } catch (err) {
            notifyError("Failed to create workspace.");
        }
    };

    return (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
            <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ width: "400px" }}>
                <Typography variant="h4" mb={2}>
                    Let&#39;s set up your business
                </Typography>
                <Typography variant="body1" mb={4}>
                    What is the name of your business?
                </Typography>

                <Controller
                    name="name"
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                        <StyledTextField {...field} label="Business Name" fullWidth sx={{ mb: 3 }} />
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
    );
};

export default OnboardingPage;
