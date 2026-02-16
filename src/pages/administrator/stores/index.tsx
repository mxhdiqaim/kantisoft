import {useDeleteStoreMutation, useGetAllStoresQuery} from "@/store/slice";
import {Box, Chip, Grid, Tooltip, Typography, useTheme} from "@mui/material";
import {useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import type {GridColDef, GridRenderCellParams} from "@mui/x-data-grid";
import type {StoreType} from "@/types/store-types.ts";
import {type MouseEvent, useMemo, useState} from "react";
import TableStyledBox from "@/components/ui/data-grid-table/table-styled-box.tsx";
import useNotifier from "@/hooks/useNotifier.ts";
import {getApiError} from "@/helpers/get-api-error.ts";
import DataGridTable from "@/components/ui/data-grid-table";
import TableSearchActions from "@/components/ui/data-grid-table/table-search-action.tsx";
import {useSearch} from "@/use-search.ts";
import CustomButton from "@/components/ui/button.tsx";
import TableStyledMenuItem from "@/components/ui/data-grid-table/table-style-menuitem.tsx";
import ApiErrorDisplay from "@/components/feedback/api-error-display.tsx";
import DeleteConfirmationModal from "@/components/ui/delete-confimation-modal.tsx";

import {AddOutlined, DeleteOutline, EditOutlined, MoreVert, VisibilityOutlined} from "@mui/icons-material";
import StoreForm from "@/pages/administrator/stores/store-form.tsx";

const StoresScreen = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const {t} = useTranslation();
    const notify = useNotifier();

    const {data: storesData, isLoading, isError, error} = useGetAllStoresQuery();
    const [deleteStore, {isLoading: isDeleting}] = useDeleteStoreMutation();

    const memoizedStores = useMemo(() => storesData || [], [storesData]);

    const {searchControl, searchSubmit, handleSearch, filteredData} = useSearch({
        initialData: memoizedStores,
        searchKeys: ["name", "storeType", "location"],
    });

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRow, setSelectedRow] = useState<StoreType | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [openStoreForm, setOpenStoreForm] = useState(false);

    const handleMenuClick = (_event: MouseEvent<HTMLElement>, row: StoreType) => {
        setSelectedRow(row);
    };

    const handleCloseDeleteModal = () => {
        setDeleteModalOpen(false);
        setSelectedRow(null);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setSelectedRow(null);
    };

    const handleConfirmDelete = async () => {
        if (!selectedRow) return;
        try {
            await deleteStore(selectedRow.id).unwrap();
            notify("Store deleted successfully", "success");
        } catch (error) {
            const defaultMessage = "Failed to delete store";
            const apiError = getApiError(error, defaultMessage);
            notify(apiError.message, "error");
            console.log(error);
        } finally {
            handleCloseDeleteModal();
        }
    };

    const columns: GridColDef<StoreType>[] = useMemo(
        () => [
            {
                flex: 1,
                field: "name",
                headerName: "Store Name",
                minWidth: 150,
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
                field: "branchType",
                headerName: "Branch Type",
                minWidth: 120,
                align: "left",
                headerAlign: "left",
                renderCell: (params: GridRenderCellParams<StoreType>) => {
                    const isMain = params.row.branchType === "main";
                    const label = isMain ? `Main ${t("store")}` : `Branch ${t("store")}`;
                    const color = isMain ? "primary" : "secondary";
                    return (
                        <TableStyledBox>
                            <Chip
                                label={label}
                                size="medium"
                                color={color}
                                sx={{textTransform: "capitalize", borderRadius: theme.borderRadius.small}}
                            />
                        </TableStyledBox>
                    );
                },
            },
            {
                flex: 1,
                field: "location",
                headerName: "Location",
                minWidth: 150,
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
                field: "storeType",
                headerName: "Type",
                minWidth: 150,
                align: "left",
                headerAlign: "left",
                renderCell: (params) => (
                    <TableStyledBox>
                        <Chip
                            label={params.value}
                            size="medium"
                            sx={{textTransform: "capitalize", borderRadius: theme.borderRadius.small}}
                        />
                    </TableStyledBox>
                ),
            },
            {
                flex: 1,
                field: "createdAt",
                headerName: "Date Created",
                width: 180,
                align: "left",
                headerAlign: "left",
                renderCell: (params: GridRenderCellParams<StoreType, string>) => {
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
                // flex: 1,
                field: "actions",
                headerName: "Actions",
                width: 120,
                sortable: false,
                align: "center",
                headerAlign: "center",
                renderCell: (params) => {
                    const isMainStore = params.row.branchType === "main";
                    const hasBranches = storesData?.length > 1;
                    const isDeleteDisabled = isMainStore && hasBranches;

                    const handleView = () => {
                        navigate(`/admin/stores/${params.row.id}/view`);
                        handleMenuClose();
                    };
                    const handleEdit = () => {
                        navigate(`/admin/stores/${params.row.id}/edit`);
                        handleMenuClose();
                    };

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
                            <TableStyledMenuItem onClick={handleView}>
                                <VisibilityOutlined sx={{mr: 1}}/>
                                View
                            </TableStyledMenuItem>
                            <TableStyledMenuItem onClick={handleEdit}>
                                <EditOutlined sx={{mr: 1}}/>
                                Edit
                            </TableStyledMenuItem>
                            <TableStyledMenuItem
                                onClick={() => setDeleteModalOpen(true)}
                                disabled={isDeleteDisabled || params.row.branchType === "main"}
                            >
                                <DeleteOutline sx={{mr: 1}}/>
                                Delete
                            </TableStyledMenuItem>
                        </CustomButton>
                    );
                },
            },
        ],
        [anchorEl, navigate, theme.borderRadius.small, storesData, t],
    );

    if (isError) {
        notify(`Failed to load ${t("store")}. Please try again later.`, "error");
        const apiError = getApiError(error, `Failed to load ${t("store")}.`);
        return <ApiErrorDisplay statusCode={apiError.type} message={apiError.message}/>;
    }

    return (
        <Box>
            <Box sx={{display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3}}>
                <Typography variant="h4">{t("store")}</Typography>
                <CustomButton
                    title={`New Branch`}
                    variant="contained"
                    startIcon={<AddOutlined/>}
                    onClick={() => setOpenStoreForm(true)}
                />
            </Box>
            <TableSearchActions
                searchControl={searchControl}
                searchSubmit={searchSubmit}
                handleSearch={handleSearch}
                placeholder={"Search by name, type or location"}
            />
            <Grid container spacing={2}>
                <Grid size={12}>
                    <DataGridTable data={filteredData} columns={columns} loading={isLoading}/>
                </Grid>
            </Grid>

            <DeleteConfirmationModal
                open={deleteModalOpen}
                onClose={handleCloseDeleteModal}
                onConfirm={handleConfirmDelete}
                isLoading={isDeleting}
                title="Delete Store?"
                message="You won't be able to revert this action."
            />

            <StoreForm
                open={openStoreForm}
                onClose={() => setOpenStoreForm(false)}
            />
        </Box>
    );
};

export default StoresScreen;
