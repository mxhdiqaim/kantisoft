import { Box, FormControl, Grid, Typography, useTheme } from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { useCreateBusinessMutation } from "@/modules/iam/api/business.api";
import { useUser, useAuth } from "@clerk/react";
import { useNavigate } from "react-router-dom";
import { useNotification } from "@/shared/hooks";
import { CustomButton, LogoutButton, StyledTextField } from "@/shared/components";
import { createBusinessSchema, type CreateBusinessType } from "@/modules/iam/types";
import { yupResolver } from "@hookform/resolvers/yup";
import { parseApiError } from "@/shared/utils";

const CreateBusinessStep = () => {
    const { mutateAsync: createBusiness, isPending } = useCreateBusinessMutation();
    const { user } = useUser();
    const { getToken } = useAuth();
    const theme = useTheme();

    const navigate = useNavigate();
    const { success, error: notifyError } = useNotification();

    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm({
        resolver: yupResolver(createBusinessSchema),
        defaultValues: {
            businessName: "",
            countryId: "", // NOTE: User will need to select this from a dropdown in a real app
            addressId: "", // NOTE: Will also likely be a dropdown/lookup
            description: "",
            logoUrl: "",
            companyRegistrationNumber: "",
            teamSize: "",
            taxOrVatId: "",
        },
    });

    const onSubmit = async (data: CreateBusinessType) => {
        try {
            await createBusiness(data);

            // Force Clerk to refresh the session token so it contains the new businessId
            await getToken({ skipCache: true });
            await user?.reload();

            success("Business created! Now let's set up a branch.");

            // Proceed to the next step
            navigate("/onboarding/create-branch", { replace: true });
        } catch (error) {
            const apiError = parseApiError(error, "Failed to create business workspace.");
            notifyError(apiError.message);
        }
    };

    return (
        <Box
            sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "100vh",
                // bgcolor: theme.palette.background.default,
                bgcolor: "background.paper",
                position: "relative",
            }}
        >
            <Box
                sx={{
                    width: "100%",
                    maxWidth: "md",
                    p: 3,
                    borderRadius: 5,
                    bgcolor: theme.palette.background.default,
                    boxShadow: theme.customShadows?.card || 1,
                }}
            >
                <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ width: "100%" }}>
                    <Box mb={2}>
                        <Typography variant="h5" fontWeight="bold" mb={1}>
                            Let&#39;s set up your business
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Tell us a bit about your company to get your workspace ready.
                        </Typography>
                    </Box>

                    <Grid container spacing={3}>
                        {/* Full Width: Business Name */}
                        <Grid size={12}>
                            <Controller
                                name="businessName"
                                control={control}
                                render={({ field }) => (
                                    <FormControl fullWidth>
                                        <StyledTextField
                                            {...field}
                                            label="Business Name *"
                                            error={Boolean(errors.businessName)}
                                            helperText={errors.businessName?.message}
                                        />
                                    </FormControl>
                                )}
                            />
                        </Grid>

                        {/* Half Width: Country ID & Address ID */}
                        {/* 💡 TIP: In the future, replace these StyledTextFields with a Autocomplete/Select dropdown */}
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Controller
                                name="countryId"
                                control={control}
                                render={({ field }) => (
                                    <FormControl fullWidth>
                                        <StyledTextField
                                            {...field}
                                            label="Country *"
                                            error={Boolean(errors.countryId)}
                                            helperText={errors.countryId?.message}
                                        />
                                    </FormControl>
                                )}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Controller
                                name="addressId"
                                control={control}
                                render={({ field }) => (
                                    <FormControl fullWidth>
                                        <StyledTextField
                                            {...field}
                                            label="Address *"
                                            error={Boolean(errors.addressId)}
                                            helperText={errors.addressId?.message}
                                        />
                                    </FormControl>
                                )}
                            />
                        </Grid>

                        {/* Half Width: Registration & TAX ID */}
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Controller
                                name="companyRegistrationNumber"
                                control={control}
                                render={({ field }) => (
                                    <FormControl fullWidth>
                                        <StyledTextField
                                            {...field}
                                            label="Registration Number"
                                            error={Boolean(errors.companyRegistrationNumber)}
                                            helperText={errors.companyRegistrationNumber?.message}
                                        />
                                    </FormControl>
                                )}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Controller
                                name="taxOrVatId"
                                control={control}
                                render={({ field }) => (
                                    <FormControl fullWidth>
                                        <StyledTextField
                                            {...field}
                                            label="Tax or VAT ID"
                                            error={Boolean(errors.taxOrVatId)}
                                            helperText={errors.taxOrVatId?.message}
                                        />
                                    </FormControl>
                                )}
                            />
                        </Grid>

                        {/* Half Width: Team Size & Logo URL */}
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Controller
                                name="teamSize"
                                control={control}
                                render={({ field }) => (
                                    <FormControl fullWidth>
                                        <StyledTextField
                                            {...field}
                                            label="Team Size (e.g., 1-10)"
                                            error={Boolean(errors.teamSize)}
                                            helperText={errors.teamSize?.message}
                                        />
                                    </FormControl>
                                )}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Controller
                                name="logoUrl"
                                control={control}
                                render={({ field }) => (
                                    <FormControl fullWidth>
                                        <StyledTextField
                                            {...field}
                                            label="Logo"
                                            error={Boolean(errors.logoUrl)}
                                            helperText={errors.logoUrl?.message}
                                        />
                                    </FormControl>
                                )}
                            />
                        </Grid>

                        {/* Full Width: Description */}
                        <Grid size={12}>
                            <Controller
                                name="description"
                                control={control}
                                render={({ field }) => (
                                    <FormControl fullWidth>
                                        <StyledTextField
                                            {...field}
                                            label="Business Description"
                                            error={Boolean(errors.description)}
                                            helperText={errors.description?.message}
                                        />
                                    </FormControl>
                                )}
                            />
                        </Grid>
                    </Grid>

                    <Box sx={{ mt: 4, display: "flex", justifyContent: "flex-end" }}>
                        <CustomButton
                            type="submit"
                            title={isPending ? "Creating Business..." : "Create Business"}
                            variant="contained"
                            disabled={isPending}
                            sx={{ px: 4 }}
                        />
                    </Box>
                </Box>
            </Box>
            <Box position={"absolute"} bottom={0} left={0} width={theme.layout.sidebarWidth - 25} p={2}>
                <LogoutButton />
            </Box>
        </Box>
    );
};

export default CreateBusinessStep;
