import ApiErrorDisplay from "@/components/feedback/api-error-display.tsx";
import {getApiError} from "@/helpers/get-api-error.ts";
import useNotifier from "@/hooks/useNotifier.ts";
import {useAppSelector} from "@/store";
import {useChangeUserStoreMutation, useGetAllStoresQuery, useGetAllUsersQuery} from "@/store/slice";
import {selectCurrentUser} from "@/store/slice/auth-slice.ts";
import {roleHierarchy, UserRoleEnum, UserStatusEnum, type UserType} from "@/types/user-types.ts";
import {AddOutlined, EditOutlined, MoreVert, StorefrontOutlined, VisibilityOutlined} from "@mui/icons-material";
import {Avatar, Box, Chip, Grid, Tooltip, Typography, useTheme,} from "@mui/material";
import type {GridColDef, GridRenderCellParams} from "@mui/x-data-grid";
import {type MouseEvent, useMemo, useState} from "react";
import {useNavigate} from "react-router-dom";
import TableStyledBox from "@/components/ui/data-grid-table/table-styled-box.tsx";
import DataGridTable from "@/components/ui/data-grid-table";
import ChangeStoreModal from "@/components/users/change-store-modal.tsx";
import TableSearchActions from "@/components/ui/data-grid-table/table-search-action.tsx";
import {useSearch} from "@/use-search.ts";
import CustomButton from "@/components/ui/button.tsx";
import TableStyledMenuItem from "@/components/ui/data-grid-table/table-style-menuitem.tsx";
import {getUserStatusChipColor} from "@/components/ui";
import {useMemoizedArray} from "@/hooks/use-memoized-array.ts";
import {useTranslation} from "react-i18next";
import UserCreateForm from "@/components/users/user-create-form.tsx";

const UsersPage = () => {
    const notify = useNotifier();
    const navigate = useNavigate();
    const theme = useTheme();
    const {t} = useTranslation();

    const [openUserModal, setOpenUserModal] = useState(false);

    const currentUser = useAppSelector(selectCurrentUser);
    const {data: usersData, isLoading, isError, error} = useGetAllUsersQuery();

    const {data: storesData} = useGetAllStoresQuery();
    const memoizedStoresData = useMemoizedArray(storesData);

    const [changeUserStore, {isLoading: isChangingStore}] = useChangeUserStoreMutation();

    const flattenedUsers = useMemo(() => {
        if (!usersData) return [];

        return usersData.map(user => ({
            ...user,
            storeName: user.store?.name,
            storeLocation: user.store?.location,
        }));
    }, [usersData]);

    const memoizedUsers: UserType[] = useMemoizedArray(flattenedUsers)

    const [selectedRow, setSelectedRow] = useState<UserType | null>(null);

    const {searchControl, searchSubmit, handleSearch, filteredData} = useSearch({
        initialData: memoizedUsers,
        searchKeys: ["firstName", "lastName", "email", "storeName"],
    });

    const [isChangeStoreDialogOpen, setChangeStoreDialogOpen] = useState(false);

    const handleOpenFormModal = () => {
        setOpenUserModal(true);
    };

    const handleCloseFormModal = () => {
        setOpenUserModal(false);
        setSelectedRow(null);
    };

    const handleOpenChangeStoreDialog = () => {
        setChangeStoreDialogOpen(true);
    };

    const handleCloseChangeStoreDialog = () => {
        setChangeStoreDialogOpen(false);
        setSelectedRow(null);
    };

    const handleChangeStore = async (userId: string, newStoreId: string) => {
        try {
            await changeUserStore({id: userId, newStoreId}).unwrap();
            notify("User store changed successfully", "success");
            handleCloseChangeStoreDialog();
        } catch (err) {
            const apiError = getApiError(err, "Failed to change user store.");
            notify(apiError.message, "error");
        }
    };

    const handleMenuClick = (_event: MouseEvent<HTMLElement>, row: UserType) => {
        setSelectedRow(row);
    };

    const columns: GridColDef[] = useMemo(
        () => [
            {
                flex: 1,
                field: "name",
                headerName: "Name",
                minWidth: 220,
                align: "left",
                headerAlign: "left",
                renderCell: (params) => {
                    const name = `${params.row.firstName} ${params.row.lastName}`;
                    const initials =
                        `${params.row.firstName?.[0] ?? ""}${params.row.lastName?.[0] ?? ""}`.toUpperCase();
                    return (
                        <TableStyledBox>
                            <Avatar
                                sx={{
                                    backgroundColor: "primary.light",
                                    color: "primary.dark",
                                    width: 36,
                                    height: 36,
                                    mr: 1.5,
                                    fontSize: "0.875rem",
                                    fontWeight: "bold",
                                }}
                            >
                                {initials}
                            </Avatar>
                            <Typography variant="body2" fontWeight="500">
                                {name}
                            </Typography>
                        </TableStyledBox>
                    );
                },
            },
            {
                flex: 1,
                field: "email",
                headerName: "Email",
                minWidth: 220,
                align: "left",
                headerAlign: "left",
                renderCell: (params) => (
                    <TableStyledBox>
                        <Typography variant="body2">{params.value}</Typography>
                    </TableStyledBox>
                ),
            },
            {
                flex: 1,
                field: "role",
                headerName: "Role",
                minWidth: 100,
                cellClassName: "capitalize-cell",
                align: "left",
                headerAlign: "left",
                renderCell: (params) => (
                    <TableStyledBox>
                        <Typography variant="body2" sx={{textTransform: "capitalize"}}>{params.value}</Typography>
                    </TableStyledBox>
                ),
            },
            {
                flex: 1,
                field: "status",
                headerName: "Status",
                minWidth: 120,
                align: "left",
                headerAlign: "left",
                renderCell: (params: GridRenderCellParams<UserType>) => (
                    <TableStyledBox>
                        <Chip
                            label={params.value}
                            color={getUserStatusChipColor(params.value)}
                            size="medium"
                            sx={{textTransform: "capitalize", fontWeight: "bold"}}
                        />
                    </TableStyledBox>
                ),
            },
            {
                flex: 1,
                field: "storeName",
                headerName: `${t("store")}`,
                minWidth: 150,
                align: "left",
                headerAlign: "left",
                renderCell: (params) => (
                    <TableStyledBox>
                        <Typography variant="body2" fontWeight="500">
                            {params.value}
                        </Typography>
                    </TableStyledBox>
                ),
            },
            {
                flex: 1,
                field: "createdAt",
                headerName: "Date Created",
                minWidth: 150,
                align: "left",
                headerAlign: "left",
                renderCell: (params: GridRenderCellParams<UserType, string>) => {
                    const date = new Date(params.value as string);
                    if (isNaN(date.getTime())) {
                        return "Invalid Date";
                    }
                    return (
                        <TableStyledBox>
                            <Typography variant="body2" fontWeight="500">
                                {date.toLocaleDateString()}
                            </Typography>
                        </TableStyledBox>
                    );
                },
            },
            {
                field: "actions",
                headerName: "Actions",
                width: 100,
                sortable: false,
                align: "center",
                headerAlign: "center",
                renderCell: (params) => {
                    const handleView = () => navigate(`/admin/users/${params.row.id}/view`);

                    const canEdit = () => {
                        if (!currentUser) return false; // Cannot edit if not logged in

                        const currentUserRoleLevel = roleHierarchy[currentUser.role];
                        const rowUserRoleLevel = roleHierarchy[(params.row as UserType).role];
                        const isSelf = currentUser.id === params.row.id;

                        // Manager can edit anyone
                        if (currentUser.role === UserRoleEnum.MANAGER) return true;

                        // Admin can edit admins and lower, but not managers
                        if (currentUser.role === UserRoleEnum.ADMIN) {
                            return currentUserRoleLevel <= rowUserRoleLevel;
                        }

                        // Users and Guests can only edit themselves or roles below them
                        return currentUserRoleLevel > rowUserRoleLevel || isSelf;
                    };

                    const isEditDisabled =
                        params.row.status === UserStatusEnum.DELETED || params.row.status === UserStatusEnum.INACTIVE || !canEdit();

                    const isViewDisabled = !canEdit();

                    const canChangeStore =
                        currentUser?.role === UserRoleEnum.MANAGER &&
                        params.row.id !== currentUser.id &&
                        [UserRoleEnum.ADMIN, UserRoleEnum.USER, UserRoleEnum.GUEST].includes(params.row.role);


                    return (
                        <CustomButton
                            variant={"text"}
                            sx={{
                                borderRadius: "10px",
                                color: theme.palette.text.primary,
                            }}
                            onClick={(e) => handleMenuClick(e, params.row)}
                            startIcon={
                                <Tooltip title="More Actions" placement={"top"}>
                                    <MoreVert/>
                                </Tooltip>
                            }
                        >
                            <TableStyledMenuItem onClick={handleView} disabled={isViewDisabled}>
                                <VisibilityOutlined sx={{mr: 1}}/>
                                View
                            </TableStyledMenuItem>
                            <TableStyledMenuItem onClick={handleOpenFormModal} disabled={isEditDisabled}>
                                <EditOutlined sx={{mr: 1}}/>
                                Edit
                            </TableStyledMenuItem>
                            {currentUser?.role === UserRoleEnum.MANAGER && (
                                <TableStyledMenuItem
                                    onClick={handleOpenChangeStoreDialog}
                                    disabled={!canChangeStore}
                                >
                                    <StorefrontOutlined sx={{mr: 1}}/>
                                    Change Store
                                </TableStyledMenuItem>
                            )}
                        </CustomButton>
                    );
                },
            },
        ],
        [selectedRow, navigate, currentUser, handleOpenFormModal],
    );

    if (isError) {
        const apiError = getApiError(error, "Failed to load users. Please try again later.");
        notify(apiError.message, "error");
        return <ApiErrorDisplay statusCode={apiError.type} message={apiError.message}/>;
    }

    return (
        <Box>
            <Box sx={{display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3}}>
                <Typography variant="h4">Users</Typography>
                {currentUser && (currentUser.role === UserRoleEnum.MANAGER || currentUser.role === UserRoleEnum.ADMIN) && (
                    <CustomButton
                        title={"New User"}
                        variant="contained"
                        startIcon={<AddOutlined/>}
                        onClick={handleOpenFormModal}
                    />
                )}
            </Box>
            <TableSearchActions
                searchControl={searchControl}
                searchSubmit={searchSubmit}
                handleSearch={handleSearch}
                placeholder={"Search users by name, email, or store..."}
            />
            <Grid container spacing={2}>
                <Grid size={12}>
                    <DataGridTable data={filteredData} columns={columns} loading={isLoading}/>
                </Grid>
            </Grid>
            <ChangeStoreModal
                open={isChangeStoreDialogOpen}
                onClose={handleCloseChangeStoreDialog}
                user={selectedRow}
                stores={memoizedStoresData}
                onConfirm={handleChangeStore}
                isLoading={isChangingStore}
            />

            <UserCreateForm open={openUserModal} onClose={handleCloseFormModal} currentData={selectedRow}/>
        </Box>
    );
};

export default UsersPage;
