import ApiErrorDisplay from "@/components/feedback/api-error-display.tsx";
import ViewUserSkeleton from "@/components/users/loading/view-user-skeleton.tsx";
import {getApiError} from "@/helpers/get-api-error.ts";
import useNotifier from "@/hooks/useNotifier.ts";
import {useAppSelector} from "@/store";
import {useDeleteUserMutation, useGetUserByIdQuery, useUpdateUserMutation} from "@/store/slice";
import {selectCurrentUser} from "@/store/slice/auth-slice.ts";
import {roleHierarchy, type UserRoleType, UserStatusEnum, type UserType} from "@/types/user-types.ts";
import {Avatar, Box, Chip, Divider, Grid, Typography} from "@mui/material";
import {format} from "date-fns";
import {type FC, useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import {getUserRoleChipColor, getUserStatusChipColor} from "@/components/ui";
import {drawerPaperProps} from "@/components/styles";
import DataDrawer from "@/components/ui/data-drawer.tsx";
import CustomCard from "@/components/customs/custom-card.tsx";
import {getInitials} from "@/utils";
import CustomButton from "@/components/ui/button.tsx";

import {BlockOutlined, DeleteOutline, EditOutlined} from "@mui/icons-material";

interface Props {
    open: boolean;
    onOpen: () => void;
    onClose: () => void;
    userId: string;
    handleEdit: () => void;
}

const ViewUserDrawer: FC<Props> = ({userId, open, onOpen, onClose, handleEdit}) => {
    const navigate = useNavigate();
    const notify = useNotifier();
    const currentUser = useAppSelector(selectCurrentUser);

    const [deleteTimer, setDeleteTimer] = useState<NodeJS.Timeout | null>(null);

    const {
        data: user,
        error,
        isLoading,
    } = useGetUserByIdQuery(userId as string, {
        skip: !userId || !open,
    });
    const [deleteUser, {isLoading: isDeleting}] = useDeleteUserMutation();
    const [updateUser, {isLoading: isUpdatingStatus}] = useUpdateUserMutation();

    const isSelf = currentUser?.id === (user as UserType)?.id;

    const handleStatusChange = async () => {
        if (!user) return;
        const newStatus = user.status === UserStatusEnum.ACTIVE ? UserStatusEnum.INACTIVE : UserStatusEnum.ACTIVE;
        try {
            await updateUser({id: user.id, status: newStatus}).unwrap();
            notify(`User has been ${newStatus}.`, "success");
        } catch (err) {
            const apiError = getApiError(err, "Failed to update user status.");
            notify(apiError.message, "error");
        }
    };

    const handleDelete = async () => {
        if (!user) return;
        notify("User will be deleted in 5 seconds.", "info");

        const timer = setTimeout(async () => {
            try {
                await deleteUser(user.id).unwrap();
                notify("User deleted successfully", "success");
                navigate("/users");
            } catch (err) {
                const apiError = getApiError(err, "Failed to delete user.");
                notify(apiError.message, "error");
            }
        }, 5000);

        setDeleteTimer(timer);
    };

    const handleUndoDelete = () => {
        if (deleteTimer) {
            clearTimeout(deleteTimer);
            setDeleteTimer(null);
            notify("Deletion cancelled.", "success");
        }
    };

    useEffect(() => {
        return () => {
            if (deleteTimer) clearTimeout(deleteTimer);
        };
    }, [deleteTimer]);

    if (error) {
        const apiError = getApiError(error, "Failed to load user data for editing.");
        notify(apiError.message, "error");
        return <ApiErrorDisplay statusCode={apiError.type} message={apiError.message}/>;
    }

    return (
        <DataDrawer
            title={"User Details"}
            anchor={"right"}
            open={open}
            onOpen={onOpen}
            onClose={onClose}
            PaperProps={drawerPaperProps}
        >
            {isLoading ? <ViewUserSkeleton/> : (
                <Grid container spacing={3}>
                    {/* User Profile Card */}
                    <Grid size={12}>
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
                                    {getInitials(user?.firstName, user?.lastName)}
                                </Avatar>
                                <Typography variant="h5">
                                    {user?.firstName} {user?.lastName}
                                </Typography>
                                <Typography sx={{mb: 1.5}} color="text.secondary">
                                    {user?.email}
                                </Typography>
                                <Chip
                                    label={user?.role}
                                    color={getUserRoleChipColor(user?.role)}
                                    size="medium"
                                    sx={{textTransform: "capitalize"}}
                                />
                            </Box>
                            <Divider/>
                            <Box sx={{p: 2, display: "flex", flexDirection: "column", gap: 1}}>
                                {isSelf && (
                                    <CustomButton
                                        title={"Edit Profile"}
                                        variant="contained"
                                        startIcon={<EditOutlined/>}
                                        onClick={handleEdit}
                                    />
                                )}
                                {currentUser && user &&
                                    roleHierarchy[currentUser.role] <
                                    roleHierarchy[user.role as UserRoleType] && (
                                        <>
                                            {deleteTimer ? (
                                                    // If the delete timer is active, show the "Undo" button
                                                    <CustomButton
                                                        title={"Undo Delete"}
                                                        variant="outlined"
                                                        color="secondary"
                                                        onClick={handleUndoDelete}
                                                    />
                                                ) :
                                                user?.status === "deleted" ? (
                                                    <>
                                                        <Typography color="error" align="center">
                                                            User has been deleted.
                                                        </Typography>
                                                        <CustomButton
                                                            title={"Recover Account"}
                                                            variant="outlined"
                                                            onClick={handleStatusChange}
                                                            disabled={isUpdatingStatus}
                                                            color="success"
                                                        />
                                                    </>
                                                ) : (
                                                    <>
                                                        <CustomButton
                                                            title={isUpdatingStatus
                                                                ? "Updating..."
                                                                : user?.status === "active"
                                                                    ? "Deactivate"
                                                                    : "Activate"}
                                                            variant="outlined"
                                                            color={user?.status === "active" ? "warning" : "success"}
                                                            startIcon={<BlockOutlined/>}
                                                            onClick={handleStatusChange}
                                                            disabled={isUpdatingStatus}
                                                        />

                                                        <CustomButton
                                                            title={isDeleting ? "Deleting..." : "Delete"}
                                                            variant="outlined"
                                                            color="error"
                                                            startIcon={<DeleteOutline/>}
                                                            onClick={handleDelete}
                                                            disabled={isDeleting}
                                                        />
                                                    </>
                                                )}
                                        </>
                                    )}

                            </Box>
                        </CustomCard>
                    </Grid>

                    {/* User Information Details */}
                    <Grid size={12}>
                        <CustomCard>
                            <Box sx={{p: 1}}>
                                <Typography variant="h6" gutterBottom>
                                    Personal Information
                                </Typography>
                                <Grid container spacing={2} sx={{mt: 1}}>
                                    <Grid size={{xs: 12, sm: 6}}>
                                        <Typography variant="body2" color="text.secondary">
                                            Full Name
                                        </Typography>
                                        <Typography variant="body1" fontWeight={500}>
                                            {user?.firstName} {user?.lastName}
                                        </Typography>
                                    </Grid>
                                    <Grid size={{xs: 12, sm: 6}}>
                                        <Typography variant="body2" color="text.secondary">
                                            Email Address
                                        </Typography>
                                        <Typography variant="body1" fontWeight={500}>
                                            {user?.email}
                                        </Typography>
                                    </Grid>
                                    <Grid size={{xs: 12, sm: 6}}>
                                        <Typography variant="body2" color="text.secondary">
                                            Phone Number
                                        </Typography>
                                        <Typography variant="body1" fontWeight={500}>
                                            {user?.phone || "N/A"}
                                        </Typography>
                                    </Grid>
                                    <Grid size={{xs: 12, sm: 6}}>
                                        <Typography variant="body2" color="text.secondary">
                                            Status
                                        </Typography>
                                        <Chip
                                            label={user?.status}
                                            color={getUserStatusChipColor(user?.status)}
                                            size="medium"
                                            sx={{textTransform: "capitalize"}}
                                        />
                                    </Grid>
                                    <Grid size={{xs: 12, sm: 6}}>
                                        <Typography variant="body2" color="text.secondary">
                                            Role
                                        </Typography>
                                        <Typography variant="body1" fontWeight={500}
                                                    sx={{textTransform: "capitalize"}}>
                                            {user?.role}
                                        </Typography>
                                    </Grid>
                                    <Grid size={{xs: 12, sm: 6}}>
                                        <Typography variant="body2" color="text.secondary">
                                            Date Joined
                                        </Typography>
                                        <Typography variant="body1" fontWeight={500}>
                                            {user?.createdAt ? format(new Date(user?.createdAt), "MMMM dd, yyyy") : 'N/A'}
                                        </Typography>
                                    </Grid>
                                </Grid>
                            </Box>
                        </CustomCard>
                    </Grid>
                </Grid>
            )}
        </DataDrawer>
    );
};

export default ViewUserDrawer;
