import {useAppSelector} from "@/store";
import {selectCurrentUser} from "@/store/slice/auth-slice";
import {Avatar, Box, Chip, Divider, Grid, Stack, Typography} from "@mui/material";
import {useNavigate} from "react-router-dom";
import {getRoleChipColor} from "@/utils";
import {useGetUserByIdQuery} from "@/store/slice";
import ViewUserSkeleton from "@/components/profile/loading";
import ApiErrorDisplay from "@/components/feedback/api-error-display";
import {getApiError} from "@/helpers/get-api-error";
import {selectActiveStore} from "@/store/slice/store-slice";
import {useSelector} from "react-redux";
import CustomButton from "@/components/ui/button.tsx";
import CustomCard from "@/components/customs/custom-card.tsx";
import UserUpdateForm from "@/components/users/user-update-form.tsx";
import {useState} from "react";

import {
    ArrowBackIosNewOutlined,
    EditOutlined,
    EmailOutlined,
    PhoneOutlined,
    StorefrontOutlined,
} from "@mui/icons-material";

const ProfilePage = () => {
    const navigate = useNavigate();

    const currentUser = useAppSelector(selectCurrentUser);
    const activeStore = useSelector(selectActiveStore);

    const [openUpdateUserModal, setOpenUpdateUserModal] = useState(false);

    // Fetch the latest user data to ensure it's up to date
    const {
        data: user,
        isLoading,
        isError,
        error,
    } = useGetUserByIdQuery(currentUser?.id as string, {
        skip: !currentUser, // Skip the query if the user is not logged in
    });

    const handleOpenUpdateUserModal = () => {
        setOpenUpdateUserModal(true);
    };

    const handleCloseUpdateUserModal = () => {
        setOpenUpdateUserModal(false);
    };

    if (isLoading) {
        return <ViewUserSkeleton/>;
    }

    if (isError || !user) {
        const apiError = getApiError(error, "Failed to load your profile.");
        return <ApiErrorDisplay statusCode={apiError.type} message={apiError.message}/>;
    }

    return (
        <Box>
            <CustomButton
                startIcon={<ArrowBackIosNewOutlined fontSize="small"/>}
                title={"Go Back"}
                onClick={() => navigate(-1)} sx={{mb: 2}}
            />
            <Typography variant="h4" gutterBottom>
                My Profile
            </Typography>
            <Grid container spacing={3}>
                <Grid size={{xs: 12, md: 4}}>
                    <CustomCard>
                        <Box sx={{textAlign: "center", p: 1}}>
                            <Avatar
                                sx={{
                                    width: 60,
                                    height: 60,
                                    margin: "auto",
                                    mb: 2,
                                    backgroundColor: "primary.main",
                                    fontSize: "1.5rem",
                                }}
                            >
                                {user.firstName.charAt(0).toUpperCase()}
                            </Avatar>
                            <Typography variant="h5" gutterBottom>
                                {user.firstName} {user.lastName}
                            </Typography>
                            <Chip
                                label={user.role}
                                color={getRoleChipColor(user.role)}
                                size="medium"
                                sx={{textTransform: "capitalize", fontWeight: "bold"}}
                            />
                        </Box>
                        <Divider/>
                        <Stack
                            direction={"column"}
                            spacing={2}
                            sx={{mt: 1}}
                        >
                            <CustomButton
                                title={"Edit Profile"}
                                variant="contained"
                                startIcon={<EditOutlined/>}
                                onClick={handleOpenUpdateUserModal}
                            />
                            <CustomButton
                                title={"Change Password"}
                                variant="outlined"
                                startIcon={<EditOutlined/>}
                                onClick={() => navigate(`/admin/users/change-password`)}
                            />
                        </Stack>
                    </CustomCard>
                </Grid>

                <Grid size={{xs: 12, md: 8}}>
                    <CustomCard>
                        <Box>
                            <Typography variant="h6" gutterBottom>
                                Profile Details
                            </Typography>
                            <Divider sx={{mb: 3}}/>
                            <Grid container spacing={3}>
                                <Grid size={{xs: 12, sm: 6}}>
                                    <Box display="flex" alignItems="center">
                                        <EmailOutlined color="action" sx={{mr: 1.5}}/>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">
                                                Email
                                            </Typography>
                                            <Typography fontWeight="medium">{user.email}</Typography>
                                        </Box>
                                    </Box>
                                </Grid>
                                <Grid size={{xs: 12, sm: 6}}>
                                    <Box display="flex" alignItems="center">
                                        <PhoneOutlined color="action" sx={{mr: 1.5}}/>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">
                                                Phone
                                            </Typography>
                                            <Typography fontWeight="medium">{user.phone || "Not provided"}</Typography>
                                        </Box>
                                    </Box>
                                </Grid>
                                <Grid size={{xs: 12, sm: 6}}>
                                    <Box display="flex" alignItems="center">
                                        <StorefrontOutlined color="action" sx={{mr: 1.5}}/>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">
                                                Store
                                            </Typography>
                                            <Typography fontWeight="medium">{activeStore?.name || "N/A"}</Typography>
                                        </Box>
                                    </Box>
                                </Grid>
                            </Grid>
                        </Box>
                    </CustomCard>
                </Grid>
            </Grid>

            {user && (
                <UserUpdateForm
                    open={openUpdateUserModal}
                    onClose={handleCloseUpdateUserModal}
                    currentData={user}
                />
            )}
        </Box>
    );
};

export default ProfilePage;
